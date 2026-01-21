/**
 * SemanticTerminal - High-level terminal driver with semantic parsing
 *
 * Combines PTY session with state/output/confirm parsers to provide
 * a semantic API for terminal interaction.
 */

import { EventEmitter } from 'events';
import { PTYSession, PTYSessionOptions } from './session.js';
import { ParserRegistry, createRegistry } from '../parsers/registry.js';
import type {
  SessionState,
  SemanticOutput,
  ConfirmInfo,
  ConfirmResponse,
  PresetConfig,
  PermissionChecker,
  ParserContext,
  TerminalEvents,
} from './types.js';

export interface SemanticTerminalOptions extends Omit<PTYSessionOptions, 'id'> {
  /** Preset configuration or preset name */
  preset?: PresetConfig | string;
  /** Custom parser registry */
  registry?: ParserRegistry;
  /** Permission checker for auto-handling confirmations */
  permissionChecker?: PermissionChecker;
  /** State check interval in ms (default: 100) */
  stateCheckInterval?: number;
  /** Number of lines to use for context (default: 10) */
  contextLines?: number;
}

export interface InteractiveSession extends EventEmitter {
  send(message: string): void;
  confirm(response: ConfirmResponse): void;
  interrupt(): void;
  close(): Promise<void>;
}

export class SemanticTerminal extends EventEmitter {
  private session: PTYSession;
  private registry: ParserRegistry;
  private stateCheckTimer: NodeJS.Timeout | null = null;
  private _state: SessionState = 'starting';
  private permissionChecker?: PermissionChecker;
  private pendingConfirm: { info: ConfirmInfo; parser: import('./types.js').ConfirmParser } | null = null;

  readonly options: SemanticTerminalOptions;
  readonly contextLines: number;
  readonly stateCheckInterval: number;

  constructor(options: SemanticTerminalOptions) {
    super();
    this.options = options;
    this.contextLines = options.contextLines ?? 10;
    this.stateCheckInterval = options.stateCheckInterval ?? 100;
    this.permissionChecker = options.permissionChecker;

    // Create session
    this.session = new PTYSession({
      cwd: options.cwd,
      cols: options.cols,
      rows: options.rows,
      env: options.env,
      logFile: options.logFile,
      shell: options.shell,
      command: options.command,
      args: options.args,
    });

    // Set up registry
    if (options.registry) {
      this.registry = options.registry;
    } else {
      this.registry = createRegistry();
    }

    // Forward session events
    this.session.on('data', (data: string) => this.emit('data', data));
    this.session.on('exit', (code: number) => {
      this.stopStateCheck();
      this._state = 'exited';
      this.emit('exit', code);
    });
  }

  // ============ Getters ============

  get state(): SessionState {
    return this._state;
  }

  get isRunning(): boolean {
    return this.session.isRunning;
  }

  get pid(): number | undefined {
    return this.session.pid;
  }

  get pendingConfirmation(): ConfirmInfo | null {
    return this.pendingConfirm?.info ?? null;
  }

  // ============ Lifecycle ============

  /**
   * Start the terminal session
   */
  async start(): Promise<void> {
    await this.session.start();
    this.startStateCheck();
  }

  /**
   * Close the terminal gracefully
   */
  async close(exitCommand?: string): Promise<void> {
    this.stopStateCheck();
    await this.session.close(exitCommand);
  }

  /**
   * Force kill the terminal
   */
  kill(): void {
    this.stopStateCheck();
    this.session.kill();
  }

  // ============ Input Methods ============

  /**
   * Execute a command and wait for completion
   * Returns semantic output if parseable
   */
  async exec(command: string, timeoutMs: number = 30000): Promise<SemanticOutput | string> {
    if (this._state !== 'idle') {
      throw new Error(`Cannot exec in state: ${this._state}`);
    }

    // Record position before sending
    const beforeContent = this.session.getScreenText();

    // Send command
    this.session.sendMessage(command);

    // Wait for completion (return to idle)
    await this.waitForStateChange('idle', 5000);  // Wait to leave idle
    await this.session.waitForState('idle', timeoutMs);  // Wait to return to idle

    // Get new output
    const afterContent = this.session.getScreenText();
    const newContent = afterContent.slice(beforeContent.length).trim();

    // Try to parse output
    const context = this.createContext();
    context.screenText = newContent;

    const parsed = this.registry.parseOutput(context);
    return parsed ?? newContent;
  }

  /**
   * Send raw text to the terminal
   */
  write(data: string): void {
    this.session.write(data);
  }

  /**
   * Send a message (with enter key)
   */
  send(message: string): void {
    this.session.sendMessage(message);
  }

  /**
   * Send Ctrl+C interrupt
   */
  interrupt(): void {
    this.session.interrupt();
  }

  /**
   * Respond to a confirmation dialog
   */
  confirm(response: ConfirmResponse): void {
    if (!this.pendingConfirm) {
      throw new Error('No pending confirmation');
    }

    const formatted = this.pendingConfirm.parser.formatResponse(
      this.pendingConfirm.info,
      response
    );
    this.session.write(formatted);
    this.pendingConfirm = null;
  }

