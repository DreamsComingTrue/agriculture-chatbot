import torch
from PIL import Image
from qdrant_client import QdrantClient
from qdrant_client.models import (CollectionStatus, Distance, PointStruct,
                                  VectorParams)
from transformers import CLIPModel, CLIPProcessor
# from transformers import AutoModel, AutoTokenizer
import torch.nn.functional as F
from sentence_transformers import SentenceTransformer


# ========== QWEN3 Text Embedding ==========
class Qwen3Embedder:
    def __init__(self, model_name="Qwen/Qwen3-Embedding-0.6B"):

        self.model = SentenceTransformer(model_name)

    def embed(self, text: str):
        return self.model.encode(text, normalize_embeddings=True).tolist()

# class Qwen3Embedder:
#     def __init__(self, model_id="Qwen/Qwen3-Embedding-0.6B"):
#         self.tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
#         self.model = AutoModel.from_pretrained(model_id, trust_remote_code=True).eval()

#     def embed(self, text: str):
#         inputs = self.tokenizer(
#             text, return_tensors="pt", truncation=True, max_length=512
#         )
#         with torch.no_grad():
#             output = self.model(**inputs)
#             return output.last_hidden_state.mean(dim=1).squeeze().tolist()


# ========== CLIP Image Embedding ==========
class CLIPEmbedder:
    def __init__(self, model_id="openai/clip-vit-base-patch32"):
        self.model = CLIPModel.from_pretrained(model_id)
        self.processor = CLIPProcessor.from_pretrained(model_id)

    def embed(self, image_path: str):
        image = Image.open(image_path).convert("RGB")
        inputs = self.processor(images=image, return_tensors="pt")
        with torch.no_grad():
            outputs = self.model.get_image_features(**inputs)
        return outputs.squeeze().tolist()


# ========== Qdrant Setup ==========
client = QdrantClient(
    host="localhost", 
    # port=6333,
    grpc_port=6334,
    prefer_grpc=True
)

COLLECTION_NAME = "multimodal"
# if client.collection_exists(COLLECTION_NAME):
#     client.delete_collection(COLLECTION_NAME)
#     print("collection deleted")


if not client.collection_exists(COLLECTION_NAME):
    print(f"[Info] Collection `{COLLECTION_NAME}` 不存在，正在创建...")
    client.recreate_collection(
        COLLECTION_NAME,
        vectors_config={
            "image": VectorParams(size=512, distance=Distance.COSINE),
            "text": VectorParams(size=1024, distance=Distance.COSINE),
        },
    )
else:
    status = client.get_collection(COLLECTION_NAME).status
    if status != CollectionStatus.GREEN:
        print(f"[Warning] Collection `{COLLECTION_NAME}` 状态异常：{status}")

# try:
#     info:CollectionInfo = client.get_collection(COLLECTION_NAME)

#     exist_vectors = info.vectors_config
#     except_vectors = {"image", "text"}
#     if set(exist_vectors.keys()) != except_vectors:
#         print("delete collection")
#         client.delete_collection(COLLECTION_NAME)
#         print("create new collection")
#         client.recreate_collection(
#             COLLECTION_NAME,
#             vectors_config={
#                 "image": VectorParams(size=512, distance=Distance.COSINE),
#                 "text": VectorParams(size=1024, distance=Distance.COSINE),
#             }
#         )
#     else:
#         print("collection 存在且正确")

# except Exception as e:
#     print("重建")
#     client.recreate_collection( COLLECTION_NAME,
#         vectors_config={
#             "image": VectorParams(size=512, distance=Distance.COSINE),
#             "text": VectorParams(size=1024, distance=Distance.COSINE),
#         }
#     )