import json
import re

import httpx
from env import SERVER_INFO


async def generate_with_ollama(
    prompt,
    model="qwen3:32b",
    host=SERVER_INFO["host"],
    port=SERVER_INFO["port"],
):
    url = f"http://{host}:{port}/api/generate"
    payload = {"model": model, "prompt": prompt, "stream": False}

    try:
        async with httpx.AsyncClient(timeout=None) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        print(f"HTTP Error: {e.response.status_code} - {e.response.text}")
        raise
    except httpx.RequestError as e:
        print(f"Network Error: {str(e)}")
        raise
    except json.JSONDecodeError as e:
        print(f"Invalid JSON response: {str(e)}")
        raise
    except Exception as e:
        print(f"❗ Unexpected Error: {type(e).__name__}")
        print("Exception details:", vars(e))
        raise


async def generate_with_ollama_stream(
    prompt,
    model="deepseek-r1:8b",
    image=[],
    host=SERVER_INFO["host"],
    port=SERVER_INFO["port"],
):
    url = f"http://{host}:{port}/api/generate"
    payload = {"model": model, "prompt": prompt, "images": image, "stream": True}

    async with httpx.AsyncClient(timeout=None, proxy=None) as client:
        async with client.stream("POST", url, json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                line = line.strip()
                print("line--------------", line)
                if line:
                    yield json.loads(line)


def clean_llm_response(text: str) -> str:
    """Remove <think>...</think> and strip whitespace."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
