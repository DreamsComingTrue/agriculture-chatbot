import { useEffect, useState } from 'react'
import type { FC } from 'react'

export enum LoadingLevel {
  "none" = 0,
  "mcp_begining" = 1,
  "mcp_list_schema" = 2,
  "mcp_list_objects" = 3,
  "mcp_get_object_details" = 4,
  "mcp_execute_sql" = 5,
  "mcp_ending_1" = 6,
  "mcp_ending_2" = 7,
  "normal" = 8,
}

export const LoadingCmp: FC<{ level: LoadingLevel }> = (prop) => {
  const [loadingText, setLoadingText] = useState('')
  useEffect(() => {
    const { level } = prop
    let text = ''
    switch (level) {
      case 1:
        text = "小羲正在尝试使用MCP插件, 解决该问题..."
        break
      case 2:
        text = "小羲正在分析数据库的架构, 请稍后..."
        break
      case 3:
        text = "小羲正在查询数据库的所有表, 请稍后..."
        break
      case 4:
        text = "小羲正在查询数据表的表结构, 请稍后..."
        break
      case 5:
        text = "小羲正在生成 SQL, 请稍后..."
        break
      case 6:
        text = "尝试结束, 该问题不适合使用 MCP 工具解答"
        break
      case 7:
        text = "尝试结束, 小羲正在汇总全部信息为您解答, 请稍后..."
        break
      case 8:
        text = "小羲正在努力思考中, 请稍后..."
        break
      default:
        break
    }
    setLoadingText(text)
  }, [prop])
  return <div>{loadingText}</div>
}
