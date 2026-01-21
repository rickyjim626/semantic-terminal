/**
 * Generic shell state parser
 * Detects common shell states (bash, zsh, etc.)
 */

import type { StateParser, ParserContext, StateDetectionResult } from '../../core/types.js';
import { BaseStateParser } from '../base.js';

export class ShellStateParser extends BaseStateParser implements StateParser {
  meta = {
    name: 'shell-state',
    description: 'Detects generic shell states',
    priority: 10,
    version: '1.0.0',
  };

  // Common shell prompts
  private promptPatterns = [
    /^[❯>$#%]\s*$/,           // Simple prompts: ❯ > $ # %
    /\$\s*$/,                  // bash-style: user@host:~$
    />\s*$/,                   // zsh/powershell: >
    /^.*@.*:\s*[~\/].*[$#]\s*$/,  // Full bash prompt: user@host:~/path$
    /^\(\w+\)\s*[$#>]\s*$/,   // With virtualenv: (env) $
  ];

  // Patterns indicating command is running
  private runningPatterns = [
    /\[running\]/i,
    /\.\.\./,                  // Loading dots
    /^.*\s*⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/,  // Spinner
  ];

  detectState(context: ParserContext): StateDetectionResult | null {
    const lastLine = context.lastLines[context.lastLines.length - 1] ?? '';
    const text = context.lastLines.join('\n');

    // Check for command running indicators
    for (const pattern of this.runningPatterns) {
      if (pattern.test(text)) {
        return {
          state: 'tool_running',
          confidence: 0.6,
        };
      }
    }

    // Check for shell prompt (idle state)
    for (const pattern of this.promptPatterns) {
      if (pattern.test(lastLine.trim())) {
        return {
          state: 'idle',
          confidence: 0.7,
        };
      }
    }

    // Check for common error patterns
    if (
      text.includes('command not found') ||
      text.includes('No such file or directory') ||
      text.includes('Permission denied') ||
      /^bash:|^zsh:|^sh:/.test(text)
    ) {
      return {
        state: 'error',
        confidence: 0.8,
      };
    }

    return null;
  }
}

/**
 * Create a shell state parser instance
 */
export function createShellStateParser(): ShellStateParser {
  return new ShellStateParser();
}

export const shellStateParser = new ShellStateParser();
