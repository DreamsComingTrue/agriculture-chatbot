import json
import os
from contextlib import asynccontextmanager
from typing import Optional

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


def generate_qwen_prompt(query: str, memory):
    history = memory.load_memory_variables({}).get("history", "")

    # 构造文本内容
    prompt_text = get_agriculture_prompt_with_image(query, history)

    # 返回标准 message 列表（用于模型调用）
    return prompt_text


def generate_deepseek_prompt(
    query: str,
    memory: WindowedSummaryMemory,
    generated_sql: Optional[str] = "",
    sql_result: Optional[str] = "",
) -> str:
    history = memory.load_memory_variables({}).get("history", "")
    prompt = get_agriculture_prompt_without_image(
        history, query, generated_sql, sql_result
    )
    return prompt


@app.post("/analyze")
async def analyze(request: Request):
    try:
        data = await request.json()
        query = data.get("query", "")
        enable_mcp = data.get("enable_mcp", False)
        db = data.get("db", "ct_nmg_farm")
        images = data.get("images", [])
        chat_id = data.get("chat_id", "default")

        # Select model based on input
        # Keep the qwen instance temporarily
        # llm = qwen_model if images else deepseek_model
        llm = "deepseek-r1:8b"
        memory = user_memory_manager.get_memory(chat_id, llm)

        prompt = ""
        # Create the prompt based on model
        if images:
            prompt = generate_qwen_prompt(query, memory)
        else:
            sql_result = ""
            if enable_mcp:
                print("enable mcp-----------------")
                schemas = await get_all_schemas(db)
                sql = await generate_sql(query, schemas)

                if sql:
                    sql_result = await execute_sql(db, sql)
                print("sql_result-------------------", sql_result)
            prompt = generate_deepseek_prompt(
                query=query,
                memory=memory,
                sql_result=sql_result,
            )
        print("prompt------------------", prompt)

        # Async generator function
        async def generate_stream():
            # print("into generate stream------------------------------")
            full_response = ""
            try:
                async for chunk in generate_with_ollama_stream(
                    model="qwen2.5vl:7b" if images else "deepseek-r1:8b",
                    prompt=prompt,
                    image=images,
                ):
                    token = (
                        str(chunk.get("response"))
                        if isinstance(chunk, dict) and "response" in chunk
                        else str(chunk)
                    )
                    print("token-------------", token)
                    full_response += token
                    yield f"data: {json.dumps({'type': 'delta', 'token': token}, ensure_ascii=False)}\n\n"

                memory.save_context({"input": query}, {"response": full_response})
                yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

        # Return streaming response
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
