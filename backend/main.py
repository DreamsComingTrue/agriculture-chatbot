import asyncio
import os
from contextlib import asynccontextmanager
from typing import Optional

import httpx
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from mcp_plugins.mcp_stream import CLIENT
from mcp_plugins.postgres_mcp import run_postgres_mcp_tool
from utils.memory import WindowedSummaryMemory
from utils.models import generate_with_ollama_stream
from utils.promptsArchive import (get_agriculture_prompt_with_image,
                                  get_agriculture_prompt_without_image)
from utils.user_memory import UserMemoryManager
from utils.utils import generate_sse_data, should_use_mcp_plugin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 异步上下文管理客户端连接
    async with CLIENT as client:
        # 初始化连接
        await client.ping()
        yield


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
                "http://localhost:8100/api/v1/log",
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
    tool_context: Optional[str] = "",
) -> str:
    history = memory.load_memory_variables({}).get("history", "")
    generated_prompt = get_agriculture_prompt_without_image(
        history, prompt, tool_context
    )
    return generated_prompt


@app.post("/analyze")
async def analyze(request: Request):
    data = await request.json()
    try:
        user_prompt = data.get("prompt", "")
        images = data.get("images", [])
        chat_id = data.get("chat_id", "default")

        # Async generator function
        async def generate_stream():
            # print("into generate stream------------------------------")
            full_response = ""
            # Select model based on input
            # Keep the qwen instance temporarily
            # llm = qwen_model if images else deepseek_model
            llm = "deepseek-r1:8b"
            memory = user_memory_manager.get_memory(chat_id, llm)

            try:
                prompt = ""
                # Create the prompt based on model
                if images:
                    prompt = generate_qwen_prompt(user_prompt, memory)
                else:
                    postgres_mcp_context: list[str] = []
                    if should_use_mcp_plugin(user_prompt):
                        async for item in run_postgres_mcp_tool(
                            user_prompt, postgres_mcp_context
                        ):
                            full_response += item
                            yield generate_sse_data(item)
                        memory.save_context(
                            {"input": user_prompt}, {"response": full_response}
                        )
                        yield 'data: {"type": "done"}\n\n'
                        return
                    else:
                        prompt = generate_deepseek_prompt(
                            prompt=user_prompt,
                            memory=memory,
                            tool_context="\n".join(postgres_mcp_context),
                        )
                print("prompt------------------", prompt)
                inside_think = False
                async for chunk in generate_with_ollama_stream(
                    model="qwen2.5vl:7b" if images else "deepseek-r1:8b",
                    prompt=prompt,
                    image=images,
                ):
                    done = (
                        bool(chunk.get("done"))
                        if isinstance(chunk, dict) and "done" in chunk
                        else False
                    )
                    if done:
                        memory.save_context(
                            {"input": user_prompt}, {"response": full_response}
                        )
                        yield 'data: {"type": "done"}\n\n'
                        return
                    token = (
                        str(chunk.get("response"))
                        if isinstance(chunk, dict) and "response" in chunk
                        else str(chunk)
                    )
                    idx = -1
                    if not inside_think:
                        idx = token.find("<think>")
                        if idx != -1:
                            inside_think = True
                    else:
                        idx = token.find("</think>")
                        if idx != -1:
                            inside_think = False
                    if idx == -1 and not inside_think:
                        print("token-------------", token)
                        full_response += token
                        yield generate_sse_data(token)

            except Exception as e:
                # 🆕 记录错误日志到管理后台
                log_async(
                    "ERROR",
                    f"Ollama API调用失败: {str(e)}",
                    model_name=llm,
                    chat_id=chat_id,
                    error_code="OLLAMA_API_ERROR",
                )
                yield generate_sse_data(f"generate_stream error: {str(e)}", "error")

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
        # 🆕 记录错误日志到管理后台
        log_async(
            "ERROR",
            f"分析接口异常: {str(e)}",
            chat_id=data.get("chat_id", "unknown"),
            error_code="ANALYZE_API_ERROR",
        )
        pass


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
