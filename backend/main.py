import json
import os

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_ollama import OllamaLLM

from promptsArchive import (get_agriculture_prompt_with_image,
                            get_agriculture_prompt_without_image)
from user_memory import UserMemoryManager

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Force GPU usage
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

# Initialize models
qwen_model = OllamaLLM(model="qwen2.5vl:7b")
deepseek_model = OllamaLLM(model="deepseek-r1:7b")

# Initialize memory manager
user_memory_manager = UserMemoryManager()


def generate_qwen_prompt(query: str, memory):
    history = memory.load_memory_variables({}).get("history", "")

    # 构造文本内容
    prompt_text = get_agriculture_prompt_with_image(query, history)

    # 返回标准 message 列表（用于模型调用）
    return prompt_text


def generate_deepseek_prompt(query: str, memory) -> list[BaseMessage]:
    history = memory.load_memory_variables({}).get("history", "")
    prompt = get_agriculture_prompt_without_image(history)
    return [SystemMessage(prompt), HumanMessage(query)]


@app.post("/analyze")
async def analyze(request: Request):
    try:
        data = await request.json()
        query = data.get("query", "")
        images = data.get("images", [])
        chat_id = data.get("chat_id", "default")

        # Select model based on input
        # Keep the qwen instance temporarily
        llm = qwen_model if images else deepseek_model
        memory = user_memory_manager.get_memory(chat_id, llm)

        prompt = ""
        # Create the prompt based on model
        if images:
            prompt = generate_qwen_prompt(query, memory)
        else:
            prompt = generate_deepseek_prompt(query, memory)

        # print(f"{prompt}------------------------------")

        # Async generator function
        async def generate_stream():
            # print("into generate stream------------------------------")
            full_response = ""
            try:
                if images:
                    # print("qwen---------------------------------------")
                    # Call Ollama's streaming endpoint directly for Qwen
                    async with httpx.AsyncClient() as client:
                        async with client.stream(
                            "POST",
                            "http://127.0.0.1:11434/api/generate",
                            json={
                                "model": "qwen2.5vl:7b",
                                "prompt": prompt,
                                "images": images,
                                "stream": True,
                            },
                            timeout=None,
                        ) as response:
                            async for line in response.aiter_lines():
                                content = json.loads(line)
                                token = content.get("response", "")
                                full_response += token
                                # print(token, "--------------------------")
                                yield f"data: {json.dumps({'type': 'delta', 'token': token}, ensure_ascii=False)}\n\n"
                else:
                    # Use LangChain astream for DeepSeek
                    chain = llm.with_config(configurable={"session_id": chat_id})
                    async for chunk in chain.astream(
                        prompt,
                        config={"configurable": {"session_id": chat_id}},
                    ):
                        token = (
                            str(chunk.get("response"))
                            if isinstance(chunk, dict) and "response" in chunk
                            else str(chunk)
                        )
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
