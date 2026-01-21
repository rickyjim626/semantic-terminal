/**
 * Base parser classes and utilities
 */

import type {
  ParserMeta,
  ParserContext,
  StateParser,
  StateDetectionResult,
  OutputParser,
  SemanticOutput,
  ConfirmParser,
  ConfirmInfo,
  ConfirmResponse,
} from '../core/types.js';

/**
 * Abstract base class for state parsers
 */
export abstract class BaseStateParser implements StateParser {
  abstract meta: ParserMeta;
  abstract detectState(context: ParserContext): StateDetectionResult | null;

  /**
   * Helper to check if text contains any of the patterns
   */
  protected containsAny(text: string, patterns: string[]): boolean {
    return patterns.some(p => text.includes(p));
  }

  /**
   * Helper to check if any line matches a regex
   */
  protected anyLineMatches(lines: string[], pattern: RegExp): boolean {
    return lines.some(line => pattern.test(line));
  }

  /**
   * Helper to find a line matching a regex
   */
  protected findLine(lines: string[], pattern: RegExp): string | null {
    return lines.find(line => pattern.test(line)) ?? null;
  }
}

/**
 * Abstract base class for output parsers
 */
export abstract class BaseOutputParser<T = unknown> implements OutputParser<T> {
  abstract meta: ParserMeta;
  abstract canParse(context: ParserContext): boolean;
  abstract parse(context: ParserContext): SemanticOutput<T> | null;

  /**
   * Create a semantic output object
   */
  protected createOutput(
    type: SemanticOutput['type'],
    raw: string,
    data: T,
    confidence: number
  ): SemanticOutput<T> {
    return {
      type,
      raw,
      data,
      confidence,
      parser: this.meta.name,
    };
  }
}

/**
 * Abstract base class for confirm parsers
 */
export abstract class BaseConfirmParser implements ConfirmParser {
  abstract meta: ParserMeta;
  abstract detectConfirm(context: ParserContext): ConfirmInfo | null;
  abstract formatResponse(info: ConfirmInfo, response: ConfirmResponse): string;

  /**
   * Helper to extract text between patterns
   */
  protected extractBetween(text: string, start: string, end: string): string | null {
    const startIdx = text.indexOf(start);
    if (startIdx === -1) return null;
    const endIdx = text.indexOf(end, startIdx + start.length);
    if (endIdx === -1) return null;
    return text.slice(startIdx + start.length, endIdx);
  }
}

/**
 * Create a simple state parser from a detection function
 */
export function createStateParser(
  name: string,
  detect: (context: ParserContext) => StateDetectionResult | null,
  options?: Partial<ParserMeta>
): StateParser {
  return {
    meta: {
      name,
      ...options,
    },
    detectState: detect,
  };
}

/**
 * Create a simple output parser from can/parse functions
 */
export function createOutputParser<T>(
  name: string,
  canParse: (context: ParserContext) => boolean,
  parse: (context: ParserContext) => SemanticOutput<T> | null,
  options?: Partial<ParserMeta>
): OutputParser<T> {
  return {
    meta: {
      name,
      ...options,
    },
    canParse,
    parse,
  };
}

/**
 * Create a simple confirm parser
 */
export function createConfirmParser(
  name: string,
  detect: (context: ParserContext) => ConfirmInfo | null,
  format: (info: ConfirmInfo, response: ConfirmResponse) => string,
  options?: Partial<ParserMeta>
): ConfirmParser {
  return {
    meta: {
      name,
      ...options,
    },
    detectConfirm: detect,
    formatResponse: format,
  };
}
