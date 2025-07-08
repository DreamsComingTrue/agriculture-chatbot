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
    data = {}
    """格式化SSE消息"""
    if type == "delta":
        data = {"type": type, "token": str}
    else:
        data = {"type": type, "message": str}
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"  # SSE格式要求每行以\n结束，消息以\n\n分隔


# MCP 工具触发关键词
MCP_TRIGGER_KEYWORDS = [
    # 通用数据库关键词
    "数据库",
    "SQL",
    "schema",
    "表结构",
    "字段",
    "查询",
    "执行",
    "主键",
    "列名",
    # list_schemas
    "有哪些库",
    "所有的库",
    "数据库结构",
    "schema 列表",
    "数据库目录",
    "数据源",
    # list_objects
    "哪些表",
    "库里有哪些表",
    "表清单",
    "目录结构",
    "查看数据表",
    # get_object_details
    "字段有哪些",
    "字段结构",
    "列结构",
    "主键是",
    "字段类型",
    "列名",
    # execute_sql
    "select",
    "from",
    "join",
    "where",
    "group by",
    "order by",
    "统计",
    "查询",
    "获取",
    "总数",
    "平均值",
    "最大值",
    "写 SQL",
]


def should_use_mcp_plugin(user_input: str) -> bool:
    """
    判断用户输入是否需要启用 MCP 插件

    参数:
        user_input: str - 用户输入的自然语言

    返回:
        bool - 是否触发 MCP 工具
    """
    lower_input = user_input.lower()
    return any(keyword.lower() in lower_input for keyword in MCP_TRIGGER_KEYWORDS)
