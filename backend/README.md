# 🌾 Agriculture Assistant - Backend

⚡ The backend service for the Agriculture Assistant, handling LLM integration, business logic, and coordinating between components.

## ✨ Features

- 🤖 LLM integration (Ollama: deepseek-r1, qwen2.5vl)
- 📝 Prompt generation and management
- 🔍 RAG system coordination
- 🔌 MCP (Model-Computer-Program) tool integration
- 🔊 Audio processing for speech output

## 🛠️ Tech Stack

- **Language:** Python 3.9+
- **LLM Integration:** Ollama client
- **Database:** Postgres (via MCP)
- **API:** FastAPI

## 🚀 Getting Started

### 📥 Installation

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 🔄 Running the Service

```bash
# Start the backend server
uvicorn main:app --reload --port 8000
```

## 🧩 Key Components

- 🎯 `main.py`: Entry point with core prompt generation logic
- 🔍 `rag/rag.py`: RAG system integration and document retrieval
- 📝 `utils/promptsArchive.py`: Prompt templates for different use cases
- 🤖 `utils/models.py`: LLM interaction utilities
- 🔌 `utils/mcp.py`: Database interaction via MCP tools

## 🧠 LLM Integration

The backend communicates with Ollama to run models:

- 🌱 **deepseek-r1:7b**: For general agricultural advice
- 🖼️ **qwen2.5vl:7b**: For multimodal inputs (text + images)
- 🚀 **qwen3:32b**: For more complex analysis tasks

## 🔌 API Endpoints

- 🔍 `/analyze`: Main endpoint for processing user queries
- 🔎 RAG-related endpoints for document search and retrieval
- 💾 MCP tool endpoints for database operations
