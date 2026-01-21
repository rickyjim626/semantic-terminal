/**
 * Diff output parser
 * Parses diff/patch output from git diff, diff, etc.
 */

import type { OutputParser, ParserContext, SemanticOutput, DiffData, DiffHunk } from '../../core/types.js';
import { BaseOutputParser } from '../base.js';

export class DiffOutputParser extends BaseOutputParser<DiffData> implements OutputParser<DiffData> {
  meta = {
    name: 'diff-output',
    description: 'Parses diff/patch output',
    priority: 60,
    version: '1.0.0',
  };

  canParse(context: ParserContext): boolean {
    const text = context.screenText;

    // Check for diff markers
    return (
      text.includes('@@') ||
      text.includes('diff --git') ||
      text.includes('--- a/') ||
      text.includes('+++ b/') ||
      /^[+-]{3}\s/.test(text)
    );
  }

  parse(context: ParserContext): SemanticOutput<DiffData> | null {
    const text = context.screenText;
    const lines = text.split('\n');

    let file: string | undefined;
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;

    for (const line of lines) {
      // Extract file name
      if (line.startsWith('diff --git')) {
        const match = line.match(/diff --git a\/(.+) b\//);
        if (match) {
          file = match[1];
        }
      } else if (line.startsWith('--- a/')) {
        file = file ?? line.slice(6);
      }

      // Hunk header
      if (line.startsWith('@@')) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        currentHunk = {
          header: line,
          changes: [],
        };
        continue;
      }

      // Hunk content
      if (currentHunk) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          currentHunk.changes.push({
            type: 'add',
            content: line.slice(1),
          });
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          currentHunk.changes.push({
            type: 'remove',
            content: line.slice(1),
          });
        } else if (line.startsWith(' ')) {
          currentHunk.changes.push({
            type: 'context',
            content: line.slice(1),
          });
        }
      }
    }

    // Push last hunk
    if (currentHunk) {
      hunks.push(currentHunk);
    }

    if (hunks.length === 0) {
      return null;
    }

    return this.createOutput('diff', text, { file, hunks }, 0.9);
  }

  /**
   * Count additions and deletions
   */
  static countChanges(data: DiffData): { additions: number; deletions: number } {
    let additions = 0;
    let deletions = 0;

    for (const hunk of data.hunks) {
      for (const change of hunk.changes) {
        if (change.type === 'add') additions++;
        if (change.type === 'remove') deletions++;
      }
    }

    return { additions, deletions };
  }
}

/**
 * Create a diff output parser instance
 */
export function createDiffOutputParser(): DiffOutputParser {
  return new DiffOutputParser();
}

export const diffOutputParser = new DiffOutputParser();
