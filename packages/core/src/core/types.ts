/**
 * Core type definitions for terminal-semantic-driver
 */

// ============ Session Types ============

export type SessionState =
  | 'starting'     // Starting up
  | 'idle'         // Waiting for input
  | 'thinking'     // Processing (spinner visible)
  | 'responding'   // Output in progress
  | 'tool_running' // Tool execution in progress
  | 'confirming'   // Waiting for confirmation
  | 'error'        // Error state
  | 'exited';      // Process exited

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SessionOptions {
  /** Working directory */
  cwd: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Terminal columns (default: 120) */
  cols?: number;
  /** Terminal rows (default: 30) */
  rows?: number;
  /** Log file path */
  logFile?: string;
  /** Shell to use (default: /bin/zsh) */
  shell?: string;
  /** Command to run (optional, runs shell if not provided) */
  command?: string;
  /** Command arguments */
  args?: string[];
}

export interface ScreenSnapshot {
  text: string;
  cursorX: number;
  cursorY: number;
  state: SessionState;
}

// ============ Parser Types ============

export interface ParserMeta {
  /** Parser unique identifier */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Priority (higher = checked first) */
  priority?: number;
  /** Parser version */
  version?: string;
}

export interface ParserContext {
  /** Current screen text */
  screenText: string;
  /** Last N lines (configurable) */
  lastLines: string[];
  /** Current detected state */
  currentState?: SessionState;
  /** Previous state */
  previousState?: SessionState;
  /** Raw screen with ANSI codes */
  rawScreen?: string;
}

// ============ State Parser Types ============

export interface StateDetectionResult {
  state: SessionState;
  confidence: number;
  /** Additional metadata about the state */
  meta?: Record<string, unknown>;
}

export interface StateParser {
  meta: ParserMeta;
  /** Detect the current state from screen content */
  detectState(context: ParserContext): StateDetectionResult | null;
}

// ============ Output Parser Types ============

export type SemanticOutputType = 'text' | 'table' | 'json' | 'tree' | 'diff' | 'list' | 'error';

export interface TableData {
  headers: string[];
  rows: Record<string, string>[];
}

export interface TreeNode {
  name: string;
  children?: TreeNode[];
}

export interface DiffData {
  file?: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  header: string;
  changes: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  lineNumber?: number;
}

export interface SemanticOutput<T = unknown> {
  /** Output type */
  type: SemanticOutputType;
  /** Original raw text */
  raw: string;
  /** Parsed structured data */
  data: T;
  /** Parse confidence (0-1) */
  confidence: number;
  /** Parser that produced this output */
  parser?: string;
}

// ============ Enhanced Output Types ============

/** Severity levels for output classification */
export type OutputSeverity = 'info' | 'success' | 'warning' | 'error' | 'critical';

/** AI-actionable suggestion */
export interface OutputSuggestion {
  /** Suggestion type */
  type: 'retry' | 'fix' | 'investigate' | 'skip';
  /** Executable command or action */
  action: string;
  /** Human-readable description */
  description: string;
  /** Confidence in this suggestion (0-1) */
  confidence: number;
  /** Whether this can be executed automatically */
  automated?: boolean;
  /** Prerequisites for this suggestion */
  requires?: string[];
}

/** Metadata for output tracking */
export interface OutputMetadata {
  /** Unix timestamp */
  timestamp: number;
  /** Session ID if available */
  session_id?: string;
  /** Command that produced this output */
  command?: string;
  /** Execution duration in ms */
  duration_ms?: number;
  /** Exit code if applicable */
  exit_code?: number;
}

/**
 * Enhanced SemanticOutput with severity and suggestions for AI agents
 */
export interface EnhancedSemanticOutput<T = unknown> extends SemanticOutput<T> {
  /** Severity level for prioritization */
  severity: OutputSeverity;

  /** AI-actionable suggestions */
  suggestions?: OutputSuggestion[];

  /** Output metadata */
  metadata: OutputMetadata;

  /** Related outputs (for multi-part responses) */
  related?: string[];

  /** Tags for categorization */
  tags?: string[];
}

export interface OutputParser<T = unknown> {
  meta: ParserMeta;
  /** Check if this parser can handle the content */
  canParse(context: ParserContext): boolean;
  /** Parse the content */
  parse(context: ParserContext): SemanticOutput<T> | null;
}

// ============ Confirm Parser Types ============

export interface ConfirmOption {
  /** Option number or key */
  key: string | number;
  /** Option label */
  label: string;
  /** Is this the default option? */
  isDefault?: boolean;
}

export interface ToolInfo {
  /** Tool name */
  name: string;
  /** MCP server name (if applicable) */
  mcpServer?: string;
  /** Tool parameters */
  params?: Record<string, unknown>;
}

export interface ConfirmInfo {
  /** Confirmation type */
  type: 'yesno' | 'options' | 'input';
  /** Question/prompt text */
  prompt: string;
  /** Available options */
  options?: ConfirmOption[];
  /** Tool info (if tool confirmation) */
  tool?: ToolInfo;
  /** Raw screen text */
  rawPrompt: string;
}

export interface ConfirmResponse {
  /** Action to take */
  action: 'confirm' | 'deny' | 'select' | 'input';
  /** Selected option (for 'select') */
  option?: string | number;
  /** Input value (for 'input') */
  value?: string | boolean;
}

export interface ConfirmParser {
  meta: ParserMeta;
  /** Detect confirmation dialog */
  detectConfirm(context: ParserContext): ConfirmInfo | null;
  /** Format response for sending to terminal */
  formatResponse(info: ConfirmInfo, response: ConfirmResponse): string;
}

// ============ Preset Types ============

export interface PresetConfig {
  /** Preset name */
  name: string;
  /** State parsers to use */
  stateParsers: StateParser[];
  /** Output parsers to use */
  outputParsers: OutputParser[];
  /** Confirm parsers to use */
  confirmParsers: ConfirmParser[];
  /** Session configuration overrides */
  sessionOptions?: Partial<SessionOptions>;
  /** Startup command */
  command?: string;
  /** Command arguments */
  args?: string[];
}

// ============ Permission Types ============

export type PermissionDecision = 'allow' | 'confirm' | 'deny';

export interface PermissionChecker {
  /** Check if a tool should be allowed */
  check(tool: ToolInfo): PermissionDecision;
}

// ============ Event Types ============

export interface SessionEvents {
  state_change: (newState: SessionState, prevState: SessionState) => void;
  confirm_required: (info: ConfirmInfo) => void;
  output: (output: SemanticOutput) => void;
  data: (data: string) => void;
  exit: (exitCode: number) => void;
  error: (error: Error) => void;
}

export interface TerminalEvents extends SessionEvents {
  ready: () => void;
}
