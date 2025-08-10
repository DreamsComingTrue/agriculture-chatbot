import { useEffect, useState } from 'react'
import type { FC } from 'react'

export const extractLoadingInfo = (str: string) => {
  // 匹配所有 loading: xxx
  const matches = [...str.matchAll(/loading:\s*(.*?)\n\n/g)];
  if (matches.length === 0) return { lastLoading: null, afterLast: "" };

  // 最后一个匹配
  const lastMatch = matches[matches.length - 1];
  const lastLoading = lastMatch[1];

  // 获取最后一个匹配之后的内容
  const afterLast = str.slice(lastMatch.index + lastMatch[0].length);

  return { lastLoading, afterLast };
}

export const LoadingCmp: FC<{ content: string }> = (prop) => {
  const [loadingText, setLoadingText] = useState('')

  useEffect(() => {
    const { content } = prop
    if (!content) {
      setLoadingText("小羲正在努力思考中, 请稍后...")
      return
    }
    let text = ""
    const { lastLoading, afterLast } = extractLoadingInfo(content)
    if (afterLast) {
      setLoadingText("")
      return
    }
    switch (lastLoading) {
      case "mcp_begining":
        text = "小羲正在尝试使用MCP插件, 解决该问题..."
        break
      case "mcp_list_schemas":
        text = "小羲正在分析数据库的架构, 请稍后..."
        break
      case "mcp_list_objects":
        text = "小羲正在查询数据库的所有表, 请稍后..."
        break
      case "mcp_get_object_details":
        text = "小羲正在查询数据表的表结构, 请稍后..."
        break
      case "mcp_execute_sql":
        text = "小羲正在生成 SQL, 请稍后..."
        break
      case "mcp_another_try":
        text = "小羲正在结合上次结果, 再次使用 MCP 插件, 请稍后..."
        break
      case "mcp_ending_not_match":
        text = "尝试结束, 该问题不适合使用 MCP 工具解答"
        break
      case "mcp_ending_summarize":
        text = "尝试结束, 小羲正在汇总全部信息为您解答, 请稍后..."
        break
      default:
        break
    }
    setLoadingText(text)
  }, [prop])

  return <div>{loadingText}</div>
}
