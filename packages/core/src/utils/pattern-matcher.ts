/**
 * Pattern matching utilities for tool names and text
 */

/**
 * Match a pattern against a value
 * Supports:
 * - Exact match: "foo" matches "foo"
 * - Wildcard all: "*" matches anything
 * - Prefix wildcard: "xjp_*" matches "xjp_secret_get"
 * - Suffix wildcard: "*_delete" matches "xjp_secret_delete"
 * - Middle wildcard: "xjp_*_get" matches "xjp_secret_get"
 */
export function matchPattern(pattern: string, value: string): boolean {
  // Exact match
  if (pattern === value) {
    return true;
  }

  // Wildcard all
  if (pattern === '*') {
    return true;
  }

  // Prefix wildcard: xjp_*
  if (pattern.endsWith('*') && !pattern.startsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return value.startsWith(prefix);
  }

  // Suffix wildcard: *_delete
  if (pattern.startsWith('*') && !pattern.endsWith('*')) {
    const suffix = pattern.slice(1);
    return value.endsWith(suffix);
  }

  // Middle wildcard or multiple wildcards: xjp_*_get
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(value);
  }

  return false;
}

/**
 * Match a value against multiple patterns
 * Returns true if any pattern matches
 */
export function matchPatterns(patterns: string[], value: string): boolean {
  return patterns.some(pattern => matchPattern(pattern, value));
}

/**
 * Find the first matching pattern
 * Returns the pattern that matched, or null
 */
export function findMatchingPattern(patterns: string[], value: string): string | null {
  for (const pattern of patterns) {
    if (matchPattern(pattern, value)) {
      return pattern;
    }
  }
  return null;
}

/**
 * Convert a glob-like pattern to a regular expression
 */
export function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape special regex chars
    .replace(/\*/g, '.*')                    // Convert * to .*
    .replace(/\?/g, '.');                    // Convert ? to .
  return new RegExp(`^${escaped}$`);
}
