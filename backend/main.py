import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from langchain.chains import ConversationChain
from langchain.llms import Ollama

from user_memory import UserMemoryManager

app = Flask(__name__)
CORS(app)

# 强制使用 GPU
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

# 初始化模型
qwen_model = Ollama(model="qwen2.5vl:7b")
deepseek_model = Ollama(model="deepseek-r1:7b")

# 初始化记忆管理器
user_memory_manager = UserMemoryManager()


# 提示词生成函数
def generate_qwen_prompt(query, images, memory):
    image_prompt = "\n".join([f"Image {i+1}: {img}" for i, img in enumerate(images)])
    return f"用户查询: {query}\n包含以下图像信息:\n{image_prompt}\n\n对话历史:\n{memory.load_memory_variables({})['history']}"


def generate_deepseek_prompt(query, memory):
    return (
        f"用户查询: {query}\n\n对话历史:\n{memory.load_memory_variables({})['history']}"
    )


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    query = data.get("query", "")
    images = data.get("images", [])
    chat_id = data.get("chatID", "default")  # 默认会话ID

    # 根据输入内容选择模型
    if images:
        llm = qwen_model
        prompt = generate_qwen_prompt(
            query, images, user_memory_manager.get_memory(chat_id, llm)
        )
    else:
        llm = deepseek_model
        prompt = generate_deepseek_prompt(
            query, user_memory_manager.get_memory(chat_id, llm)
        )

    # 创建链并生成响应
    chain = ConversationChain(
        llm=llm, memory=user_memory_manager.get_memory(chat_id, llm)
    )
    response = chain.predict(input=prompt)

    return jsonify({"response": response})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
