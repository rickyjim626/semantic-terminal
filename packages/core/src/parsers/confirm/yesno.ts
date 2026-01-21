/**
 * Generic Yes/No confirm parser
 * Parses common Y/n style confirmations
 */

import type {
  ConfirmParser,
  ParserContext,
  ConfirmInfo,
  ConfirmResponse,
} from '../../core/types.js';
import { BaseConfirmParser } from '../base.js';

export class YesNoConfirmParser extends BaseConfirmParser implements ConfirmParser {
  meta = {
    name: 'yesno-confirm',
    description: 'Parses generic Y/n confirmation prompts',
    priority: 10,
    version: '1.0.0',
  };

  // Common confirmation patterns
  private patterns = [
    { regex: /\[Y\/n\]/i, yesDefault: true },
    { regex: /\[y\/N\]/i, yesDefault: false },
    { regex: /\(yes\/no\)/i, yesDefault: false },
    { regex: /\(Y\/N\)/i, yesDefault: false },
    { regex: /Continue\?\s*\[y\/N\]/i, yesDefault: false },
    { regex: /Are you sure\?/i, yesDefault: false },
    { regex: /Do you want to continue\?/i, yesDefault: false },
    { regex: /Proceed\?/i, yesDefault: false },
    { regex: /Overwrite\?/i, yesDefault: false },
    { regex: /Delete\?/i, yesDefault: false },
  ];

  detectConfirm(context: ParserContext): ConfirmInfo | null {
    const text = context.lastLines.join('\n');
    const lastLine = context.lastLines[context.lastLines.length - 1] ?? '';

    for (const { regex, yesDefault } of this.patterns) {
      if (regex.test(text) || regex.test(lastLine)) {
        // Extract the question
        let prompt = lastLine;
        const match = text.match(new RegExp(`([^\n]*${regex.source}[^\n]*)`, 'i'));
        if (match) {
          prompt = match[1].trim();
        }

        return {
          type: 'yesno',
          prompt,
          options: [
            { key: 'y', label: 'Yes', isDefault: yesDefault },
            { key: 'n', label: 'No', isDefault: !yesDefault },
          ],
          rawPrompt: text,
        };
      }
    }

    return null;
  }

  formatResponse(_info: ConfirmInfo, response: ConfirmResponse): string {
    switch (response.action) {
      case 'confirm':
        return 'y\r';
      case 'deny':
        return 'n\r';
      case 'input':
        if (typeof response.value === 'boolean') {
          return response.value ? 'y\r' : 'n\r';
        }
        return `${response.value}\r`;
      default:
        return '\r';
    }
  }
}

/**
 * Create a Yes/No confirm parser instance
 */
export function createYesNoConfirmParser(): YesNoConfirmParser {
  return new YesNoConfirmParser();
}

export const yesNoConfirmParser = new YesNoConfirmParser();
