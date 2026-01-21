/**
 * @semantic-terminal/core
 *
 * The missing Semantic Layer for AI Agents to understand Terminal output
 */

// Core exports
export { SemanticTerminal, type SemanticTerminalOptions, type InteractiveSession } from './core/terminal.js';
export { PTYSession, type PTYSessionOptions } from './core/session.js';
export { TerminalBuffer, type BufferOptions } from './core/buffer.js';

// Type exports
export type {
  // Session types
  SessionState,
  SessionOptions,
  Message,
  ScreenSnapshot,

  // Parser types
  ParserMeta,
  ParserContext,
  StateParser,
  StateDetectionResult,
  OutputParser,
  SemanticOutput,
  SemanticOutputType,
  ConfirmParser,
  ConfirmInfo,
  ConfirmResponse,
  ConfirmOption,

  // Enhanced output types
  EnhancedSemanticOutput,
  OutputSeverity,
  OutputSuggestion,
  OutputMetadata,

  // Data types
  TableData,
  TreeNode,
  DiffData,
  DiffHunk,
  DiffLine,
  ToolInfo,

  // Preset types
  PresetConfig,

  // Permission types
  PermissionDecision,
  PermissionChecker,

  // Event types
  SessionEvents,
  TerminalEvents,
} from './core/types.js';

// Parser exports
export { ParserRegistry, createRegistry, defaultRegistry } from './parsers/registry.js';
export {
  BaseStateParser,
  BaseOutputParser,
  BaseConfirmParser,
  createStateParser,
  createOutputParser,
  createConfirmParser,
} from './parsers/base.js';

// Utility exports
export { matchPattern, matchPatterns, findMatchingPattern, patternToRegex } from './utils/pattern-matcher.js';

// Preset exports (re-export from presets module)
export { ClaudeCodePreset, createClaudeCodePreset } from './presets/claude-code.js';
export { DockerPreset, createDockerComposePreset } from './presets/docker.js';
export { ShellPreset, createShellPreset, createCommandPreset } from './presets/shell.js';

// Severity utilities
export { determineSeverity, createEnhancedOutput } from './core/severity.js';
