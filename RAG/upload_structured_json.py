import json
import uuid
from tqdm import tqdm

from pipeline import Qwen3Embedder, client, COLLECTION_NAME, PointStruct

def load_structured_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    docs = []

    for item in data.get("pests",[]) :
        docs.append((item['title'],item['content']))
    if "weed" in data:
        weed=data["weed"]
        docs.append((weed['title'],weed['content']))
    return docs

def main():
    filepath = "structured_data.json"

    embedder = Qwen3Embedder()

    docs = load_structured_json(filepath)

    points = []
 

    for title, text in tqdm(docs, desc="嵌入并构建向量"):
        text_vector = embedder.embed(text)
        point = PointStruct(
            id=uuid.uuid4().hex,
            payload={"page_title": title,"page_content": text},
            vector={"text": text_vector}
        )
        points.append(point)

    print(f"上传 {len(points)} 条结构化记录至 Qdrant < {COLLECTION_NAME} >...")
    client.upsert(collection_name=COLLECTION_NAME, points=points)
    print("上传完成")

if __name__ == "__main__":
    main()