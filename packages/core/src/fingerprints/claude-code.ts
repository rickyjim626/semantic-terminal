/**
 * Claude Code Fingerprints
 * Pattern definitions for Claude Code CLI output parsing
 */

import type { Fingerprint } from '../core/fingerprint.js';

export const claudeCodeFingerprints: Fingerprint[] = [
  // ========== Spinners ==========
  {
    id: 'claude-code.spinner.status',
    type: 'enum',
    category: 'spinner',
    pattern: ['·', '✻', '✽', '✶', '✳', '✢'],
    confidence: 0.95,
    priority: 100,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.spinner.braille',
    type: 'enum',
    category: 'spinner',
    pattern: ['⠐', '⠂', '⠈', '⠁', '⠉', '⠃', '⠋', '⠓', '⠒', '⠖', '⠦', '⠤'],
    confidence: 0.95,
    priority: 100,
    source: 'claude-code-v1.0',
  },

  // ========== Status Bar ==========
  {
    id: 'claude-code.statusbar.pattern',
    type: 'regex',
    category: 'statusbar',
    pattern: /^([·✻✽✶✳✢])\s+(\S+…?)\s*\((?:esc|ESC)\s+to\s+interrupt(?:\s*·\s*(\w+))?\)/,
    confidence: 0.95,
    priority: 95,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.statusbar.running',
    type: 'string',
    category: 'statusbar',
    pattern: 'esc to interrupt',
    confidence: 0.90,
    priority: 90,
    source: 'claude-code-v1.0',
  },

  // ========== Prompts ==========
  {
    id: 'claude-code.prompt.input',
    type: 'regex',
    category: 'prompt',
    pattern: /^[❯>]\s*$/,
    confidence: 0.90,
    priority: 90,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.prompt.with-text',
    type: 'regex',
    category: 'prompt',
    pattern: /^[❯>]\s+.+/,
    confidence: 0.85,
    priority: 85,
    source: 'claude-code-v1.0',
  },

  // ========== Markers ==========
  {
    id: 'claude-code.marker.response',
    type: 'string',
    category: 'assistant',
    pattern: '⏺',
    confidence: 0.95,
    priority: 90,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.marker.separator',
    type: 'regex',
    category: 'separator',
    pattern: /^[─━═]+$/,
    confidence: 0.90,
    priority: 80,
    source: 'claude-code-v1.0',
  },

  // ========== Tool Output ==========
  {
    id: 'claude-code.tool.header',
    type: 'regex',
    category: 'tool',
    pattern: /^⏺\s+(\w+)(?:\s+\(completed\s+in\s+([\d.]+)s?\))?$/,
    confidence: 0.95,
    priority: 92,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.tool.inline-header',
    type: 'regex',
    category: 'tool',
    pattern: /^⏺\s+(\w+)\(.+\)$/,
    confidence: 0.90,
    priority: 92,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.tool.param',
    type: 'regex',
    category: 'tool',
    pattern: /^\s*│\s*(\w+):\s*(.+)$/,
    confidence: 0.90,
    priority: 90,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.tool.output-line',
    type: 'regex',
    category: 'tool',
    pattern: /^\s*│\s+(.+)$/,
    confidence: 0.85,
    priority: 85,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.tool.inline-output-line',
    type: 'regex',
    category: 'tool',
    pattern: /^\s*⎿\s+.+$/,
    confidence: 0.85,
    priority: 85,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.tool.known-names',
    type: 'enum',
    category: 'tool',
    pattern: ['Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Task', 'LSP', 'NotebookEdit', 'TodoRead', 'TodoWrite'],
    confidence: 0.95,
    priority: 92,
    source: 'claude-code-v1.0',
  },

  // ========== Confirm Dialog ==========
  {
    id: 'claude-code.confirm.numbered-option',
    type: 'regex',
    category: 'confirm',
    pattern: /^\s*(\d+)\.\s+(.+)$/,
    confidence: 0.85,
    priority: 85,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.confirm.yes-option',
    type: 'regex',
    category: 'confirm',
    pattern: /^\s*1\.\s+Yes,?\s/i,
    confidence: 0.90,
    priority: 88,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.confirm.no-option',
    type: 'regex',
    category: 'confirm',
    pattern: /^\s*\d+\.\s+No,?\s/i,
    confidence: 0.90,
    priority: 88,
    source: 'claude-code-v1.0',
  },

  // ========== Error Markers ==========
  {
    id: 'claude-code.error.keywords',
    type: 'enum',
    category: 'error',
    pattern: ['Error:', 'error:', 'ERROR:', '✖', 'ENOENT', 'EPERM', 'EACCES', 'failed', 'Failed'],
    confidence: 0.85,
    priority: 80,
    source: 'claude-code-v1.0',
  },
  {
    id: 'claude-code.error.stack-trace',
    type: 'regex',
    category: 'error',
    pattern: /^\s+at\s+.+\(.+:\d+:\d+\)$/,
    confidence: 0.90,
    priority: 82,
    source: 'claude-code-v1.0',
  },

  // ========== Title Patterns ==========
  {
    id: 'claude-code.title.pattern',
    type: 'regex',
    category: 'statusbar',
    pattern: /^([⠐⠂⠈⠁⠉⠃⠋⠓⠒⠖⠦⠤✳])\s+(.+)$/,
    confidence: 0.90,
    priority: 85,
    source: 'claude-code-v1.0',
  },
];

export default claudeCodeFingerprints;