  // ============ Interactive Mode ============

  /**
   * Create an interactive session
   */
  interactive(): InteractiveSession {
    const self = this;
    const emitter = new EventEmitter() as InteractiveSession;

    // Forward relevant events
    this.on('state_change', (state: SessionState, prev: SessionState) => {
      emitter.emit('state', state, prev);
    });

    this.on('confirm_required', (info: ConfirmInfo) => {
      emitter.emit('confirm', info);
    });

    this.on('output', (output: SemanticOutput) => {
      emitter.emit('output', output);
    });

    // Add methods
    emitter.send = (message: string) => {
      self.session.sendMessage(message);
    };

    emitter.confirm = (response: ConfirmResponse) => {
      self.confirm(response);
    };

    emitter.interrupt = () => {
      self.interrupt();
    };

    emitter.close = async () => {
      await self.close();
    };

    return emitter;
  }

  // ============ Screen Access ============

  /**
   * Get current screen text
   */
  getScreenText(): string {
    return this.session.getScreenText();
  }

  /**
   * Get last N lines
   */
  getLastLines(n?: number): string[] {
    return this.session.getLastLines(n ?? this.contextLines);
  }

  // ============ Parser Management ============

  /**
   * Get the parser registry
   */
  getRegistry(): ParserRegistry {
    return this.registry;
  }

  /**
   * Load a preset configuration
   */
  loadPreset(preset: PresetConfig): void {
    this.registry.clear();
    this.registry.registerStateParsers(preset.stateParsers);
    this.registry.registerOutputParsers(preset.outputParsers);
    this.registry.registerConfirmParsers(preset.confirmParsers);
  }

  /**
   * Set permission checker
   */
  setPermissionChecker(checker: PermissionChecker): void {
    this.permissionChecker = checker;
  }

  // ============ State Management ============

  /**
   * Wait for a specific state
   */
  waitForState(state: SessionState, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._state === state) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        this.off('state_change', handler);
        reject(new Error(`Timeout waiting for state: ${state}`));
      }, timeoutMs);

      const handler = (newState: SessionState) => {
        if (newState === state) {
          clearTimeout(timeout);
          this.off('state_change', handler);
          resolve();
        }
      };

      this.on('state_change', handler);
    });
  }

  /**
   * Wait for state to change from current
   */
  private waitForStateChange(currentState: SessionState, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._state !== currentState) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        this.off('state_change', handler);
        reject(new Error(`Timeout waiting to leave state: ${currentState}`));
      }, timeoutMs);

      const handler = (state: SessionState) => {
        if (state !== currentState) {
          clearTimeout(timeout);
          this.off('state_change', handler);
          resolve();
        }
      };

      this.on('state_change', handler);
    });
  }

  // ============ Internal Methods ============

  /**
   * Start state checking loop
   */
  private startStateCheck(): void {
    this.stateCheckTimer = setInterval(() => {
      this.checkState();
    }, this.stateCheckInterval);
  }

  /**
   * Stop state checking
   */
  private stopStateCheck(): void {
    if (this.stateCheckTimer) {
      clearInterval(this.stateCheckTimer);
      this.stateCheckTimer = null;
    }
  }

  /**
   * Check current state using parsers
   */
  private checkState(): void {
    // Skip if screen hasn't changed
    if (!this.session.hasScreenChanged()) {
      return;
    }

    const context = this.createContext();

    // First check for confirmations
    const confirmResult = this.registry.detectConfirm(context);
    if (confirmResult) {
      this.pendingConfirm = confirmResult;

      // Check if we should auto-handle
      if (this.permissionChecker && confirmResult.info.tool) {
        const decision = this.permissionChecker.check(confirmResult.info.tool);
        if (decision === 'allow') {
          this.confirm({ action: 'confirm' });
          return;
        } else if (decision === 'deny') {
          this.confirm({ action: 'deny' });
          return;
        }
      }

      // Emit confirmation required
      if (this._state !== 'confirming') {
        this.setState('confirming');
        this.emit('confirm_required', confirmResult.info);
      }
      return;
    }

    // Check state
    const stateResult = this.registry.detectState(context);
    if (stateResult) {
      this.setState(stateResult.state);
    }
  }

  /**
   * Create parser context from current screen
   */
  private createContext(): ParserContext {
    const screenText = this.session.getScreenText();
    const lastLines = this.session.getLastLines(this.contextLines);

    return {
      screenText,
      lastLines,
      currentState: this._state,
      previousState: undefined, // TODO: track previous state
    };
  }

  /**
   * Set state and emit event
   */
  private setState(newState: SessionState): void {
    if (this._state === newState) return;

    const prevState = this._state;
    this._state = newState;
    this.emit('state_change', newState, prevState);
  }
}

// Type augmentation for events
export interface SemanticTerminal {
  on<K extends keyof TerminalEvents>(event: K, listener: TerminalEvents[K]): this;
  emit<K extends keyof TerminalEvents>(event: K, ...args: Parameters<TerminalEvents[K]>): boolean;
  off<K extends keyof TerminalEvents>(event: K, listener: TerminalEvents[K]): this;
}
