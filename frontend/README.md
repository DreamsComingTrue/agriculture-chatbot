# 🌾 Agriculture Assistant - Frontend

🎯 A modern, responsive chat interface for interacting with the Agriculture Assistant, built with React, TypeScript, and Vite.

## ✨ Features

- 💬 Real-time chat interface with markdown support
- 📤 Multi-modal input (text, image upload)
- 🎨 Syntax highlighting for code snippets
- 🌍 Internationalization support
- 📱 Responsive design with Tailwind CSS
- 🔌 MCP tool integration visualization
- 🖼️ RAG image display

## 🛠️ Tech Stack

- **Core:** React 19, TypeScript, Vite
- **UI:** Tailwind CSS, Radix UI, Lucide icons
- **Markdown:** React Markdown, Rehype, Remark
- **State Management:** React hooks
- **Build Tool:** Vite with custom configurations

## 🚀 Getting Started

### 📥 Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install
```

### 🔧 Development

```bash
# Start development server
pnpm dev

# Start RAG uploader development server
pnpm dev:rag

# Start iframe component development
pnpm dev:iframe
```

### Build

```bash
# Build for production
pnpm build

# Build for iframe embedding
pnpm build:iframe
```

### Linting

```bash
pnpm lint
```

## 📁 Project Structure

- 📂 `src/`: Main source directory
  - 🧩 `components/`: Reusable UI components
    - 💬 `ChatInterface.tsx`: Main chat component
    - 📝 `MarkdownRenderer.tsx`: Renders markdown content with custom processing
    - 🔧 `RemarkMCPTools.tsx`: Processes MCP tool calls in markdown
  - 🛠️ `lib/`: Utility functions and services
    - 🤖 `ollamaService.ts`: Handles communication with backend
    - ✨ `promptGenerator.ts`: Generates prompts for LLM
  - 🎨 `styles/`: Global styles and Tailwind configuration
  - 🌍 `locales/`: Internationalization files

## ⚙️ Configuration

- Environment variables can be set in `.env` files
- Vite configurations for different build targets are in `vite.config.ts`, `vite.rag.config.ts`, and `vite.fuxi.config.ts`
