/**
 * Claude Code Status Parser
 * Parses status bar information (spinner + status text)
 */

import type {
  OutputParser,
  ParserContext,
  SemanticOutput,
  ClaudeCodeStatus,
} from '../../core/types.js';
import { BaseOutputParser } from '../base.js';

// Spinner characters used by Claude Code
const SPINNER_CHARS = ['·', '✻', '✽', '✶', '✳', '✢'];

// Status text pattern: spinner + text + (esc to interrupt)
// Example: "· Precipitating… (esc to interrupt · thinking)"
// Example: "✻ Schlepping… (esc to interrupt)"
const STATUS_PATTERN = /^([·✻✽✶✳✢])\s+(\S+…?)\s*\((?:esc|ESC)\s+to\s+interrupt(?:\s*·\s*(\w+))?\)/;

export class ClaudeCodeStatusParser extends BaseOutputParser<ClaudeCodeStatus> implements OutputParser<ClaudeCodeStatus> {
  meta = {
    name: 'claude-code-status',
    description: 'Parses Claude Code status bar (spinner + status text)',
    priority: 95,
    version: '1.0.0',
  };

  canParse(context: ParserContext): boolean {
    const lastLines = context.lastLines;
    return lastLines.some(line => STATUS_PATTERN.test(line.trim()));
  }

  parse(context: ParserContext): SemanticOutput<ClaudeCodeStatus> | null {
    const lastLines = context.lastLines;

    for (const line of lastLines) {
      const trimmed = line.trim();
      const match = trimmed.match(STATUS_PATTERN);

      if (match) {
        const [, spinner, statusText, phaseHint] = match;

        // Determine phase from hint or status text
        let phase: ClaudeCodeStatus['phase'] = 'unknown';
        if (phaseHint === 'thinking') {
          phase = 'thinking';
        } else if (statusText.toLowerCase().includes('tool') || phaseHint === 'tool') {
          phase = 'tool_running';
        } else if (SPINNER_CHARS.includes(spinner)) {
          // Default to thinking if spinner is active
          phase = 'thinking';
        }

        const data: ClaudeCodeStatus = {
          spinner,
          statusText,
          phase,
          interruptible: true, // Always true when "esc to interrupt" is shown
        };

        return this.createOutput('claude-status', trimmed, data, 0.95);
      }
    }

    return null;
  }
}

/**
 * Create a Claude Code status parser instance
 */
export function createClaudeCodeStatusParser(): ClaudeCodeStatusParser {
  return new ClaudeCodeStatusParser();
}

export const claudeCodeStatusParser = new ClaudeCodeStatusParser();
