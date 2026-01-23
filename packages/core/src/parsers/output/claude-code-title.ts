/**
 * Claude Code Title Parser
 * Parses terminal title information (from OSC sequence or context.terminalTitle)
 */

import type {
  OutputParser,
  ParserContext,
  SemanticOutput,
  ClaudeCodeTitle,
} from '../../core/types.js';
import { BaseOutputParser } from '../base.js';

// Braille spinner characters (used in terminal title)
const BRAILLE_SPINNERS = ['⠐', '⠂', '⠈', '⠁', '⠉', '⠃', '⠋', '⠓', '⠒', '⠖', '⠦', '⠤'];

// Other spinner indicators
const OTHER_SPINNERS = ['✳', '✻', '✽', '✶', '✢', '·'];

// All spinner characters
const ALL_SPINNERS = [...BRAILLE_SPINNERS, ...OTHER_SPINNERS];

// Title pattern: spinner + task name
// Example: "⠐ Initial Greeting"
// Example: "✳ Claude Code"
const TITLE_PATTERN = new RegExp(`^([${ALL_SPINNERS.join('')}])\\s*(.*)$`);

export class ClaudeCodeTitleParser extends BaseOutputParser<ClaudeCodeTitle> implements OutputParser<ClaudeCodeTitle> {
  meta = {
    name: 'claude-code-title',
    description: 'Parses Claude Code terminal title',
    priority: 85,
    version: '1.0.0',
  };

  canParse(context: ParserContext): boolean {
    // Only parse if terminalTitle is provided
    return !!context.terminalTitle;
  }

  parse(context: ParserContext): SemanticOutput<ClaudeCodeTitle> | null {
    const title = context.terminalTitle;
    if (!title) {
      return null;
    }

    const match = title.match(TITLE_PATTERN);

    if (match) {
      const [, spinnerState, taskName] = match;

      // Determine if processing based on spinner type
      const isProcessing = BRAILLE_SPINNERS.includes(spinnerState) ||
        (OTHER_SPINNERS.includes(spinnerState) && spinnerState !== '✳');

      const data: ClaudeCodeTitle = {
        taskName: taskName.trim() || null,
        spinnerState,
        isProcessing,
      };

      return this.createOutput('claude-title', title, data, 0.95);
    }

    // No spinner, just a static title
    const data: ClaudeCodeTitle = {
      taskName: title.trim() || null,
      spinnerState: '',
      isProcessing: false,
    };

    return this.createOutput('claude-title', title, data, 0.7);
  }
}

/**
 * Create a Claude Code title parser instance
 */
export function createClaudeCodeTitleParser(): ClaudeCodeTitleParser {
  return new ClaudeCodeTitleParser();
}

export const claudeCodeTitleParser = new ClaudeCodeTitleParser();
