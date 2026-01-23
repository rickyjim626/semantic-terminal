/**
 * Claude Code Content Parser
 * Parses Claude's text responses (lines starting with ⏺)
 */

import type {
  OutputParser,
  ParserContext,
  SemanticOutput,
  ClaudeCodeContent,
} from '../../core/types.js';
import { BaseOutputParser } from '../base.js';

// Claude response marker
const RESPONSE_MARKER = '⏺';

// Separator line pattern (used to detect response boundaries)
const SEPARATOR_PATTERN = /^[─━═]+$/;

export class ClaudeCodeContentParser extends BaseOutputParser<ClaudeCodeContent> implements OutputParser<ClaudeCodeContent> {
  meta = {
    name: 'claude-code-content',
    description: 'Parses Claude Code text responses',
    priority: 90,
    version: '1.0.0',
  };

  canParse(context: ParserContext): boolean {
    // Check if any line starts with the response marker
    return context.lastLines.some(line => line.trim().startsWith(RESPONSE_MARKER));
  }

  parse(context: ParserContext): SemanticOutput<ClaudeCodeContent> | null {
    const lines = context.screenText.split('\n');
    const contentLines: string[] = [];
    let inResponse = false;
    let foundSeparator = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Response starts with ⏺
      if (trimmed.startsWith(RESPONSE_MARKER)) {
        inResponse = true;
        // Remove the marker and leading space
        const content = trimmed.slice(RESPONSE_MARKER.length).trim();
        if (content) {
          contentLines.push(content);
        }
        continue;
      }

      if (inResponse) {
        // Check for separator (end of response)
        if (SEPARATOR_PATTERN.test(trimmed)) {
          foundSeparator = true;
          break;
        }

        // Check for prompt (end of response)
        if (trimmed.startsWith('❯') || trimmed.startsWith('>')) {
          break;
        }

        // Continue collecting content
        // Handle indented continuation lines (tool outputs have │ prefix)
        if (trimmed.startsWith('│')) {
          // This is likely tool output, not text content
          continue;
        }

        if (trimmed.length > 0) {
          contentLines.push(trimmed);
        }
      }
    }

    if (contentLines.length === 0) {
      return null;
    }

    const content = contentLines.join('\n').trim();

    const data: ClaudeCodeContent = {
      role: 'assistant',
      content,
      isComplete: foundSeparator,
    };

    return this.createOutput('claude-content', content, data, 0.9);
  }
}

/**
 * Create a Claude Code content parser instance
 */
export function createClaudeCodeContentParser(): ClaudeCodeContentParser {
  return new ClaudeCodeContentParser();
}

export const claudeCodeContentParser = new ClaudeCodeContentParser();
