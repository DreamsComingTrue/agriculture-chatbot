from fastmcp import Client

# 创建全局 Client 实例，传入 MCP 服务 URL
CLIENT = Client("http://localhost:8000/sse")


async def call_tool_with_stream(tool: str, args: dict):
    """
    使用 FastMCP.Client 调用 MCP tool 并逐步返回每次的 MCPContent.text。
    """
    try:
        # 异步上下文管理客户端连接
        async with CLIENT as client:
            # 流式调用指定工具
            result = await client.call_tool(tool, args)

            for item in result.content:
                if hasattr(item, "text"):
                    yield item.text  # type: ignore
                else:
                    yield str(item)
    except Exception as e:
        print("call tool error:----------------", e)
