import httpx
from typing import List, Optional

SEARCH_API_URL = "http://localhost:8082/search"

async def fetch_qdrant_knowledge(
    query: Optional[str] = None,
    image_base64: Optional[str] = None,
    top_k: int = 5
) -> List[str]:
    try:
        if not query and not image_base64:
            print("必须至少提供 text 或 image_base64")
            return []

        # 构造 JSON 请求体
        payload = {
            "top_k": top_k,
        }
        if query:
            payload["text"] = query
        if image_base64:
            payload["image_base64"] = image_base64

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(SEARCH_API_URL, json=payload)
            response.raise_for_status()
            data = response.json()

        # 处理结果
        results = []
        for item in data:
            if "page_content" in item:  # 类型一：文本页
                title = item.get("page_title", "")
                content = item["page_content"]
                results.append(f"《{title}》\n{content}" if title else content)
            elif "text" in item:  # 类型二：图文对
                text = item["text"]
                image_path = item.get("image_path", "")
                if image_path:
                    results.append(f"{text}\n[配图: {image_path}]")
                else:
                    results.append(text)
        return results

    except Exception as e:
        print(f"Qdrant 检索失败: {e}")
        return []