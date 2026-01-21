/**
 * Claude Code state parser
 * Detects Claude Code CLI states from terminal output
 */

import type { StateParser, ParserContext, StateDetectionResult } from '../../core/types.js';
import { BaseStateParser } from '../base.js';

export class ClaudeCodeStateParser extends BaseStateParser implements StateParser {
  meta = {
    name: 'claude-code-state',
    description: 'Detects Claude Code CLI states',
    priority: 100,
    version: '1.0.0',
  };

  detectState(context: ParserContext): StateDetectionResult | null {
    const lastLines = context.lastLines.join('\n');
    const text = lastLines;

    // Check for trust dialog during startup (auto-confirm)
    if (context.currentState === 'starting') {
      if (text.includes('Yes, proceed') && text.includes('Enter to confirm')) {
        return {
          state: 'starting',
          confidence: 0.95,
          meta: { needsTrustConfirm: true },
        };
      }
    }

    // Check for running state (spinner visible)
    const isRunning = text.includes('esc to interrupt');

    // Check for confirmation dialog
    const isOptionConfirm = /^\s*1\.\s*(Yes|Allow)/mi.test(text) && text.includes('Esc to cancel');
    const isYesNoConfirm = /\[Y\/n\]|\(yes\/no\)|Allow\?|Do you want to proceed/i.test(text);

    if (isOptionConfirm || isYesNoConfirm) {
      return {
        state: 'confirming',
        confidence: 0.95,
        meta: { confirmType: isOptionConfirm ? 'options' : 'yesno' },
      };
    }

    // Check for busy state (running tools/thinking)
    if (isRunning) {
      // Determine if thinking or tool_running
      if (text.includes('Tool:') || text.includes('⏺') && text.includes('│')) {
        return {
          state: 'tool_running',
          confidence: 0.85,
        };
      }
      return {
        state: 'thinking',
        confidence: 0.9,
      };
    }

    // Check for idle state (prompt visible, no running indicator)
    // Match prompt: ❯ or > at start of line (with optional trailing space/content)
    const hasPrompt = context.lastLines.some(line => /^[❯>]\s*/.test(line.trim()));
    if (hasPrompt && !isRunning) {
      return {
        state: 'idle',
        confidence: 0.9,
      };
    }

    // Check for error state
    if (text.includes('Error:') || text.includes('error:') || text.includes('✖')) {
      return {
        state: 'error',
        confidence: 0.7,
      };
    }

    return null;
  }
}

/**
 * Create a Claude Code state parser instance
 */
export function createClaudeCodeStateParser(): ClaudeCodeStateParser {
  return new ClaudeCodeStateParser();
}

export const claudeCodeStateParser = new ClaudeCodeStateParser();
