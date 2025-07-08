import React from 'react';
import type { MCPToolCall } from './RemarkMCPTools'


export const MCPCard: React.FC<{ toolCall: string }> = ({ toolCall }) => {
  let toolCallObj: MCPToolCall | null = null;
  try {
    toolCallObj = JSON.parse(toolCall)
  } catch (e) {
    console.error("MCP Tool json parser error:", e);
  }
  return (
    <details className="border border-gray-700 rounded p-2 my-4 bg-surface0">
      <summary className="cursor-pointer font-semibold text-blue-400">
        🔍 MCP Tool: {toolCallObj?.tool} 的结果
      </summary>
      <div className="my-4 p-4 border border-gray-700 rounded-xl bg-gray-900 shadow-sm">
        <h3 className="text-lg font-semibold text-indigo-400">🛠 MCP Tool: {toolCallObj?.tool}</h3>
        <div className="text-sm mt-2">
          <div className="font-semibold text-gray-300">参数:</div>
          <pre className="bg-gray-800 text-gray-100 p-2 rounded overflow-x-auto text-xs">
            <code className="hljs language-json">
              {JSON.stringify(toolCallObj?.args, null, 2)}
            </code>
          </pre>
        </div>
        {toolCallObj?.output && (
          <div className="text-sm mt-2">
            <div className="font-semibold text-gray-300">输出:</div>
            <pre className="bg-gray-800 text-gray-100 p-2 rounded overflow-x-auto text-xs">
              <code className="hljs language-sql">
                {typeof toolCallObj.output === 'string'
                  ? toolCallObj.output
                  : JSON.stringify(toolCallObj.output, null, 2)}
              </code>
            </pre>
          </div>
        )}
      </div>
    </details>
  );
};

