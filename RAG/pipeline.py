import torch
from PIL import Image
from qdrant_client import QdrantClient
from qdrant_client.models import (CollectionStatus, Distance,
                                  VectorParams)
from sentence_transformers import SentenceTransformer
from transformers import CLIPModel, CLIPProcessor


# ========== Bge Text Embedding ==========
class BgeEmbedder:
    def __init__(self, model_name="BAAI/bge-large-zh-v1.5"):

        self.model = SentenceTransformer(model_name)

    # self.model = SentenceTransformer(
    #     "/home/zhangguoqing/.cache/huggingface/hub/models--BAAI--bge-large-zh-v1.5/snapshots/79e7739b6ab944e86d6171e44d24c997fc1e0116"
    # )

    def embed(self, text: str):
        return self.model.encode(text, normalize_embeddings=True).tolist()


# ========== CLIP Image Embedding ==========
class CLIPEmbedder:
    def __init__(self, model_id="openai/clip-vit-base-patch32"):
        # def __init__(self, model_id="/home/zhangguoqing/.cache/huggingface/hub/models--openai--clip-vit-base-patch32/snapshots/3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268"):
        self.model = CLIPModel.from_pretrained(model_id)
        self.processor = CLIPProcessor.from_pretrained(model_id)

    def embed(self, image_path: str):
        image = Image.open(image_path).convert("RGB")
        inputs = self.processor(images=image, return_tensors="pt")
        with torch.no_grad():
            outputs = self.model.get_image_features(**inputs)
        return outputs.squeeze().tolist()

    def embed_from_pil(self, image: Image.Image):
        inputs = self.processor(images=image, return_tensors="pt")
        with torch.no_grad():
            outputs = self.model.get_image_features(**inputs)
        return outputs.squeeze().tolist()


# ========== Qdrant Setup ==========
# client = QdrantClient(host="localhost", port=6333)
client = QdrantClient(
    host="localhost",
    # port=6333,
    grpc_port=6334,
    prefer_grpc=True,
)
COLLECTION_NAME = "multimodal"
#
# if client.collection_exists(COLLECTION_NAME):
#    client.delete_collection(COLLECTION_NAME)
#    print("collection deleted")
#
if not client.collection_exists(COLLECTION_NAME):
    print(f"Collection `{COLLECTION_NAME}` 不存在，正在创建...")
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
        print(f"[Collection `{COLLECTION_NAME}` 状态异常：{status}")


# try:
#    info:CollectionInfo = client.get_collection(COLLECTION_NAME)
#    exist_vectors = info.vectors_config
#    except_vectors = {"image", "text"}
#    if set(exist_vectors.keys()) != except_vectors:
#        client.delete_collection(COLLECTION_NAME)
#        client.recreate_collection(
#            COLLECTION_NAME,
#            vectors_config={
#                "image": VectorParams(size=512, distance=Distance.COSINE),
#                "text": VectorParams(size=1024, distance=Distance.COSINE),
#            }
#        )
#    else:
#        print("collection 存在且正确")
#
# except Exception as e:
#    client.recreate_collection( COLLECTION_NAME,
#        vectors_config={
#            "image": VectorParams(size=512, distance=Distance.COSINE),
#            "text": VectorParams(size=1024, distance=Distance.COSINE),
#        }
#    )

