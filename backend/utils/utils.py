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
    # ================= 系统关键词 ===================
    "伏羲",
    "伽马",
    # ================= 基本地块信息 =================
    "地块数量",
    "地块详情",
    "地块编码",
    "地块归属",
    "地块类型",
    "地块面积",
    "高标准农田",
    "农田总面积",
    # ================= 土壤与环境分析 =================
    "土壤温度",
    "氮含量",
    "磷含量",
    "钾含量",
    "有机碳含量",
    "墒情",
    "碱解氮",
    "速效钾",
    "缓效钾",
    "全氮",
    "全钾",
    "土壤PH",
    "有效磷",
    "有效钾",
    "历史积温分析",
    "历史平均温度分析",
    "历史平均降水量分析",
    "历史平均风速分析",
    "月平均温度分析",
    "月平均降水量分析",
    "月平均风速分析",
    # ================= 作物种植与管理 =================
    "种子库",
    "播种时间",
    "预计生长时间",
    "预计成熟时间",
    # ================= 决策与报告 =================
    "处方图",
    # ================= 农机效率与成本 =================
    "农机",
    "整机功率",
    "最大牵引力",
    "翻地效率",
    "动力成本",
    # ================= 伽马土壤检测 =================
    "耕地总面积",
    "面积进度",
    "已检测面积",
    "未检测面积",
    "地块进度",
    "已检测数量",
    "未检测数量",
]

PROMPT_TRIGGER_KEYWORDS = [
    "河北",
    "种植",
    "畜牧",
    "虫害",
    "害虫",
    "防治",
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


def should_apply_enhanced_prompt(user_input: str) -> bool:
    """
    判断用户输入是否需要使用增强的 prompt
    """
    lower_input = user_input.lower()
    return any(keyword.lower() in lower_input for keyword in PROMPT_TRIGGER_KEYWORDS)
