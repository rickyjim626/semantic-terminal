/**
 * Session Manager - manages multiple terminal sessions
 */

import {
  SemanticTerminal,
  type SemanticTerminalOptions,
  type SessionState,
  type ConfirmInfo,
  type EnhancedSemanticOutput,
  createEnhancedOutput,
  createShellPreset,
  createClaudeCodePreset,
  createDockerComposePreset,
} from '@semantic-terminal/core';

export interface ManagedSession {
  id: string;
  terminal: SemanticTerminal;
  preset: string;
  createdAt: number;
  lastActivity: number;
  pendingConfirm: ConfirmInfo | null;
}

export interface SessionManagerOptions {
  /** Default shell */
  defaultShell?: string;
  /** Default working directory */
  defaultCwd?: string;
  /** Session idle timeout (ms, default: 30 minutes) */
  idleTimeout?: number;
  /** Maximum sessions (default: 10) */
  maxSessions?: number;
}

export interface CreateSessionOptions {
  /** Preset name: shell, claude-code, docker */
  preset?: 'shell' | 'claude-code' | 'docker';
  /** Working directory */
  cwd?: string;
  /** Command to run */
  command?: string;
  /** Command arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Terminal columns */
  cols?: number;
  /** Terminal rows */
  rows?: number;
}

export interface SessionInfo {
  id: string;
  preset: string;
  state: SessionState;
  pid?: number;
  createdAt: number;
  lastActivity: number;
  hasPendingConfirm: boolean;
}

