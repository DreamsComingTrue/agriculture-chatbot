import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css'; // Or choose another style
import type { PluggableList } from 'unified';


interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = ''
}) => {
  const remarkPlugins: PluggableList = [remarkGfm, remarkBreaks];
  const rehypePlugins: PluggableList = [
    rehypeRaw,
    [rehypeHighlight, { ignoreMissing: true }] ];

    const formattedContent = content
    .replace(/<think>/g, '&lt;think&gt;')
    .replace(/<\/think>/g, '&lt;/think&gt;')
    .replace(/~/g, '\-')

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          // @ts-expect-error known issue
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <div className="relative">
                <div className="absolute right-2 top-1 text-xs text-gray-500">
                  {match?.[1] || 'code'}
                </div>
                <pre className="w-full overflow-x-auto whitespace-pre rounded-md bg-gray-100 p-4 text-sm">
                  <code
                    className={`hljs ${className}`}
                    {...props}
                  >
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="bg-gray-500 px-1.5 py-0.5 rounded text-sm font-mono">
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
    </div>
  );
};
