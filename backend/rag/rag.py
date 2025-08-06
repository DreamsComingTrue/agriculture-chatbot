import httpx
from typing import Optional

API_URL = "http://localhost:8100/search"

async def retrieveRAGResult(text: Optional[str] = None, image: Optional[str] = None, top_k: int = 3):
    async with httpx.AsyncClient(timeout=None) as client:
        response = await client.post(
            API_URL,
            json={
                "text": text,
                "image_base64": image,
                "top_k": top_k
            },
        )
        return response.json()
