import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import Optional

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from utils.mcp.query_router import generate_sql
from utils.mcp.schema import get_all_schemas, init_db_pools, mysql_pools
from utils.mcp.sql_agent import execute_sql
from utils.memory import WindowedSummaryMemory
from utils.models import generate_with_ollama_stream
from utils.promptsArchive import (get_agriculture_prompt_with_image,
                                  get_agriculture_prompt_without_image)
from utils.user_memory import UserMemoryManager

from utils.search_qdrant import fetch_qdrant_knowledge
from PIL import Image
import io
import base64
@asynccontextmanager
async def lifespan(app: FastAPI):
    # init db pools
    await init_db_pools()
    yield
    # clear all mysql connection after finished
    mysql_pools.clear()


# Initialize FastAPI app
app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Force GPU usage
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

# Initialize memory manager
user_memory_manager = UserMemoryManager()


# 日志工具函数
async def log_to_management(level: str, message: str, **kwargs):
    """异步发送日志到管理后台，不阻塞主流程"""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(
                "http://localhost:8000/api/v1/log",
                json={
                    "level": level,
                    "module": "ollama_service",
                    "message": message,
                    **kwargs,
                },
            )
    except Exception:
        # 日志发送失败不影响主业务，静默处理
        pass


def log_async(level: str, message: str, **kwargs):
    """非阻塞日志记录"""
    asyncio.create_task(log_to_management(level, message, **kwargs))


def generate_qwen_prompt(query: str, memory):
    history = memory.load_memory_variables({}).get("history", "")

    # 构造文本内容
    prompt_text = get_agriculture_prompt_with_image(query, history)

    # 返回标准 message 列表（用于模型调用）
    return prompt_text


def generate_deepseek_prompt(
    prompt: str,
    memory: WindowedSummaryMemory,
    generated_sql: Optional[str] = "",
    sql_result: Optional[str] = "",
) -> str:
    history = memory.load_memory_variables({}).get("history", "")
    generated_prompt = get_agriculture_prompt_without_image(
        history, prompt, generated_sql, sql_result
    )
    return generated_prompt


@app.post("/analyze")
async def analyze(request: Request):
    data = await request.json()
    try:
        user_prompt = data.get("prompt", "")
        targetDB = data.get("targetDB", "")
        images = data.get("images", [])  # 用户上传的图片（base64字符串列表）
        chat_id = data.get("chat_id", "default")

        # 1. Qdrant 检索
        qdrant_results = await fetch_qdrant_knowledge(
            query=user_prompt,
            image_base64=images[0] if images else None
        )

        # 2. 整理召回内容，分为有配图和无配图两类
        qdrant_image_knowledge = []
        qdrant_text_knowledge = []
        qdrant_image_files = []
        for item in qdrant_results:
            if "[配图:" in item:
                text, _, image_path = item.partition("[配图: ")
                image_path = image_path.rstrip("]")
                qdrant_image_knowledge.append(text.strip())
                if os.path.exists(image_path):
                    try:
                        img = Image.open(image_path).convert("RGB")
                        qdrant_image_files.append(img)
                    except Exception as e:
                        print(f"图片打开失败: {image_path}, 错误: {e}")
            else:
                qdrant_text_knowledge.append(item.strip())

        # 3. 处理用户上传图片（base64转PIL.Image）
        user_image_files = []
        for base64str in images:
            try:
                img_bytes = base64.b64decode(base64str)
                img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                user_image_files.append(img)
            except Exception as e:
                print(f"用户图片解码失败: {e}")

        # 4. 查询SQL
        sql_result = ""
        if targetDB:
            schemas = await get_all_schemas(targetDB)
            sql = await generate_sql(user_prompt, schemas)
            if sql:
                sql_result = await execute_sql(targetDB, sql)

        # 5. Qwen流（召回有图+用户原图+SQL）
        async def qwen_stream():
            all_images = qdrant_image_files + user_image_files
            if not all_images:
                return
            knowledge = "\n".join(qdrant_image_knowledge)
            prompt = generate_qwen_prompt(knowledge, memory=user_memory_manager.get_memory(chat_id, "qwen2.5vl:7b"))
            if sql_result:
                prompt += f"\n【数据库查询结果】：\n{sql_result}"
            full_response = ""
            async for chunk in generate_with_ollama_stream(
                model="qwen2.5vl:7b",
                prompt=prompt,
                image=all_images
            ):
                token = str(chunk.get("response", chunk))
                full_response += token
                yield f"data: {json.dumps({'type': 'delta', 'token': token}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        # 6. DeepSeek流（召回无图+SQL，无需图片）
        async def deepseek_stream():
            if not qdrant_text_knowledge:
                return
            prompt = generate_deepseek_prompt(
                prompt="\n".join(qdrant_text_knowledge),
                memory=user_memory_manager.get_memory(chat_id, "deepseek-r1:8b"),
                sql_result=sql_result,
            )
            full_response = ""
            async for chunk in generate_with_ollama_stream(
                model="deepseek-r1:8b",
                prompt=prompt,
                image=None
            ):
                token = str(chunk.get("response", chunk))
                full_response += token
                yield f"data: {json.dumps({'type': 'delta', 'token': token}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        async def merged_stream():
            async for item in qwen_stream():
                yield item
            async for item in deepseek_stream():
                yield item

        return StreamingResponse(
            merged_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        log_async(
            "ERROR",
            f"分析接口异常: {str(e)}",
            chat_id=data.get("chat_id", "unknown"),
            error_code="ANALYZE_API_ERROR",
        )
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
