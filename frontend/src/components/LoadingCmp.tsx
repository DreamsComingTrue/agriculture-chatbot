import { useEffect, useState } from 'react'
import type { FC } from 'react'

export const extractLoadingInfo = (inputString: string): string | null => {
  // 定义正则表达式来匹配 'loading: ' 后面跟随任意字符直到遇到换行符两次
  const regex = /loading:\s*(.*?)\s*\n*$/;

  // 使用正则表达式的 exec 方法来执行匹配
  const match = regex.exec(inputString);

  // 如果有匹配项，则返回捕获组中的内容（即 'xxx'），否则返回 null
  return match ? match[1] : null;
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
    const extractedText = extractLoadingInfo(content)
    switch (extractedText) {
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
