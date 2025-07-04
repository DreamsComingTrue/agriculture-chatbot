from utils.models import generate_with_ollama, generate_with_ollama_stream
from utils.promptsArchive import (END_KEYWORD, get_mcp_prompt,
                                  get_summary_prompt)
from utils.utils import clean_message, extract_json, generate_sse_data

from .mcp_stream import call_tool_with_stream


async def run_postgres_mcp_tool(user_query: str, context_list: list[str]):
    context = ""
    times = 1

    yield generate_sse_data("尝试中: 使用MCP插件解决该问题\n\n")
    while True:
        prompt = get_mcp_prompt(user_query, context)
        llm_reply = await generate_with_ollama(prompt)
        llm_reply = clean_message(llm_reply["response"])
        print("tool plan----------------------", llm_reply)

        if END_KEYWORD in llm_reply or times == 8:
            yield generate_sse_data(
                "尝试结束, 小羲正在汇总全部信息为您解答, 请稍后...\n\n"
            )
            summary_prompt = get_summary_prompt(user_query, context)
            async for chunk in generate_with_ollama_stream(
                prompt=summary_prompt, model="qwen3:32b"
            ):
                yield generate_sse_data(chunk)
            break

        try:
            plan = extract_json(llm_reply)
            tool = plan["tool"]
            args = plan.get("args", {})
            if times > 1:
                yield generate_sse_data(
                    "结合上次结果, 正在进行下一次MCP Tool的尝试\n\n"
                )
            yield generate_sse_data(f"正在使用MCP tool: {tool}, 参数: {args}\n")

            async for tool_output in call_tool_with_stream(tool, args):
                yield generate_sse_data(f"TOOL_OUTPUT: {tool_output}\n\n")
                context_list.append(
                    f"tool: {tool}, args: {args}, output: {tool_output}\n"
                )
                context += f"TOOL({tool}, {args}) => {tool_output}\n"
                print("tool_output------------------", tool_output)
            times += 1
        except Exception as e:
            print("error in run_agent-----------------", e)
            yield generate_sse_data(
                f"** Error parsing or executing plan: {e} **\n", "error"
            )
            break
