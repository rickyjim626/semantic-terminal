/**
 * Table output parser
 * Parses tabular output from commands like docker ps, kubectl get, ls -l, etc.
 */

import type { OutputParser, ParserContext, SemanticOutput, TableData } from '../../core/types.js';
import { BaseOutputParser } from '../base.js';

export class TableOutputParser extends BaseOutputParser<TableData> implements OutputParser<TableData> {
  meta = {
    name: 'table-output',
    description: 'Parses tabular CLI output',
    priority: 50,
    version: '1.0.0',
  };

  canParse(context: ParserContext): boolean {
    const lines = context.screenText.split('\n').filter(l => l.trim());
    if (lines.length < 2) return false;

    // Check if first line looks like headers (all caps or Title Case)
    const firstLine = lines[0];
    const words = firstLine.trim().split(/\s{2,}/);
    if (words.length < 2) return false;

    // Headers are typically uppercase or have consistent spacing
    const looksLikeHeaders = words.every(w =>
      /^[A-Z][A-Z0-9_\-\s]+$/.test(w) ||  // UPPERCASE
      /^[A-Z][a-z]+/.test(w)               // Title Case
    );

    return looksLikeHeaders;
  }

  parse(context: ParserContext): SemanticOutput<TableData> | null {
    const lines = context.screenText.split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;

    const headerLine = lines[0];
    const headers = this.parseHeaderLine(headerLine);
    if (headers.length < 2) return null;

    const columnPositions = this.detectColumnPositions(headerLine);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Skip separator lines
      if (/^[-=+|]+$/.test(line.trim())) continue;

      const row = this.parseDataLine(line, headers, columnPositions);
      if (Object.keys(row).length > 0) {
        rows.push(row);
      }
    }

    if (rows.length === 0) return null;

    return this.createOutput('table', context.screenText, { headers, rows }, 0.85);
  }

  /**
   * Parse header line into column names
   */
  private parseHeaderLine(line: string): string[] {
    // Split by 2+ spaces
    return line.trim().split(/\s{2,}/).filter(h => h.trim());
  }

  /**
   * Detect column starting positions
   */
  private detectColumnPositions(headerLine: string): number[] {
    const positions: number[] = [0];
    let inSpace = false;
    let spaceStart = 0;

    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i];
      if (char === ' ') {
        if (!inSpace) {
          inSpace = true;
          spaceStart = i;
        }
      } else {
        if (inSpace && i - spaceStart >= 2) {
          positions.push(i);
        }
        inSpace = false;
      }
    }

    return positions;
  }

  /**
   * Parse a data line using detected column positions
   */
  private parseDataLine(
    line: string,
    headers: string[],
    positions: number[]
  ): Record<string, string> {
    const row: Record<string, string> = {};

    for (let i = 0; i < headers.length; i++) {
      const start = positions[i] ?? 0;
      const end = positions[i + 1] ?? line.length;
      const value = line.slice(start, end).trim();
      row[headers[i]] = value;
    }

    return row;
  }
}

/**
 * Create a table output parser instance
 */
export function createTableOutputParser(): TableOutputParser {
  return new TableOutputParser();
}

export const tableOutputParser = new TableOutputParser();
