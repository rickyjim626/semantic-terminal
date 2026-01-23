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

// Tool header pattern: ⏺ ToolName or ⏺ ToolName (completed in Xs)
// Example: "⏺ Bash"
// Example: "⏺ Read"
// Example: "⏺ Bash (completed in 0.5s)"
const TOOL_HEADER_PATTERN = /^⏺\s+(\w+)(?:\s+\(completed\s+in\s+([\d.]+)s?\))?$/;

// Tool parameter line pattern: │ key: value
// Example: "  │ command: \"git status\""
// Example: "  │ file_path: \"/path/to/file\""
const PARAM_LINE_PATTERN = /^\s*│\s*(\w+):\s*(.+)$/;

// Known tool names
const KNOWN_TOOLS = [
  'Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep',
  'WebFetch', 'WebSearch', 'Task', 'LSP', 'NotebookEdit',
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
    return context.lastLines.some(line => TOOL_HEADER_PATTERN.test(line.trim()));
  }

  parse(context: ParserContext): SemanticOutput<ClaudeCodeToolOutput> | null {
    const lines = context.lastLines;
    let toolName: string | null = null;
    let duration: number | undefined;
    const params: Record<string, unknown> = {};
    const outputLines: string[] = [];
    let inToolBlock = false;
    let rawLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for tool header
      const headerMatch = trimmed.match(TOOL_HEADER_PATTERN);
      if (headerMatch) {
        toolName = headerMatch[1];
        if (headerMatch[2]) {
          duration = parseFloat(headerMatch[2]) * 1000; // Convert to ms
        }
        inToolBlock = true;
        rawLines.push(line);
        continue;
      }

      if (inToolBlock) {
        // Check for parameter line
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

        // End of tool block
        if (trimmed.length > 0 && !trimmed.startsWith('│')) {
          break;
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
}

/**
 * Create a Claude Code tool output parser instance
 */
export function createClaudeCodeToolOutputParser(): ClaudeCodeToolOutputParser {
  return new ClaudeCodeToolOutputParser();
}

export const claudeCodeToolOutputParser = new ClaudeCodeToolOutputParser();
