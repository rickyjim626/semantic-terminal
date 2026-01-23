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

  // Claude Code output types
  ClaudeCodeStatus,
  ClaudeCodeContent,
  ClaudeCodeTitle,
  ClaudeCodeToolOutput,

  // Preset types
  PresetConfig,

  // Permission types
  PermissionDecision,
  PermissionChecker,

  // Event types
  SessionEvents,
  TerminalEvents,

  // Enhanced context types
  FrameDelta,
  FrameDeltaOps,
  StableTextOp,
  EnhancedParserContext,
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

// Claude Code parsers (commonly used)
export {
  ClaudeCodeStateParser,
  claudeCodeStateParser,
  createClaudeCodeStateParser,
} from './parsers/state/claude-code.js';
export {
  ClaudeCodeConfirmParser,
  claudeCodeConfirmParser,
  createClaudeCodeConfirmParser,
} from './parsers/confirm/claude-code.js';

// Claude Code output parsers
export {
  ClaudeCodeStatusParser,
  claudeCodeStatusParser,
  createClaudeCodeStatusParser,
} from './parsers/output/claude-code-status.js';
export {
  ClaudeCodeContentParser,
  claudeCodeContentParser,
  createClaudeCodeContentParser,
} from './parsers/output/claude-code-content.js';
export {
  ClaudeCodeTitleParser,
  claudeCodeTitleParser,
  createClaudeCodeTitleParser,
} from './parsers/output/claude-code-title.js';
export {
  ClaudeCodeToolOutputParser,
  claudeCodeToolOutputParser,
  createClaudeCodeToolOutputParser,
} from './parsers/output/claude-code-tool.js';

// Severity utilities
export { determineSeverity, createEnhancedOutput } from './core/severity.js';

// Fingerprint exports
export {
  FingerprintRegistry,
  defaultFingerprintRegistry,
  type Fingerprint,
  type FingerprintType,
  type FingerprintCategory,
  type FingerprintMatch,
  type FingerprintResult,
} from './core/fingerprint.js';

// Fingerprint definitions
export { claudeCodeFingerprints } from './fingerprints/index.js';
