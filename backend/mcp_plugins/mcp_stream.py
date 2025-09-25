from fastmcp import Client
from utils.load_config import global_config

# 创建全局 Client 实例，传入 MCP 服务 URL
MCP_CLIENT = None

def get_mcp_client():
    global MCP_CLIENT
    if not MCP_CLIENT:
        config = {}
        for key, value in global_config.mcp_db_dict.items():
            config[key] = {
                "transport": "sse",
                "url": value.get("url")
            }
        MCP_CLIENT = Client({
            "mcpServers": config
        })
    return MCP_CLIENT


async def call_tool_with_stream(tool: str, db_key: str, args: dict):
    """
    使用 FastMCP.Client 调用 MCP tool 并逐步返回每次的 MCPContent.text。
    """
    mcp_client = get_mcp_client()
    tools = await mcp_client.list_tools()
    if not mcp_client:
        return
    try:
        # 异步上下文管理客户端连接
        async with mcp_client as client:
            print("tools-------------------:", tools, f"{db_key}_{tool}")
            # 流式调用指定工具
            result = await client.call_tool(f"{db_key}_{tool}", args)

            for item in result.content:
                if hasattr(item, "text"):
                    yield item.text  # type: ignore
                elif hasattr(item, "data"):
                    yield item.data  # type: ignore
                else:
                    yield str(item)
    except Exception as e:
        print("call tool error:----------------", e)
