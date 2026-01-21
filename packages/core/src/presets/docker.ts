/**
 * Docker preset
 * Pre-configured parsers for Docker CLI
 */

import type { PresetConfig } from '../core/types.js';
import { dockerStateParser } from '../parsers/state/docker.js';
import { shellStateParser } from '../parsers/state/shell.js';
import { tableOutputParser } from '../parsers/output/table.js';
import { jsonOutputParser } from '../parsers/output/json.js';
import { yesNoConfirmParser } from '../parsers/confirm/yesno.js';

export const DockerPreset: PresetConfig = {
  name: 'docker',
  stateParsers: [
    dockerStateParser,
    shellStateParser,
  ],
  outputParsers: [
    jsonOutputParser,
    tableOutputParser,
  ],
  confirmParsers: [
    yesNoConfirmParser,
  ],
  sessionOptions: {
    cols: 160,  // Docker output can be wide
    rows: 40,
  },
};

/**
 * Create a Docker preset for compose operations
 */
export function createDockerComposePreset(options?: {
  cwd?: string;
  composePath?: string;
}): PresetConfig {
  const args = ['compose'];
  if (options?.composePath) {
    args.push('-f', options.composePath);
  }

  return {
    ...DockerPreset,
    name: 'docker-compose',
    command: 'docker',
    args,
    sessionOptions: {
      ...DockerPreset.sessionOptions,
      cwd: options?.cwd,
    },
  };
}

export default DockerPreset;
