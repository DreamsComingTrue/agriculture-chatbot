import os
from uuid import uuid4

import uvicorn
from fastapi import FastAPI, File, Form, UploadFile

from pipeline import (COLLECTION_NAME, CLIPEmbedder, PointStruct,
                       Qwen3Embedder, client)

app = FastAPI()
text_embedder = Qwen3Embedder()

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


@app.get("/search")
async def search_by_text(query: str, top_k: int = 3):
    query_vector = text_embedder.embed(query)
    results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=("text", query_vector),
        limit=top_k,
        with_payload=True
    )
    return [r.payload for r in results]


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8082)