import json
import os

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_ollama import OllamaLLM
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


def generate_qwen_prompt(query: str, memory) -> str:
    history = memory.load_memory_variables({}).get("history", "")
    return f"""用户查询: {query}
    对话历史: {history}"""


def generate_deepseek_prompt(query: str, memory) -> str:
    history = memory.load_memory_variables({}).get("history", "")
    return f"""用户查询: {query}
               对话历史:{history}"""


@app.post("/analyze")
async def analyze(request: Request):
    try:
        data = await request.json()
        query = data.get("query", "")
        images = data.get("images", [])
        chat_id = data.get("chat_id", "default")

        # Select model based on input
        llm = qwen_model if images else deepseek_model
        memory = user_memory_manager.get_memory(chat_id, llm)

        # Create the prompt based on model
        if images:
            prompt = generate_qwen_prompt(query, images, memory)
        else:
            prompt = generate_deepseek_prompt(query, memory)

        # Replace the chain construction with just the model directly
        chain = llm.with_config(configurable={"session_id": chat_id})

        # Async generator function
        async def generate_stream():
            full_response = ""
            try:
                async for chunk in chain.astream(
                    {
                        prompt,
                        images,
                    },
                    config={"configurable": {"session_id": chat_id}},
                ):
                    token = (
                        chunk.get("response")
                        if isinstance(chunk, dict) and "response" in chunk
                        else str(chunk)
                    )
                    full_response += token

                    yield f"data: {json.dumps({'type': 'delta', 'token': token}, ensure_ascii=False)}\n\n"

                memory.save_context({"input": prompt}, {"response": full_response})
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
