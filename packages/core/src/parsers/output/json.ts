/**
 * JSON output parser
 * Parses JSON output from commands
 */

import type { OutputParser, ParserContext, SemanticOutput } from '../../core/types.js';
import { BaseOutputParser } from '../base.js';

export class JsonOutputParser extends BaseOutputParser<unknown> implements OutputParser<unknown> {
  meta = {
    name: 'json-output',
    description: 'Parses JSON CLI output',
    priority: 80,
    version: '1.0.0',
  };

  canParse(context: ParserContext): boolean {
    const text = context.screenText.trim();

    // Quick check for JSON-like structure
    if (
      (text.startsWith('{') && text.endsWith('}')) ||
      (text.startsWith('[') && text.endsWith(']'))
    ) {
      return true;
    }

    // Check for NDJSON (newline-delimited JSON)
    const lines = text.split('\n');
    if (lines.length > 0 && lines.every(l => !l.trim() || l.trim().startsWith('{'))) {
      return true;
    }

    return false;
  }

  parse(context: ParserContext): SemanticOutput<unknown> | null {
    const text = context.screenText.trim();

    // Try parsing as single JSON
    try {
      const data = JSON.parse(text);
      return this.createOutput('json', text, data, 0.95);
    } catch {
      // Not valid single JSON
    }

    // Try parsing as NDJSON
    try {
      const lines = text.split('\n').filter(l => l.trim());
      const data = lines.map(l => JSON.parse(l));
      if (data.length > 0) {
        return this.createOutput('json', text, data, 0.9);
      }
    } catch {
      // Not valid NDJSON
    }

    // Try to extract JSON from mixed output
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        return this.createOutput('json', jsonMatch[1], data, 0.7);
      } catch {
        // Couldn't parse extracted JSON
      }
    }

    return null;
  }
}

/**
 * Create a JSON output parser instance
 */
export function createJsonOutputParser(): JsonOutputParser {
  return new JsonOutputParser();
}

export const jsonOutputParser = new JsonOutputParser();
