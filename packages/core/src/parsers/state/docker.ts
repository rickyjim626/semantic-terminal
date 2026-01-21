/**
 * Docker CLI state parser
 * Detects Docker command execution states
 */

import type { StateParser, ParserContext, StateDetectionResult } from '../../core/types.js';
import { BaseStateParser } from '../base.js';

export class DockerStateParser extends BaseStateParser implements StateParser {
  meta = {
    name: 'docker-state',
    description: 'Detects Docker CLI states',
    priority: 50,
    version: '1.0.0',
  };

  detectState(context: ParserContext): StateDetectionResult | null {
    const text = context.lastLines.join('\n');
    const lastLine = context.lastLines[context.lastLines.length - 1] ?? '';

    // Docker pull/push progress
    if (
      text.includes('Pulling from') ||
      text.includes('Pushing to') ||
      /\d+\.\d+[kMG]B\/\d+\.\d+[kMG]B/.test(text) ||
      text.includes('Waiting') ||
      text.includes('Downloading') ||
      text.includes('Extracting')
    ) {
      return {
        state: 'tool_running',
        confidence: 0.85,
        meta: { operation: 'pull/push' },
      };
    }

    // Docker build progress
    if (
      text.includes('Step ') ||
      text.includes('--->' ) ||
      text.includes('Building') ||
      /^\s*#\d+\s+/.test(text)
    ) {
      return {
        state: 'tool_running',
        confidence: 0.85,
        meta: { operation: 'build' },
      };
    }

    // Docker compose operations
    if (
      text.includes('Creating') ||
      text.includes('Starting') ||
      text.includes('Stopping') ||
      text.includes('Removing') ||
      text.includes('Container') && (text.includes('Started') || text.includes('Stopped'))
    ) {
      return {
        state: 'tool_running',
        confidence: 0.8,
        meta: { operation: 'compose' },
      };
    }

    // Docker errors
    if (
      text.includes('Error response from daemon') ||
      text.includes('Cannot connect to the Docker daemon') ||
      text.includes('no such container') ||
      text.includes('permission denied while trying to connect')
    ) {
      return {
        state: 'error',
        confidence: 0.9,
      };
    }

    // Check if prompt is back (command completed)
    if (/^[❯>$#%]\s*$/.test(lastLine.trim())) {
      return {
        state: 'idle',
        confidence: 0.7,
      };
    }

    return null;
  }
}

/**
 * Create a Docker state parser instance
 */
export function createDockerStateParser(): DockerStateParser {
  return new DockerStateParser();
}

export const dockerStateParser = new DockerStateParser();
