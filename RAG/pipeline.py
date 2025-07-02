import torch
from PIL import Image
from qdrant_client import QdrantClient
from qdrant_client.models import (CollectionStatus, Distance, PointStruct,
                                  VectorParams)
from transformers import CLIPModel, CLIPProcessor
from qdrant_client.models import CollectionInfo
from sentence_transformers import SentenceTransformer

# ========== BGE Text Embedding ==========
class BgeEmbedder:
    def __init__(self, model_name="BAAI/bge-large-zh-v1.5"):

        self.model = SentenceTransformer(model_name)

    def embed(self, text: str):
        return self.model.encode(text, normalize_embeddings=True).tolist()


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
client = QdrantClient(host="localhost", port=6333)

COLLECTION_NAME = "multimodal"

try:
    info:CollectionInfo = client.get_collection(COLLECTION_NAME)

    exist_vectors = info.vectors_config
    except_vectors = {"image", "text"}
    if set(exist_vectors.keys()) != except_vectors:
        client.delete_collection(COLLECTION_NAME)
        client.recreate_collection(
            COLLECTION_NAME,
            vectors_config={
                "image": VectorParams(size=512, distance=Distance.COSINE),
                "text": VectorParams(size=1024, distance=Distance.COSINE),
            }
        )
    else:
        print("collection 存在且正确")

except Exception as e:
    client.recreate_collection( COLLECTION_NAME,
        vectors_config={
            "image": VectorParams(size=512, distance=Distance.COSINE),
            "text": VectorParams(size=1024, distance=Distance.COSINE),
        }
    )
