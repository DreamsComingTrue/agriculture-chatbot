import os
from uuid import uuid4

import uvicorn
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse

from pipeline import (COLLECTION_NAME, CLIPEmbedder,
                    BgeEmbedder, client)
from qdrant_client.models import PointStruct, SearchParams
from qdrant_client.http.models.models import QueryResponse
from fastapi.responses import JSONResponse
from typing import Optional
import base64
from PIL import Image
from io import BytesIO
import re
from pydantic import BaseModel
from pathlib import Path


app = FastAPI()
text_embedder = BgeEmbedder()

image_embedder = CLIPEmbedder()

UPLOAD_DIR = "./uploaded_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/embed")
async def embed_data(
    text: str = Form(...),
    image: UploadFile = File(...),
):
    file_path = os.path.join(UPLOAD_DIR, f"{uuid4().hex}_{image.filename}")
    with open(file_path, "wb") as f:
        f.write(await image.read())

    text_vector = text_embedder.embed(text)
    image_vector = image_embedder.embed(file_path)

    point = PointStruct(
        id=uuid4().hex,
        payload={"text": text, "image_path": file_path},
        vector={"text": text_vector, "image": image_vector},
    )
    client.upsert(COLLECTION_NAME, points=[point])
    return {"status": "success", "image_path": file_path}

def extract_scored_points(resp):
    if isinstance(resp, QueryResponse):
        return resp.points
    # Fallbacks in case different format were encountered:
    if isinstance(resp, tuple) and len(resp) == 2:
        return resp[1]
    if isinstance(resp, dict) and 'points' in resp:
        return resp['points']
    return []

class SearchRequest(BaseModel):
    text: Optional[str] = None
    image_base64: Optional[str] = None
    top_k: int = 3  # Default value

@app.post("/search")
async def unified_multimodal_search(data: SearchRequest):
    try:
        results = []
        text = data.text
        image_base64 = data.image_base64
        top_k = data.top_k

        # Remove the low similarity results
        score_threshold = 0.7

        # 文本查询
        if text:
            text_vector = text_embedder.embed(text)
            resp = client.query_points(
                collection_name=COLLECTION_NAME,
                query=text_vector,
                limit=top_k,
                with_payload=True,
                with_vectors=False,  # set to True if you want vectors back
                score_threshold=score_threshold,
                search_params=SearchParams(hnsw_ef=128),
                using="text"  # specify which named vector field to search
            )
            points = extract_scored_points(resp)
            results.extend(points)

        # 图像查询
        if image_base64:
            try:
                image_bytes = base64.b64decode(format_base64(image_base64))
                image = Image.open(BytesIO(image_bytes)).convert("RGB")

                image_vector = image_embedder.embed_from_pil(image)
                resp = client.query_points(
                    collection_name=COLLECTION_NAME,
                    query=image_vector,
                    limit=1,
                    with_payload=True,
                    with_vectors=False,  # set to True if you want vectors back
                    score_threshold=score_threshold,
                    search_params=SearchParams(hnsw_ef=128),
                    using="image"  # specify which named vector field to search
                )
                points = extract_scored_points(resp)
                results.extend(points)

                for item in points:
                    payload = item.payload  # now you can access payload
                    if "text" in payload:
                        follow_up_query = payload["text"] + "的防治方法"
                        text_vector = text_embedder.embed(follow_up_query)
                        resp = client.query_points(
                            collection_name=COLLECTION_NAME,
                            query=text_vector,
                            limit=top_k,
                            with_payload=True,
                            with_vectors=False,  # set to True if you want vectors back
                            score_threshold=score_threshold,
                            search_params=SearchParams(hnsw_ef=128),
                            using="text"  # specify which named vector field to search
                        )
                        print("image text resp------------------", resp)
                        points = extract_scored_points(resp)
                        results.extend(points)

            except Exception as e:
                print(e)
                return JSONResponse(status_code=400, content={"base64图像解析失败": str(e)})
            
        # 根据["text"]或["page_content"]合并相同内容
        seen = set()
        unique_results = []
        for r in results:
            print("res-----------------", r)
            payload = r.payload  # now you can access payload
            uid = payload.get("text") or payload.get("page_content")
            if uid and uid not in seen:
                unique_results.append(payload)
                seen.add(uid)

        # format keys
        for result in unique_results:
            if result.get("image_path"):
                result["image"] = remove_path_prefix(result.pop("image_path"))
                result["title"] = result.pop("text")
                print("image: ------------", result["title"])
            else:
                result["title"] = result.pop("page_title")
                result["content"] = result.pop("page_content")
                print("text title: ------------", result["title"])
                print("text content: ------------", result["content"])

        return unique_results

    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": str(e)})

def format_base64(image_base64: str) -> str:
    """
    Removes the data URL scheme header (e.g., "data:image/jpeg;base64,")
    from a base64 string if present.
    """
    if not image_base64:
        return ""

    # Use regex to strip off any 'data:*;base64,' prefix
    match = re.search(r"base64,(.*)", image_base64)
    return match.group(1) if match else image_base64

# Without data prefix
def remove_path_prefix(file_path: str):
    # Safe version with None check
    formatted_name = ""
    match = re.search(r'[^/]+$', file_path)
    if match:
        formatted_name = match.group()
    else:
        print("No filename found in path")
    return formatted_name

def is_safe_path(base_path: Path, target_path: Path) -> bool:
    """Check if target path is within base path to prevent directory traversal"""
    try:
        base_path.resolve().relative_to(base_path.resolve())
        target_path.resolve().relative_to(base_path.resolve())
        return True
    except ValueError:
        return False

@app.get("/image/{image_name}")
async def get_image(image_name: str, width: Optional[int] = None, height: Optional[int] = None):
    """
    Serve an image from the configured folder with optional resizing parameters
    
    Example: /image/photo.jpg?width=300&height=200
    """
    try:
        # Create path objects
        base_path = Path(UPLOAD_DIR).resolve()
        file_path = (base_path / image_name).resolve()
        
        # Security checks
        if not is_safe_path(base_path, file_path):
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Cache 1 year
        headers = {
            "Cache-Control": "public, max-age=31536000, immutable",  # 1 year
        }
        # Here you could add image processing (resizing, etc.) if needed
        # For example using Pillow:
        # if width or height:
        #     return process_image(file_path, width, height)
        
        # Return the image file directly
        return FileResponse(file_path, headers=headers)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8100)
