import os
from uuid import uuid4

import uvicorn
from fastapi import FastAPI, File, Form, UploadFile

from pipeline import (COLLECTION_NAME, CLIPEmbedder, PointStruct,
                    BgeEmbedder, client)
from fastapi.responses import JSONResponse
from typing import Optional


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


# @app.get("/search")
# async def search_by_text(query: str, top_k: int = 3):
#     query_vector = text_embedder.embed(query)
#     results = client.search(
#         collection_name=COLLECTION_NAME,
#         query_vector=("text", query_vector),
#         limit=top_k,
#         with_payload=True
#     )
    
#     return [r.payload for r in results]

# # point = PointStruct(
# #             id=uuid.uuid4().hex,
# #             payload={"page_title": title,"page_content": text},
# #             vector={"text": text_vector}
# #         )

# # point = PointStruct(
# #         id=uuid4().hex,
# #         payload={"text": text, "image_path": file_path},
# #         vector={"text": text_vector, "image": image_vector},
# #     )
# # 一共两种结构




@app.post("/search")
async def unified_multimodal_search(
    text: Optional[str] = Form(None),
    image_base64: Optional[str] = Body(None),
    top_k: int = Form(3),
):
    try:
        results = []

        # 文本查询
        if text:
            text_vector = text_embedder.embed(text)
            text_results = client.search(
                collection_name=COLLECTION_NAME,
                query_vector=("text", text_vector),
                limit=top_k,
                with_payload=True
            )
            results.extend(text_results)

        # 图像查询
        if image_base64:
            try:
                image_bytes = base64.b64decode(header_removed)
                image = Image.open(BytesIO(image_bytes)).convert("RGB")

                image_vector = image_embedder.embed_from_pil(image)

                image_results = client.search(
                    collection_name=COLLECTION_NAME,
                    query_vector=("image", image_vector),
                    limit=top_k,
                    with_payload=True
                )
                results.extend(image_results)

                for item in image_results:
                    payload = item.payload
                    if "text" in payload:
                        follow_up_query = payload["text"] + "的防治方法"
                        text_vector = text_embedder.embed(follow_up_query)
                        text_results = client.search(
                            collection_name=COLLECTION_NAME,
                            query_vector=("text", text_vector),
                            limit=3,
                            with_payload=True
                        )
                        results.extend(text_results)

            except Exception as e:
                return JSONResponse(status_code=400, content={"base64图像解析失败": str(e)})
            

        if not results:
            return JSONResponse(status_code=400, content={"必须至少提供 text 或 image_base64 参数"})

        # 根据["text"]或["page_content"]合并相同内容
        seen = set()
        unique_results = []
        for r in results:
            payload = r.payload
            uid = payload.get("text") or payload.get("page_content")
            if uid and uid not in seen:
                unique_results.append(payload)
                seen.add(uid)

        # return unique_results[:top_k]
        return unique_results

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8082)
