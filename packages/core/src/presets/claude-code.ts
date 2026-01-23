/**
 * Claude Code preset
 * Pre-configured parsers for Claude Code CLI
 */

import type { PresetConfig } from '../core/types.js';
import { claudeCodeStateParser } from '../parsers/state/claude-code.js';
import { shellStateParser } from '../parsers/state/shell.js';
import { tableOutputParser } from '../parsers/output/table.js';
import { jsonOutputParser } from '../parsers/output/json.js';
import { diffOutputParser } from '../parsers/output/diff.js';
import { claudeCodeStatusParser } from '../parsers/output/claude-code-status.js';
import { claudeCodeContentParser } from '../parsers/output/claude-code-content.js';
import { claudeCodeTitleParser } from '../parsers/output/claude-code-title.js';
import { claudeCodeToolOutputParser } from '../parsers/output/claude-code-tool.js';
import { claudeCodeConfirmParser } from '../parsers/confirm/claude-code.js';
import { yesNoConfirmParser } from '../parsers/confirm/yesno.js';

export const ClaudeCodePreset: PresetConfig = {
  name: 'claude-code',
  stateParsers: [
    claudeCodeStateParser,
    shellStateParser,
  ],
  outputParsers: [
    // Claude Code specific parsers (higher priority)
    claudeCodeStatusParser,
    claudeCodeToolOutputParser,
    claudeCodeContentParser,
    claudeCodeTitleParser,
    // Generic parsers
    jsonOutputParser,
    tableOutputParser,
    diffOutputParser,
  ],
  confirmParsers: [
    claudeCodeConfirmParser,
    yesNoConfirmParser,
  ],
  sessionOptions: {
    cols: 120,
    rows: 30,
  },
};

/**
 * Create a Claude Code preset with custom options
 */
export function createClaudeCodePreset(options?: {
  cwd?: string;
  addDirs?: string[];
}): PresetConfig {
  const args: string[] = [];
  if (options?.addDirs) {
    for (const dir of options.addDirs) {
      args.push('--add-dir', dir);
    }
  }

  return {
    ...ClaudeCodePreset,
    command: 'claude',
    args: args.length > 0 ? args : undefined,
    sessionOptions: {
      ...ClaudeCodePreset.sessionOptions,
      cwd: options?.cwd,
    },
  };
}

export default ClaudeCodePreset;
