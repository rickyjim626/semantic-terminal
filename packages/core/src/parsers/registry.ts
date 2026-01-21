/**
 * Parser Registry - manages parser registration and lookup
 */

import type {
  StateParser,
  OutputParser,
  ConfirmParser,
  ParserContext,
  StateDetectionResult,
  SemanticOutput,
  ConfirmInfo,
} from '../core/types.js';

export class ParserRegistry {
  private stateParsers: StateParser[] = [];
  private outputParsers: OutputParser[] = [];
  private confirmParsers: ConfirmParser[] = [];

  /**
   * Register a state parser
   */
  registerStateParser(parser: StateParser): this {
    this.stateParsers.push(parser);
    this.sortByPriority(this.stateParsers);
    return this;
  }

  /**
   * Register multiple state parsers
   */
  registerStateParsers(parsers: StateParser[]): this {
    this.stateParsers.push(...parsers);
    this.sortByPriority(this.stateParsers);
    return this;
  }

  /**
   * Register an output parser
   */
  registerOutputParser(parser: OutputParser): this {
    this.outputParsers.push(parser);
    this.sortByPriority(this.outputParsers);
    return this;
  }

  /**
   * Register multiple output parsers
   */
  registerOutputParsers(parsers: OutputParser[]): this {
    this.outputParsers.push(...parsers);
    this.sortByPriority(this.outputParsers);
    return this;
  }

  /**
   * Register a confirm parser
   */
  registerConfirmParser(parser: ConfirmParser): this {
    this.confirmParsers.push(parser);
    this.sortByPriority(this.confirmParsers);
    return this;
  }

  /**
   * Register multiple confirm parsers
   */
  registerConfirmParsers(parsers: ConfirmParser[]): this {
    this.confirmParsers.push(...parsers);
    this.sortByPriority(this.confirmParsers);
    return this;
  }

  /**
   * Unregister a parser by name
   */
  unregister(name: string): this {
    this.stateParsers = this.stateParsers.filter(p => p.meta.name !== name);
    this.outputParsers = this.outputParsers.filter(p => p.meta.name !== name);
    this.confirmParsers = this.confirmParsers.filter(p => p.meta.name !== name);
    return this;
  }

  /**
   * Clear all parsers
   */
  clear(): this {
    this.stateParsers = [];
    this.outputParsers = [];
    this.confirmParsers = [];
    return this;
  }

  /**
   * Detect state using registered parsers
   * Returns the first successful detection with highest confidence
   */
  detectState(context: ParserContext): StateDetectionResult | null {
    let bestResult: StateDetectionResult | null = null;
    let bestConfidence = 0;

    for (const parser of this.stateParsers) {
      try {
        const result = parser.detectState(context);
        if (result && result.confidence > bestConfidence) {
          bestResult = result;
          bestConfidence = result.confidence;
        }
      } catch {
        // Skip failed parsers
      }
    }

    return bestResult;
  }

  /**
   * Parse output using registered parsers
   * Returns the first successful parse with highest confidence
   */
  parseOutput(context: ParserContext): SemanticOutput | null {
    let bestResult: SemanticOutput | null = null;
    let bestConfidence = 0;

    for (const parser of this.outputParsers) {
      try {
        if (parser.canParse(context)) {
          const result = parser.parse(context);
          if (result && result.confidence > bestConfidence) {
            bestResult = result;
            bestConfidence = result.confidence;
          }
        }
      } catch {
        // Skip failed parsers
      }
    }

    return bestResult;
  }

  /**
   * Detect confirmation dialog using registered parsers
   * Returns the first successful detection
   */
  detectConfirm(context: ParserContext): { info: ConfirmInfo; parser: ConfirmParser } | null {
    for (const parser of this.confirmParsers) {
      try {
        const info = parser.detectConfirm(context);
        if (info) {
          return { info, parser };
        }
      } catch {
        // Skip failed parsers
      }
    }

    return null;
  }

  /**
   * Get all registered state parsers
   */
  getStateParsers(): StateParser[] {
    return [...this.stateParsers];
  }

  /**
   * Get all registered output parsers
   */
  getOutputParsers(): OutputParser[] {
    return [...this.outputParsers];
  }

  /**
   * Get all registered confirm parsers
   */
  getConfirmParsers(): ConfirmParser[] {
    return [...this.confirmParsers];
  }

  /**
   * Sort parsers by priority (higher first)
   */
  private sortByPriority<T extends { meta: { priority?: number } }>(parsers: T[]): void {
    parsers.sort((a, b) => (b.meta.priority ?? 0) - (a.meta.priority ?? 0));
  }
}

/**
 * Create a new parser registry
 */
export function createRegistry(): ParserRegistry {
  return new ParserRegistry();
}

/**
 * Default global registry
 */
export const defaultRegistry = new ParserRegistry();
