import torch
from PIL import Image
from qdrant_client import QdrantClient
from qdrant_client.models import (CollectionStatus, Distance, PointStruct,
                                  VectorParams)
from sentence_transformers import CLIPModel, CLIPProcessor
from transformers import AutoModel, AutoTokenizer


# ========== QWEN3 Text Embedding ==========
class Qwen3Embedder:
    def __init__(self, model_id="Qwen/Qwen3-Embedding-0.5B"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        self.model = AutoModel.from_pretrained(model_id, trust_remote_code=True).eval()

    def embed(self, text: str):
        inputs = self.tokenizer(
            text, return_tensors="pt", truncation=True, max_length=512
        )
        with torch.no_grad():
            output = self.model(**inputs)
            return output.last_hidden_state.mean(dim=1).squeeze().tolist()


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

if client.get_collection(COLLECTION_NAME).status != CollectionStatus.GREEN:
    client.recreate_collection(
        COLLECTION_NAME,
        vectors_config={
            "image": VectorParams(size=512, distance=Distance.COSINE),
            "text": VectorParams(size=1024, distance=Distance.COSINE),
        },
    )
