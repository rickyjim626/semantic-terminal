/**
 * Fingerprint Registry - Centralized pattern management for terminal output parsing
 */

import type { ParserContext } from './types.js';

// ========== Types ==========

export type FingerprintType = 'regex' | 'enum' | 'string' | 'marker';

export type FingerprintCategory =
  | 'spinner' | 'statusbar' | 'prompt' | 'separator'
  | 'assistant' | 'tool' | 'error' | 'confirm';

export interface Fingerprint {
  id: string;
  type: FingerprintType;
  category: FingerprintCategory;
  pattern: RegExp | string | string[];
  confidence: number;
  priority: number;
  source: string;
}

export interface FingerprintMatch {
  fingerprint: Fingerprint;
  matched: boolean;
  captures?: string[];
  lineIndex?: number;
}

export interface FingerprintResult {
  matches: Map<string, FingerprintMatch>;
  categories: Map<FingerprintCategory, FingerprintMatch[]>;
  hints: {
    hasSpinner: boolean;
    hasPrompt: boolean;
    hasToolOutput: boolean;
    hasConfirmDialog: boolean;
    hasError: boolean;
  };
}

// ========== Registry ==========

export class FingerprintRegistry {
  private fingerprints: Map<string, Fingerprint> = new Map();
  private byCategory: Map<FingerprintCategory, Fingerprint[]> = new Map();

  register(fp: Fingerprint): void {
    this.fingerprints.set(fp.id, fp);

    const catList = this.byCategory.get(fp.category) ?? [];
    catList.push(fp);
    catList.sort((a, b) => b.priority - a.priority);
    this.byCategory.set(fp.category, catList);
  }

  registerAll(fps: Fingerprint[]): void {
    fps.forEach(fp => this.register(fp));
  }

  get(id: string): Fingerprint | undefined {
    return this.fingerprints.get(id);
  }

  getByCategory(category: FingerprintCategory): Fingerprint[] {
    return this.byCategory.get(category) ?? [];
  }

  /**
   * Extract fingerprints from parser context
   */
  extract(context: ParserContext): FingerprintResult {
    const matches = new Map<string, FingerprintMatch>();
    const categories = new Map<FingerprintCategory, FingerprintMatch[]>();

    for (const [id, fp] of this.fingerprints) {
      const match = this.matchFingerprint(fp, context);
      matches.set(id, match);

      if (match.matched) {
        const catMatches = categories.get(fp.category) ?? [];
        catMatches.push(match);
        categories.set(fp.category, catMatches);
      }
    }

    return {
      matches,
      categories,
      hints: {
        hasSpinner: (categories.get('spinner')?.length ?? 0) > 0,
        hasPrompt: (categories.get('prompt')?.length ?? 0) > 0,
        hasToolOutput: (categories.get('tool')?.length ?? 0) > 0,
        hasConfirmDialog: (categories.get('confirm')?.length ?? 0) > 0,
        hasError: (categories.get('error')?.length ?? 0) > 0,
      },
    };
  }

  private matchFingerprint(fp: Fingerprint, context: ParserContext): FingerprintMatch {
    const lines = context.lastLines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (fp.type === 'regex' && fp.pattern instanceof RegExp) {
        const match = line.match(fp.pattern);
        if (match) {
          return { fingerprint: fp, matched: true, captures: match.slice(1), lineIndex: i };
        }
      } else if (fp.type === 'string' && typeof fp.pattern === 'string') {
        if (line.includes(fp.pattern)) {
          return { fingerprint: fp, matched: true, lineIndex: i };
        }
      } else if ((fp.type === 'enum' || fp.type === 'marker') && Array.isArray(fp.pattern)) {
        for (const p of fp.pattern) {
          if (line.includes(p)) {
            return { fingerprint: fp, matched: true, captures: [p], lineIndex: i };
          }
        }
      }
    }

    // Also check screenText for string patterns
    if (fp.type === 'string' && typeof fp.pattern === 'string') {
      if (context.screenText.includes(fp.pattern)) {
        return { fingerprint: fp, matched: true };
      }
    }

    return { fingerprint: fp, matched: false };
  }

  clear(): void {
    this.fingerprints.clear();
    this.byCategory.clear();
  }
}

// Default singleton registry
export const defaultFingerprintRegistry = new FingerprintRegistry();
