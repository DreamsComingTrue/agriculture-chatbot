import type { Plugin } from 'unified';
import type { Root, Paragraph, Text, RootContent } from 'mdast';

export interface MCPToolCall {
  tool: string;
  args: Record<string, unknown>;
  output?: string;
}

export interface MCPToolCallNode {
  type: 'mcpToolCall';
  data: {
    hName: 'mcp-card';
    hProperties: {
      toolCall: string; // JSON.stringify-ed
    };
  };
  children: [];
}

/**
 * Ensure special characters in JSON attributes are safely escaped
 */
function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;') // use single quotes for outer, escape inner
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const remarkMCPTools: Plugin<[], Root> = () => {
  return (tree) => {
    const newChildren: RootContent[] = [];

    const mcpRegex =
      /正在使用MCP tool: ([^,]+), 参数: ([^\n]+?)\s*TOOL_OUTPUT: ([\s\S]*?)(?=(?:结合上次结果, 正在进行下一次MCP Tool的尝试|$))/g;

    for (const node of tree.children) {
      if (node.type !== 'paragraph') {
        newChildren.push(node);
        continue;
      }

      const paragraph = node as Paragraph;

      const fullText = paragraph.children
        .filter((c) => c.type === 'text')
        .map((c) => (c as Text).value)
        .join('');

      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = mcpRegex.exec(fullText)) !== null) {
        const [_, tool, argsStr, outputStr] = match;
        const matchStart = match.index;
        const matchEnd = mcpRegex.lastIndex;

        // Text before MCP match
        if (matchStart > lastIndex) {
          const preText = fullText.slice(lastIndex, matchStart).trim();
          if (preText) {
            newChildren.push({
              type: 'paragraph',
              children: [{ type: 'text', value: preText }],
            });
          }
        }

        let args: Record<string, unknown> = {};
        let output: unknown = outputStr.trim();

        try {
          args = JSON.parse(argsStr.replaceAll("'", '"'));
        } catch (e) {
          console.warn('Invalid args JSON:', argsStr, e);
        }

        try {
          output = JSON.parse(outputStr.replaceAll("'", '"'));
        } catch (e) {
          console.warn('Invalid output JSON:', outputStr, e);
        }

        const toolCall = { tool, args, output };
        const escapedToolCall = escapeHtmlAttr(JSON.stringify(toolCall));

        newChildren.push({
          type: 'html',
          value: `<mcp-card toolcall='${escapedToolCall}'></mcp-card>`,
        });

        lastIndex = matchEnd;
        console.log('📦 newChildren pushed html', newChildren);
      }

      if (lastIndex === 0) {
        newChildren.push(node);
        continue;
      }

      // Text after last match
      if (lastIndex < fullText.length) {
        const rest = fullText.slice(lastIndex).trim();
        if (rest) {
          newChildren.push({
            type: 'paragraph',
            children: [{ type: 'text', value: rest }],
          });
        }
      }
    }

    tree.children = newChildren;
    console.log('📦 newChildren', newChildren);
    console.log('📦 remarkMCPTools output', JSON.stringify(tree, null, 2));
  };
};

