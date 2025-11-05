# 🌾 Agriculture Assistant - RAG System

🔍 Retrieval-Augmented Generation (RAG) system for the Agriculture Assistant, providing knowledge retrieval capabilities using vector databases.

## ✨ Features

- 📝 Text and image embedding
- 🚀 Efficient document retrieval
- 🗄️ Vector database integration (Qdrant)
- 📤 Upload interface for adding new documents
- 🔎 Search service for querying relevant information

## 🛠️ Tech Stack

### 🧮 Embedding Models

- **Text:** BAAI/bge-large-zh-v1.5
- **Images:** openai/clip-vit-base-patch32
- **Vector Database:** Qdrant
- **API:** FastAPI
- **Frontend Uploader:** React + TypeScript

## 🚀 Getting Started

### 📥 Installation

```bash
# Navigate to RAG directory
cd rag

# Install dependencies
pip install -r requirements.txt
```

### 🔄 Running the Service

```bash
# Start RAG service (default port 8100)
python rag_service.py
```

### Starting the Uploader Interface

```bash
# From the project root, start the RAG uploader frontend
cd frontend
pnpm dev:rag
```

## 🧩 Key Components

- 🔮 `rag.py`: Core RAG logic for analysis and retrieval
- 🔄 `embedding.py`: Text and image embedding utilities
- 📤 `uploader/`: Frontend interface for document uploads
- 🗄️ `qdrant_client.py`: Vector database interaction

## 📖 Usage

- The RAG service runs on port 8100 by default
- Upload documents via the uploader interface (`http://localhost:5170`)
- Query the service via the `/search` endpoint with text or image inputs
- Integrates with the main backend to provide context for LLM responses

## ⚙️ Configuration

- 🔧 Set vector database connection details in `config.yaml`
- 🎯 Adjust embedding models and retrieval parameters in `settings.py`
- 🌐 Configure CORS and network settings for cross-origin requests

## 📊 Technical Details

- 🗄️ Vector storage uses Qdrant's `multimodal` collection
- 📝 Text embeddings: 1024-dimensional vectors
- 🖼️ Image embeddings: 512-dimensional vectors
- 📐 Similarity calculation: Cosine distance

🌟 The RAG system enhances LLM responses by providing relevant agricultural knowledge, ensuring more accurate and contextually appropriate advice.
