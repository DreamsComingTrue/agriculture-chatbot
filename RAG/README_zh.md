# 🧠 图文多模态嵌入 API（Qwen3 + CLIP + Qdrant）

本项目基于 **FastAPI** 构建服务，支持上传**文本 + 图片**并生成多模态向量，最终存入 [Qdrant 向量数据库](https://qdrant.tech)。

- ✍️ 文本向量：使用 Qwen3-Embedding 模型
- 🖼️ 图像向量：使用 CLIP 模型
- 🚀 服务接口：通过 FastAPI 提供上传与查询功能

---

## 📦 功能特色

- 提交文本 + 图片，自动生成嵌入向量并写入 Qdrant
- 支持文本相似度查询，返回相似图文记录
- 可扩展支持图像搜索、批量导入、Docker 部署等

---

## 🔧 安装依赖

### 1. 安装依赖

```bash
pip install -r requirements.txt

### 2. 启动 Qdrant 数据库（使用 Docker）

```bash
docker run -p 6333:6333 -v $(pwd)/qdrant_data:/qdrant/storage qdrant/qdrant
```
服务器中已安装依赖，已启动 Qdrant 数据库，从启动服务开始
## 🚀 启动服务

```bash
cd agriculture-chatbot
python3 -m RAG.main
```

打开接口文档：<http://localhost:8082/docs>

## 🧩 接口说明

1️⃣ POST /embed 上传文本和图片并写入数据库

请求类型：multipart/form-data

参数名 类型 是否必填 说明
text string ✅ 输入的文本
image file ✅ 上传的图像文件

示例请求

```bash
curl -X POST http://localhost:8082/embed \
  -F "text=这是苍耳" \
  -F "image=@images/苍耳.jpg"

```

响应结果

```bash
{"status":"success","image_path":"./uploaded_images/da61afac65ed4f108594bfa6240539cd_苍耳.jpg"}
```

查询参数

参数名 类型 说明
query string 输入要搜索的文本内容
top_k int 返回前 top_k 个结果，默认3

示例请求

```bash
curl -G --data-urlencode "query=苍耳" http://localhost:8082/search
```

示例响应

```bash
[{"text":"这是苍耳","image_path":"./uploaded_images/da61afac65ed4f108594bfa6240539cd_苍耳.jpg"}]
```

## 📘 注意事项

- 向量存储在名为 multimodal 的 Qdrant collection 中

- Qwen3 输出 1024 维文本向量，CLIP 输出 512 维图像向量

- 相似度计算方式为 Cosine 距离