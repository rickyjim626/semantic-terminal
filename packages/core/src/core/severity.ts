/**
 * Severity detection and enhanced output utilities
 */

import type {
  SemanticOutput,
  EnhancedSemanticOutput,
  OutputSeverity,
  OutputSuggestion,
  OutputMetadata,
} from './types.js';

// Error patterns and their severities
const ERROR_PATTERNS: Array<{ pattern: RegExp; severity: OutputSeverity; suggestions?: Partial<OutputSuggestion>[] }> = [
  // Critical errors
  { pattern: /FATAL|PANIC|SEGFAULT|SIGSEGV|core dumped/i, severity: 'critical' },
  { pattern: /out of memory|OOM|heap|stack overflow/i, severity: 'critical' },
  { pattern: /permission denied|access denied|EACCES/i, severity: 'critical' },

  // Regular errors
  { pattern: /error:|ERROR|ERR!|failed|failure/i, severity: 'error' },
  { pattern: /exception|throw|reject/i, severity: 'error' },
  { pattern: /cannot find|not found|ENOENT/i, severity: 'error' },
  { pattern: /syntax error|parse error|invalid/i, severity: 'error' },
  { pattern: /timeout|ETIMEDOUT|ECONNREFUSED/i, severity: 'error' },

  // Warnings
  { pattern: /warning:|WARN|deprecated/i, severity: 'warning' },
  { pattern: /caution|notice|attention/i, severity: 'warning' },

  // Success
  { pattern: /success|successfully|completed|done|passed/i, severity: 'success' },
  { pattern: /\b(ok|OK)\b|✓|✔|√/i, severity: 'success' },
];

// Suggestion patterns
const SUGGESTION_PATTERNS: Array<{ pattern: RegExp; suggestion: Partial<OutputSuggestion> }> = [
  // npm/node errors
  {
    pattern: /npm ERR! code ERESOLVE/i,
    suggestion: {
      type: 'fix',
      action: 'npm install --legacy-peer-deps',
      description: 'Use legacy peer dependency resolution',
      confidence: 0.8,
      automated: true,
    },
  },
  {
    pattern: /npm ERR! code E404/i,
    suggestion: {
      type: 'investigate',
      action: 'npm search <package>',
      description: 'Package not found - verify package name',
      confidence: 0.7,
    },
  },
  {
    pattern: /ENOENT.*package\.json/i,
    suggestion: {
      type: 'fix',
      action: 'npm init -y',
      description: 'Initialize package.json',
      confidence: 0.9,
      automated: true,
    },
  },

  // Git errors
  {
    pattern: /not a git repository/i,
    suggestion: {
      type: 'fix',
      action: 'git init',
      description: 'Initialize git repository',
      confidence: 0.9,
      automated: true,
    },
  },
  {
    pattern: /CONFLICT.*Merge conflict/i,
    suggestion: {
      type: 'investigate',
      action: 'git status',
      description: 'Check conflicting files',
      confidence: 0.9,
    },
  },
  {
    pattern: /Your branch is behind/i,
    suggestion: {
      type: 'fix',
      action: 'git pull',
      description: 'Pull latest changes',
      confidence: 0.8,
      automated: true,
    },
  },

  // Permission errors
  {
    pattern: /permission denied|EACCES/i,
    suggestion: {
      type: 'fix',
      action: 'sudo !!',
      description: 'Retry with elevated permissions',
      confidence: 0.6,
    },
  },

  // Network errors
  {
    pattern: /ECONNREFUSED|connection refused/i,
    suggestion: {
      type: 'retry',
      action: '',
      description: 'Check if service is running',
      confidence: 0.7,
    },
  },
  {
    pattern: /ETIMEDOUT|timeout/i,
    suggestion: {
      type: 'retry',
      action: '',
      description: 'Retry the command',
      confidence: 0.6,
      automated: true,
    },
  },

  // TypeScript errors
  {
    pattern: /TS\d+:/,
    suggestion: {
      type: 'investigate',
      action: 'npx tsc --noEmit',
      description: 'Run full type check for details',
      confidence: 0.8,
    },
  },

  // Docker errors
  {
    pattern: /docker.*not found|Cannot connect to Docker/i,
    suggestion: {
      type: 'investigate',
      action: 'docker info',
      description: 'Check Docker daemon status',
      confidence: 0.8,
    },
  },
];

/**
 * Determine severity from raw output text
 */
export function determineSeverity(text: string): OutputSeverity {
  for (const { pattern, severity } of ERROR_PATTERNS) {
    if (pattern.test(text)) {
      return severity;
    }
  }
  return 'info';
}

/**
 * Extract suggestions from raw output text
 */
export function extractSuggestions(text: string): OutputSuggestion[] {
  const suggestions: OutputSuggestion[] = [];

  for (const { pattern, suggestion } of SUGGESTION_PATTERNS) {
    if (pattern.test(text)) {
      suggestions.push({
        type: suggestion.type ?? 'investigate',
        action: suggestion.action ?? '',
        description: suggestion.description ?? '',
        confidence: suggestion.confidence ?? 0.5,
        automated: suggestion.automated,
        requires: suggestion.requires,
      });
    }
  }

  return suggestions;
}

/**
 * Create an enhanced output from a basic semantic output
 */
export function createEnhancedOutput<T>(
  output: SemanticOutput<T>,
  options: {
    session_id?: string;
    command?: string;
    duration_ms?: number;
    exit_code?: number;
  } = {}
): EnhancedSemanticOutput<T> {
  const severity = determineSeverity(output.raw);
  const suggestions = extractSuggestions(output.raw);

  const metadata: OutputMetadata = {
    timestamp: Date.now(),
    session_id: options.session_id,
    command: options.command,
    duration_ms: options.duration_ms,
    exit_code: options.exit_code,
  };

  return {
    ...output,
    severity,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    metadata,
  };
}

/**
 * Check if an output indicates an error state
 */
export function isErrorOutput(output: EnhancedSemanticOutput): boolean {
  return output.severity === 'error' || output.severity === 'critical';
}

/**
 * Check if an output has actionable suggestions
 */
export function hasActionableSuggestions(output: EnhancedSemanticOutput): boolean {
  return output.suggestions?.some(s => s.automated) ?? false;
}

/**
 * Get the best suggestion for automatic execution
 */
export function getBestAutomatedSuggestion(output: EnhancedSemanticOutput): OutputSuggestion | null {
  if (!output.suggestions) return null;

  const automated = output.suggestions
    .filter(s => s.automated && s.action)
    .sort((a, b) => b.confidence - a.confidence);

  return automated[0] ?? null;
}
