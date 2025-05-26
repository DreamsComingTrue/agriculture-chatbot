import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css'; // Or choose another style
// @ts-expect-error known issue
import type { PluggableList } from 'react-markdown/lib/react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = ''
}) => {
  const remarkPlugins: PluggableList = [remarkGfm];
  const rehypePlugins: PluggableList = [
    [rehypeHighlight, { ignoreMissing: true }]
  ];

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          // @ts-expect-error known issue
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return inline ? (
              <div className="relative">
                <div className="absolute right-2 top-1 text-xs text-gray-500">
                  {match?.[1] || 'code'}
                </div>
                <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto mt-6">
                  <code
                    className={`hljs ${className}`}
                    {...props}
                  >
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            );
          },
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
              <th className="border px-4 py-2 text-left bg-gray-50">
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
        {content}
      </ReactMarkdown>
    </div>
  );
};
