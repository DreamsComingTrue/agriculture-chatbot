import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import '@catppuccin/highlightjs/css/catppuccin-mocha.css';
import { remarkMCPTools } from './RemarkMCPTools';
import { MCPCard } from './MCPCard';
import type { PluggableList } from 'unified';
import { LoadingLevel, LoadingCmp } from './LoadingCmp';


interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = ''
}) => {
  const remarkPlugins: PluggableList = [
    remarkGfm,
    remarkMCPTools
  ];
  const rehypePlugins: PluggableList = [
    rehypeRaw,
    // rehypeCustomComponents,
    [rehypeHighlight, { ignoreMissing: true }],
  ];

  const formattedContent = content
    .replace(/<think>/g, '&lt;think&gt;')
    .replace(/<\/think>/g, '&lt;/think&gt;')
    .replace(/~/g, '-')

  //   const formattedContent = `
  // This is some inline code: \`123\` inside a paragraph.
  //
  // Here is a code block:
  //
  // \`\`\`sql
  // SELECT * FROM users WHERE id = 1;
  // \`\`\`
  //
  // 正在使用MCP tool: list_schema, 参数: {{"ttt": hahaha}} TOOL_OUTPUT: \`\`\`sql Select * from table; \`\`\`
  // `;

  const [loadingLevel, setLoadingLevel] = React.useState(LoadingLevel.none)
  useEffect(() => {
    if (!content) setLoadingLevel(LoadingLevel.normal)
    else setLoadingLevel(LoadingLevel.none)
  }, [content])

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        // children={"<div>sdfsdf`123`hahahah</div>"}
        skipHtml={false}
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          // @ts-expect-error any and node types
          'mcp-card': ({ node }) => {
            return <MCPCard toolCall={node.properties.toolcall} />;
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const inline = !match;
            return !inline ? (
              <div className="relative">
                <div className="absolute right-2 top-1 text-xs text-gray-500">
                  {match?.[1] || 'code'}
                </div>
                <pre className="w-full overflow-x-auto whitespace-pre rounded-md bg-black p-4 text-sm">
                  <code
                    className={`hljs ${className}`}
                    {...props}
                  >
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="hljs">
                {children}
              </code>
            );
          },
          h2: ({ children, className }) => (
            <h2 className={className} style={{ margin: '1em 0' }}>
              {children}
            </h2>
          ),

          // custom H3
          h3: ({ children, className }) => (
            <h3 className={className} style={{ margin: '0.75em 0' }}>
              {children}
            </h3>
          ),

          // custom paragraph
          p: ({ children, className }) => (
            // TODO: Add a parser here
            <p className={className} style={{ margin: '0.5em 0' }}>
              {children}
            </p>
          ),

          // custom unordered list
          ul: ({ children, className }) => (
            <ul className={className} style={{ margin: '0.5em 0 1em 1.5em' }}>
              {children}
            </ul>
          ),
          table({ children }) {
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border px-4 py-2 text-left bg-gray-400">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border px-4 py-2">
                {children}
              </td>
            );
          },
          a({ children, href }) {
            return (
              <a
                href={href}
                className="text-blue-600 hover:underline break-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          // Add more custom components as needed
        }}
      >
        {formattedContent}
      </ReactMarkdown>
      <LoadingCmp level={loadingLevel} />
    </div>
  );
};
