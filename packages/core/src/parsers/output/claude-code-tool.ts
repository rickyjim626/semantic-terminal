/**
 * Claude Code Tool Output Parser
 * Parses tool call boxes (tool name, parameters, output)
 */

import type {
  OutputParser,
  ParserContext,
  SemanticOutput,
  ClaudeCodeToolOutput,
} from '../../core/types.js';
import { BaseOutputParser } from '../base.js';

// Tool header patterns:
// - Box style: "⏺ Bash" or "⏺ Bash (completed in 0.5s)"
// - Inline call style: "⏺ Bash(git status)" or "⏺ Search(pattern: \"*.ts\")"
const TOOL_HEADER_BOX_PATTERN = /^⏺\s+(\w+)(?:\s+\(completed\s+in\s+([\d.]+)s?\))?$/;
const TOOL_HEADER_INLINE_PATTERN = /^⏺\s+(\w+)\((.*)\)$/;

// Tool parameter line pattern: │ key: value
// Example: "  │ command: \"git status\""
// Example: "  │ file_path: \"/path/to/file\""
const PARAM_LINE_PATTERN = /^\s*│\s*(\w+):\s*(.+)$/;

// Inline tool output lines often start with ⎿
const INLINE_OUTPUT_LINE_PATTERN = /^\s*⎿\s*(.+)$/;

// Known tool names
const KNOWN_TOOLS = [
  'Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep',
  'WebFetch', 'WebSearch', 'Task', 'LSP', 'NotebookEdit',
  'Search', 'TodoRead', 'TodoWrite',
];

export class ClaudeCodeToolOutputParser extends BaseOutputParser<ClaudeCodeToolOutput> implements OutputParser<ClaudeCodeToolOutput> {
  meta = {
    name: 'claude-code-tool',
    description: 'Parses Claude Code tool call outputs',
    priority: 92,
    version: '1.0.0',
  };

  canParse(context: ParserContext): boolean {
    // Check if any line matches tool header pattern
    return context.lastLines.some(line => {
      const trimmed = line.trim();
      return TOOL_HEADER_BOX_PATTERN.test(trimmed) || TOOL_HEADER_INLINE_PATTERN.test(trimmed) || INLINE_OUTPUT_LINE_PATTERN.test(trimmed);
    });
  }

  parse(context: ParserContext): SemanticOutput<ClaudeCodeToolOutput> | null {
    const lines = context.lastLines;
    let toolName: string | null = null;
    let duration: number | undefined;
    const params: Record<string, unknown> = {};
    const outputLines: string[] = [];
    let inToolBlock = false;
    let toolStyle: 'box' | 'inline' | null = null;
    let rawLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for tool header
      const boxHeaderMatch = trimmed.match(TOOL_HEADER_BOX_PATTERN);
      if (boxHeaderMatch) {
        toolName = boxHeaderMatch[1];
        if (boxHeaderMatch[2]) {
          duration = parseFloat(boxHeaderMatch[2]) * 1000; // Convert to ms
        }
        inToolBlock = true;
        toolStyle = 'box';
        rawLines.push(line);
        continue;
      }

      const inlineHeaderMatch = trimmed.match(TOOL_HEADER_INLINE_PATTERN);
      if (inlineHeaderMatch) {
        toolName = inlineHeaderMatch[1];
        const argString = inlineHeaderMatch[2] ?? '';
        Object.assign(params, this.parseInlineArgs(toolName, argString));
        inToolBlock = true;
        toolStyle = 'inline';
        rawLines.push(line);
        continue;
      }

      if (inToolBlock) {
        // Check for parameter line
        if (toolStyle === 'box') {
          const paramMatch = trimmed.match(PARAM_LINE_PATTERN);
          if (paramMatch) {
            const [, key, value] = paramMatch;
            // Try to parse JSON value, fallback to string
            try {
              params[key] = JSON.parse(value);
            } catch {
              // Remove surrounding quotes if present
              params[key] = value.replace(/^"(.*)"$/, '$1');
            }
            rawLines.push(line);
            continue;
          }

          // Check for output content (lines starting with │ but not key: value)
          if (trimmed.startsWith('│')) {
            const content = trimmed.slice(1).trim();
            if (content && !PARAM_LINE_PATTERN.test(trimmed)) {
              outputLines.push(content);
              rawLines.push(line);
            }
            continue;
          }
        }

        if (toolStyle === 'inline') {
          const outMatch = trimmed.match(INLINE_OUTPUT_LINE_PATTERN);
          if (outMatch) {
            const content = outMatch[1]?.trim() ?? '';
            if (content) {
              outputLines.push(content);
            }
            rawLines.push(line);
            continue;
          }

          // Continuation lines (indented), keep as plain text output.
          if (/^\s{2,}\S/.test(line) && !trimmed.startsWith('⏺') && !trimmed.startsWith('❯') && !trimmed.startsWith('>')) {
            outputLines.push(trimmed);
            rawLines.push(line);
            continue;
          }
        }

        // End of tool block
        if (toolStyle === 'box') {
          if (trimmed.length > 0 && !trimmed.startsWith('│')) {
            break;
          }
        } else if (toolStyle === 'inline') {
          if (trimmed.length > 0 && !INLINE_OUTPUT_LINE_PATTERN.test(trimmed)) {
            break;
          }
        }
      }
    }

    if (!toolName) {
      return null;
    }

    // Determine status
    let status: ClaudeCodeToolOutput['status'] = 'running';
    if (duration !== undefined) {
      status = 'completed';
    }

    const data: ClaudeCodeToolOutput = {
      toolName,
      params,
      output: outputLines.length > 0 ? outputLines.join('\n') : undefined,
      duration,
      status,
    };

    const raw = rawLines.join('\n');
    const confidence = KNOWN_TOOLS.includes(toolName) ? 0.95 : 0.8;

    return this.createOutput('claude-tool', raw, data, confidence);
  }

  private parseInlineArgs(toolName: string, args: string): Record<string, unknown> {
    const trimmed = args.trim();
    if (!trimmed) return {};

    // Bash(...) is usually a raw command string.
    if (toolName === 'Bash') {
      return { command: trimmed };
    }

    // If it looks like key: value pairs, parse loosely.
    if (trimmed.includes(':')) {
      const parts: string[] = [];
      let current = '';
      let inString: '"' | '\'' | null = null;

      for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i]!;
        if (inString) {
          if (ch === inString && trimmed[i - 1] !== '\\') {
            inString = null;
          }
          current += ch;
          continue;
        }

        if (ch === '"' || ch === '\'') {
          inString = ch;
          current += ch;
          continue;
        }

        if (ch === ',') {
          parts.push(current);
          current = '';
          continue;
        }

        current += ch;
      }

      if (current) parts.push(current);

      const out: Record<string, unknown> = {};
      for (const part of parts) {
        const idx = part.indexOf(':');
        if (idx === -1) continue;
        const key = part.slice(0, idx).trim();
        const valueRaw = part.slice(idx + 1).trim();
        if (!key) continue;

        try {
          out[key] = JSON.parse(valueRaw);
        } catch {
          out[key] = valueRaw.replace(/^"(.*)"$/, '$1');
        }
      }

      if (Object.keys(out).length > 0) {
        return out;
      }
    }

    return { args: trimmed };
  }
}

/**
 * Create a Claude Code tool output parser instance
 */
export function createClaudeCodeToolOutputParser(): ClaudeCodeToolOutputParser {
  return new ClaudeCodeToolOutputParser();
}

export const claudeCodeToolOutputParser = new ClaudeCodeToolOutputParser();