export class SessionManager {
  private sessions: Map<string, ManagedSession> = new Map();
  private options: Required<SessionManagerOptions>;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: SessionManagerOptions = {}) {
    this.options = {
      defaultShell: options.defaultShell ?? process.env.SHELL ?? '/bin/bash',
      defaultCwd: options.defaultCwd ?? process.cwd(),
      idleTimeout: options.idleTimeout ?? 30 * 60 * 1000, // 30 minutes
      maxSessions: options.maxSessions ?? 10,
    };

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleSessions();
    }, 60 * 1000); // Check every minute
  }

  /**
   * Create a new terminal session
   */
  async create(options: CreateSessionOptions = {}): Promise<SessionInfo> {
    // Check max sessions
    if (this.sessions.size >= this.options.maxSessions) {
      throw new Error(`Maximum sessions (${this.options.maxSessions}) reached`);
    }

    const id = this.generateId();
    const presetName = options.preset ?? 'shell';

    // Get preset configuration
    const preset = this.getPreset(presetName, options);

    // Create terminal options
    const terminalOptions: SemanticTerminalOptions = {
      cwd: options.cwd ?? this.options.defaultCwd,
      shell: this.options.defaultShell,
      command: options.command,
      args: options.args,
      env: options.env,
      cols: options.cols ?? 120,
      rows: options.rows ?? 30,
      preset,
    };

    // Create and start terminal
    const terminal = new SemanticTerminal(terminalOptions);
    await terminal.start();

    // Setup event handlers
    const managed: ManagedSession = {
      id,
      terminal,
      preset: presetName,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      pendingConfirm: null,
    };

    terminal.on('confirm_required', (info: ConfirmInfo) => {
      managed.pendingConfirm = info;
    });

    terminal.on('state_change', () => {
      managed.lastActivity = Date.now();
    });

    terminal.on('exit', () => {
      // Remove session on exit
      this.sessions.delete(id);
    });

    this.sessions.set(id, managed);

    return this.getSessionInfo(managed);
  }

  /**
   * Get session by ID
   */
  get(id: string): ManagedSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Get session or throw
   */
  getOrThrow(id: string): ManagedSession {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    return session;
  }

  /**
   * List all sessions
   */
  list(): SessionInfo[] {
    return Array.from(this.sessions.values()).map(s => this.getSessionInfo(s));
  }

  /**
   * Destroy a session
   */
  async destroy(id: string, force: boolean = false): Promise<{ success: boolean; exit_code?: number }> {
    const session = this.sessions.get(id);
    if (!session) {
      return { success: false };
    }

    try {
      if (force) {
        session.terminal.kill();
      } else {
        await session.terminal.close('exit');
      }
      this.sessions.delete(id);
      return { success: true };
    } catch (error) {
      // Force kill on error
      session.terminal.kill();
      this.sessions.delete(id);
      return { success: true };
    }
  }

  /**
   * Destroy all sessions
   */
  async destroyAll(): Promise<void> {
    const promises = Array.from(this.sessions.keys()).map(id => this.destroy(id, true));
    await Promise.all(promises);

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Execute command in a session
   */
  async exec(
    id: string,
    command: string,
    options: { timeout_ms?: number; parse_output?: boolean } = {}
  ): Promise<EnhancedSemanticOutput | string> {
    const session = this.getOrThrow(id);
    session.lastActivity = Date.now();

    const startTime = Date.now();
    const result = await session.terminal.exec(command, options.timeout_ms ?? 30000);
    const duration = Date.now() - startTime;

    if (typeof result === 'string') {
      if (options.parse_output === false) {
        return result;
      }
      // Create basic enhanced output for raw string
      return createEnhancedOutput(
        {
          type: 'text',
          raw: result,
          data: result,
          confidence: 1,
        },
        {
          session_id: id,
          command,
          duration_ms: duration,
        }
      );
    }

    // Enhance the semantic output
    return createEnhancedOutput(result, {
      session_id: id,
      command,
      duration_ms: duration,
    });
  }

  /**
   * Send text to a session
   */
  send(id: string, text: string): void {
    const session = this.getOrThrow(id);
    session.lastActivity = Date.now();
    session.terminal.send(text);
  }

  /**
   * Write raw data to a session
   */
  write(id: string, data: string): void {
    const session = this.getOrThrow(id);
    session.lastActivity = Date.now();
    session.terminal.write(data);
  }

  /**
   * Send interrupt (Ctrl+C) to a session
   */
  interrupt(id: string): void {
    const session = this.getOrThrow(id);
    session.lastActivity = Date.now();
    session.terminal.interrupt();
  }

  /**
   * Get screen text from a session
   */
  getScreen(id: string, lines?: number): string {
    const session = this.getOrThrow(id);
    if (lines) {
      return session.terminal.getLastLines(lines).join('\n');
    }
    return session.terminal.getScreenText();
  }

  /**
   * Get session state
   */
  getState(id: string): SessionState {
    const session = this.getOrThrow(id);
    return session.terminal.state;
  }

  /**
   * Wait for specific state
   */
  async waitForState(id: string, state: SessionState, timeoutMs: number): Promise<void> {
    const session = this.getOrThrow(id);
    await session.terminal.waitForState(state, timeoutMs);
  }

  /**
   * Get pending confirmation
   */
  getPendingConfirm(id: string): ConfirmInfo | null {
    const session = this.getOrThrow(id);
    return session.pendingConfirm;
  }

  /**
   * Respond to confirmation
   */
  respondToConfirm(
    id: string,
    response: 'confirm' | 'deny' | { select: number | string } | { input: string }
  ): void {
    const session = this.getOrThrow(id);

    if (!session.pendingConfirm) {
      throw new Error('No pending confirmation');
    }

    if (response === 'confirm') {
      session.terminal.confirm({ action: 'confirm' });
    } else if (response === 'deny') {
      session.terminal.confirm({ action: 'deny' });
    } else if ('select' in response) {
      session.terminal.confirm({ action: 'select', option: response.select });
    } else if ('input' in response) {
      session.terminal.confirm({ action: 'input', value: response.input });
    }

    session.pendingConfirm = null;
    session.lastActivity = Date.now();
  }

  // ============ Private Methods ============

  private generateId(): string {
    return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private getPreset(name: string, options: CreateSessionOptions) {
    switch (name) {
      case 'claude-code':
        return createClaudeCodePreset();
      case 'docker':
        return createDockerComposePreset({ cwd: options.cwd ?? this.options.defaultCwd });
      case 'shell':
      default:
        return createShellPreset();
    }
  }

  private getSessionInfo(session: ManagedSession): SessionInfo {
    return {
      id: session.id,
      preset: session.preset,
      state: session.terminal.state,
      pid: session.terminal.pid,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      hasPendingConfirm: session.pendingConfirm !== null,
    };
  }

  private cleanupIdleSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > this.options.idleTimeout) {
        this.destroy(id, true);
      }
    }
  }
}
