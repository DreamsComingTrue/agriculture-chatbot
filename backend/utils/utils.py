import json
import re


def clean_message(message):
    # 移除 <think> 和 </think> 标签及其间的内容
    cleaned_message = re.sub(r"<think>.*?</think>", "", message, flags=re.DOTALL)

    # 去除所有空行（包括仅含空白字符的行）
    cleaned_message = re.sub(r"(?m)^\s*$", "", cleaned_message)

    return cleaned_message.strip()  # 使用 strip() 去除首尾多余的空白字符


def extract_json(message):
    try:
        # Regex to match content inside triple-backtick JSON code blocks
        json_match = re.search(r"```json\s*({.*?})\s*```", message, re.DOTALL)

        if json_match:
            json_str = json_match.group(1)
            # Attempt to parse the JSON string
            return json.loads(json_str)
        else:
            return json.loads(message)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}")
        return {}


def generate_sse_data(str, type="delta"):
    """格式化SSE消息"""
    if type == "delta":
        data = {"type": type, "token": str}
    else:
        data = {"type": type, "message": str}
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"  # SSE格式要求每行以\n结束，消息以\n\n分隔
