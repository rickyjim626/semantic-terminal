/**
 * Claude Code confirm parser
 * Parses Claude Code tool confirmation dialogs
 */

import type {
  ConfirmParser,
  ParserContext,
  ConfirmInfo,
  ConfirmResponse,
  ToolInfo,
} from '../../core/types.js';
import { BaseConfirmParser } from '../base.js';

export class ClaudeCodeConfirmParser extends BaseConfirmParser implements ConfirmParser {
  meta = {
    name: 'claude-code-confirm',
    description: 'Parses Claude Code tool confirmation dialogs',
    priority: 100,
    version: '1.0.0',
  };

  detectConfirm(context: ParserContext): ConfirmInfo | null {
    const text = context.lastLines.join('\n');

    // Check for options-style confirm (Claude Code tool usage)
    // Format: "❯ 1. Yes" or "  1. Yes" (with optional leading arrow/spaces)
    const isOptionConfirm = /^[\s❯>]*1\.\s*(Yes|Allow)/mi.test(text) && text.includes('Esc to cancel');

    if (isOptionConfirm) {
      const tool = this.parseToolInfo(text);
      const options = this.parseOptions(text);

      return {
        type: 'options',
        prompt: this.extractPrompt(text),
        options,
        tool: tool ?? undefined,
        rawPrompt: text,
      };
    }

    // Check for simple Y/n confirm
    const isYesNoConfirm = /\[Y\/n\]|\(yes\/no\)|Allow\?|Do you want to proceed/i.test(text);

    if (isYesNoConfirm) {
      return {
        type: 'yesno',
        prompt: this.extractPrompt(text),
        options: [
          { key: 'y', label: 'Yes', isDefault: true },
          { key: 'n', label: 'No' },
        ],
        rawPrompt: text,
      };
    }

    return null;
  }

  formatResponse(info: ConfirmInfo, response: ConfirmResponse): string {
    // Claude Code 确认对话框用 ❯ 标记当前选中项，用上下键移动，回车确认
    // 不能直接输入数字，因为可能被其他对话框（如反馈对话框）截获
    switch (response.action) {
      case 'confirm':
        // 第一项已选中，直接回车
        return '\r';
      case 'deny':
        // 移动到第三项（No）再回车：下键两次 + 回车
        return info.type === 'options' ? '\x1b[B\x1b[B\r' : 'n\r';
      case 'select':
        // 移动到指定选项再回车
        if (typeof response.option === 'number' && response.option > 1) {
          const downKeys = '\x1b[B'.repeat(response.option - 1);
          return downKeys + '\r';
        }
        return '\r';
      case 'input':
        return `${response.value}\r`;
      default:
        return '\r';
    }
  }

  /**
   * Parse tool info from confirmation text
   * Format: server - tool_name(params) or server - tool_name(params) (MCP)
   */
  private parseToolInfo(text: string): ToolInfo | null {
    // Support both formats:
    // 1. xjp-mcp - xjp_secret_get(key: "value")
    // 2. xjp-mcp - xjp_secret_get(key: "value") (MCP)
    const toolMatch = text.match(/(\S+)\s*-\s*(\w+)\s*\(([^)]*)\)(?:\s*\(MCP\))?/);
    if (!toolMatch) {
      return null;
    }

    const [, mcpServer, name, paramsStr] = toolMatch;

    // Parse parameters
    const params: Record<string, unknown> = {};
    const paramMatches = paramsStr.matchAll(/(\w+):\s*("[^"]*"|[^,)]+)/g);
    for (const match of paramMatches) {
      const [, key, value] = match;
      // Remove quotes
      params[key] = value.startsWith('"') ? value.slice(1, -1) : value;
    }

    return {
      name,
      mcpServer,
      params,
    };
  }

  /**
   * Parse options from text
   */
  private parseOptions(text: string): ConfirmInfo['options'] {
    const options: ConfirmInfo['options'] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const match = line.match(/^\s*(\d+)\.\s*(.+)$/);
      if (match) {
        options.push({
          key: parseInt(match[1]),
          label: match[2].trim(),
          isDefault: match[1] === '1',
        });
      }
    }

    return options.length > 0 ? options : undefined;
  }

  /**
   * Extract the main prompt/question
   */
  private extractPrompt(text: string): string {
    const lines = text.split('\n');
    const promptLines: string[] = [];

    for (const line of lines) {
      // Stop at options
      if (/^\s*\d+\./.test(line)) break;
      // Stop at [Y/n] type prompts
      if (/\[Y\/n\]|\(yes\/no\)/.test(line)) {
        promptLines.push(line.replace(/\s*\[Y\/n\].*|\s*\(yes\/no\).*/i, '').trim());
        break;
      }
      if (line.trim()) {
        promptLines.push(line.trim());
      }
    }

    return promptLines.join('\n').trim();
  }
}

/**
 * Create a Claude Code confirm parser instance
 */
export function createClaudeCodeConfirmParser(): ClaudeCodeConfirmParser {
  return new ClaudeCodeConfirmParser();
}

export const claudeCodeConfirmParser = new ClaudeCodeConfirmParser();
