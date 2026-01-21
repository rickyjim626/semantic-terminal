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
    const isOptionConfirm = /^\s*1\.\s*(Yes|Allow)/mi.test(text) && text.includes('Esc to cancel');

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
    switch (response.action) {
      case 'confirm':
        return info.type === 'options' ? '1\r' : 'y\r';
      case 'deny':
        return info.type === 'options' ? '3\r' : 'n\r';
      case 'select':
        return `${response.option}\r`;
      case 'input':
        return `${response.value}\r`;
      default:
        return '\r';
    }
  }

  /**
   * Parse tool info from confirmation text
   * Format: server - tool_name(params) (MCP)
   */
  private parseToolInfo(text: string): ToolInfo | null {
    const toolMatch = text.match(/(\S+)\s*-\s*(\w+)\s*\(([^)]*)\)\s*\(MCP\)/);
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
