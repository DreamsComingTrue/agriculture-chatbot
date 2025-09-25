import json
import re
from .load_config import global_config

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
    data = {}
    """格式化SSE消息"""
    if type == "delta":
        data = {"type": type, "token": str}
    else:
        data = {"type": type, "message": str}
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"  # SSE格式要求每行以\n结束，消息以\n\n分隔

def should_use_mcp_plugin(user_input: str) -> bool:
    """
    判断用户输入是否需要启用 MCP 插件

    参数:
        user_input: str - 用户输入的自然语言

    返回:
        bool - 是否触发 MCP 工具
    """
    lower_input = user_input.lower()
    return any(value.get("keyword").lower() in lower_input for value in global_config.mcp_db_dict.values())

def get_mcp_config_by_keyword(input: str):
    lower_keyword = input.lower()
    
    return {key:value for key, value in global_config.mcp_db_dict.items()
            if value.get("keyword").lower() in lower_keyword}

def get_tables_by_keys(user_input: str, data_list, schema_list):
    lower_input = user_input.lower()
    for item in data_list:
        if item["key"] in lower_input:
            tables = []
            for table in item["tables"]:
                table_name = table.get("name")
                schema = json.loads(json.dumps(schema_list.get(table_name)))  # Get a copy to avoid modifying original
                schema["name"] = table_name  # Add the name to the schema
                tables.append(schema)
            return tables
    return None


def should_apply_enhanced_prompt(user_input: str) -> bool:
    """
    判断用户输入是否需要使用增强的 prompt
    """
    lower_input = user_input.lower()
    return any(keyword.lower() in lower_input for keyword in global_config.PROMPT_TRIGGER_KEYWORDS)
