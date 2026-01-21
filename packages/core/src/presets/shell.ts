/**
 * Shell preset
 * Pre-configured parsers for generic shell sessions
 */

import type { PresetConfig } from '../core/types.js';
import { shellStateParser } from '../parsers/state/shell.js';
import { tableOutputParser } from '../parsers/output/table.js';
import { jsonOutputParser } from '../parsers/output/json.js';
import { diffOutputParser } from '../parsers/output/diff.js';
import { yesNoConfirmParser } from '../parsers/confirm/yesno.js';

export const ShellPreset: PresetConfig = {
  name: 'shell',
  stateParsers: [
    shellStateParser,
  ],
  outputParsers: [
    jsonOutputParser,
    tableOutputParser,
    diffOutputParser,
  ],
  confirmParsers: [
    yesNoConfirmParser,
  ],
  sessionOptions: {
    cols: 120,
    rows: 30,
  },
};

/**
 * Create a shell preset with specific shell
 */
export function createShellPreset(options?: {
  shell?: 'bash' | 'zsh' | 'sh' | 'fish';
  cwd?: string;
  env?: Record<string, string>;
}): PresetConfig {
  const shellPath = options?.shell
    ? `/bin/${options.shell}`
    : process.env.SHELL ?? '/bin/zsh';

  return {
    ...ShellPreset,
    sessionOptions: {
      ...ShellPreset.sessionOptions,
      shell: shellPath,
      cwd: options?.cwd,
      env: options?.env,
    },
  };
}

/**
 * Create a preset for running a specific command
 */
export function createCommandPreset(
  command: string,
  args?: string[],
  options?: {
    cwd?: string;
    env?: Record<string, string>;
  }
): PresetConfig {
  return {
    ...ShellPreset,
    name: `command:${command}`,
    command,
    args,
    sessionOptions: {
      ...ShellPreset.sessionOptions,
      cwd: options?.cwd,
      env: options?.env,
    },
  };
}

export default ShellPreset;
