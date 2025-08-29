from utils.models import generate_with_ollama, generate_with_ollama_stream
from utils.promptsArchive import (END_KEYWORD, get_mcp_prompt,
                                  get_summary_prompt)
from utils.utils import clean_message, extract_json, get_tables_by_keys

from .mcp_stream import call_tool_with_stream
from .fuxi_schemas import fuxi_keywords_table_list, fuxi_schemas


async def run_postgres_mcp_tool(user_query: str, context_list: list[str], rag_result: list[str]):
    context = ""
    times = 1
    dbs = get_tables_by_keys(user_query, fuxi_keywords_table_list, fuxi_schemas) or fuxi_schemas
    print("dbs:-------------------------------------", dbs)


    yield "loading: mcp_begining \n\n"
    while True:
        prompt = get_mcp_prompt(user_query, context, dbs)
        llm_reply = await generate_with_ollama(prompt)
        llm_reply = clean_message(llm_reply["response"])

        if END_KEYWORD in llm_reply or times == 5:
            if times == 1:
                yield "loading: mcp_ending_not_match \n\n"
                break
            yield "loading: mcp_ending_summarize \n\n"
            summary_prompt = get_summary_prompt(user_query, context, rag_result)
            final_token = ""
            async for chunk in generate_with_ollama_stream(
                prompt=summary_prompt, model="qwen3:32b"
            ):
                token = (
                    str(chunk.get("response"))
                    if isinstance(chunk, dict) and "response" in chunk
                    else str(chunk)
                )
                print("token-------------", token)
                final_token += token
                yield token

            context_list.append(f"summary: {final_token}\n")
            break

        try:
            plan = extract_json(llm_reply)
            print("tool plan----------------------", plan)
            tool = plan["tool"]
            args = plan.get("args", {})
            if times > 1:
                yield "loading: mcp_another_try \n\n"

            # yield f"正在使用MCP tool: {tool}, 参数: {json.dumps(args, ensure_ascii=False)}\n" yield f"loading: {getLoadingTextByTool(tool)} \n\n"
            async for tool_output in call_tool_with_stream(tool, args):
                # yield f"TOOL_OUTPUT: {json.dumps(tool_output, ensure_ascii=False)}\n\n"
                context_list.append(
                    f"tool: {tool}, args: {args}, output: {tool_output}\n"
                )
                context += f"TOOL({tool}, {args}) => {tool_output}\n"
                print("tool_output------------------", tool_output)
            times += 1
        except Exception as e:
            print("error in run_agent-----------------", e)
            yield f"** Error parsing or executing plan: {e} **\n"
            break


# 生成 loading text, 前端匹配
def getLoadingTextByTool(tool):
    match tool:
        case "list_schemas":
            return "mcp_list_schemas"
        case "list_objects":
            return "mcp_list_objects"
        case "get_object_details":
            return "mcp_get_object_details"
        case "execute_sql":
            return "mcp_execute_sql"
        case _:
            return ""
