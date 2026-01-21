/**
 * PTY Session - Low-level terminal session management
 *
 * Architecture: node-pty (I/O) + xterm-headless (screen state)
 * - node-pty: handles process communication
 * - xterm-headless: parses ANSI, maintains virtual screen
 * - we: read clean text and detect state
 */

import { spawn, IPty } from 'node-pty';
import { EventEmitter } from 'events';
import { createWriteStream, WriteStream } from 'fs';
import { TerminalBuffer } from './buffer.js';
import type {
  SessionState,
  SessionOptions,
  Message,
  ScreenSnapshot,
} from './types.js';

export interface PTYSessionOptions extends SessionOptions {
  /** Session identifier (auto-generated if not provided) */
  id?: string;
}

export class PTYSession extends EventEmitter {
  readonly id: string;
  readonly cwd: string;
  readonly cols: number;
  readonly rows: number;

  private pty: IPty | null = null;
  private buffer: TerminalBuffer;
  private _state: SessionState = 'starting';
  private logStream: WriteStream | null = null;
  private options: PTYSessionOptions;

  // Conversation history
  private _history: Message[] = [];

  // State detection
  private lastScreenContent: string = '';

  constructor(options: PTYSessionOptions) {
    super();
    this.id = options.id ?? `pty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.cwd = options.cwd;
    this.cols = options.cols ?? 120;
    this.rows = options.rows ?? 30;
    this.options = options;

    // Create virtual terminal buffer
    this.buffer = new TerminalBuffer({
      cols: this.cols,
      rows: this.rows,
    });

    // Log file
    if (options.logFile) {
      this.logStream = createWriteStream(options.logFile, { flags: 'a' });
      this.logStream.write(`\n--- PTY Session ${this.id} started at ${new Date().toISOString()} ---\n`);
    }
  }

  // ============ Getters ============

  get state(): SessionState {
    return this._state;
  }

  get history(): Message[] {
    return [...this._history];
  }

  get isRunning(): boolean {
    return this.pty !== null && this._state !== 'exited';
  }

  get pid(): number | undefined {
    return this.pty?.pid;
  }

  // ============ Screen Reading ============

  /**
   * Get current screen text (no ANSI codes)
   */
  getScreenText(): string {
    return this.buffer.getScreenText();
  }

  /**
   * Get last line of text
   */
  getLastLine(): string {
    return this.buffer.getLastLine();
  }

  /**
   * Get last N lines of text
   */
  getLastLines(n: number): string[] {
    return this.buffer.getLastLines(n);
  }

  /**
   * Serialize screen with formatting
   */
  serializeScreen(): string {
    return this.buffer.serializeScreen();
  }

  /**
   * Check if screen content has changed since last check
   */
  hasScreenChanged(): boolean {
    const current = this.buffer.getLastLines(10).join('\n');
    if (current === this.lastScreenContent) {
      return false;
    }
    this.lastScreenContent = current;
    return true;
  }

  /**
   * Get screen snapshot for debugging
   */
  getScreenSnapshot(): ScreenSnapshot {
    const pos = this.buffer.getCursorPosition();
    return {
      text: this.getScreenText(),
      cursorX: pos.x,
      cursorY: pos.y,
      state: this._state,
    };
  }

  // ============ Lifecycle ============

  /**
   * Start the PTY session
   */
  async start(): Promise<void> {
    if (this.pty) {
      throw new Error('Session already started');
    }

    const shell = this.options.shell ?? '/bin/zsh';
    const command = this.options.command;
    const args = this.options.args ?? [];

    // Build spawn arguments
    let spawnCmd: string;
    let spawnArgs: string[];

    if (command) {
      // Run specific command through shell
      const fullCmd = args.length > 0 ? `${command} ${args.join(' ')}` : command;
      spawnCmd = shell;
      spawnArgs = ['-l', '-c', fullCmd];
    } else {
      // Just run the shell
      spawnCmd = shell;
      spawnArgs = ['-l'];
    }

    this.pty = spawn(spawnCmd, spawnArgs, {
      name: 'xterm-256color',
      cols: this.cols,
      rows: this.rows,
      cwd: this.cwd,
      env: {
        ...process.env,
        ...this.options.env,
        TERM: 'xterm-256color',
      },
    });

    // Feed PTY output to xterm-headless buffer
    this.pty.onData((data) => {
      this.handleData(data);
    });

    // Handle exit
    this.pty.onExit(({ exitCode }) => {
      this.setState('exited');
      this.emit('exit', exitCode);
      this.cleanup();
    });
  }

  /**
   * Write data to the PTY
   */
  write(data: string): void {
    if (!this.pty) {
      throw new Error('Session not started');
    }
    if (this._state === 'exited') {
      throw new Error('Session has exited');
    }

    this.logStream?.write(`[INPUT] ${data}\n`);
    this.pty.write(data);
  }

  /**
   * Send a message and record in history
   */
  sendMessage(message: string): void {
    this._history.push({
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
    });

    this.write(message);
    this.write('\r');
  }

  /**
   * Record assistant response in history
   */
  recordResponse(response: string): void {
    this._history.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    });
  }

  /**
   * Send Ctrl+C interrupt
   */
  interrupt(): void {
    this.write('\x03');
  }

  /**
   * Send specific key
   */
  sendKey(key: 'enter' | 'escape' | 'tab' | 'up' | 'down' | 'left' | 'right'): void {
    const keyMap: Record<string, string> = {
      enter: '\r',
      escape: '\x1b',
      tab: '\t',
      up: '\x1b[A',
      down: '\x1b[B',
      left: '\x1b[D',
      right: '\x1b[C',
    };
    this.write(keyMap[key] ?? '');
  }

  /**
   * Close the session gracefully
   */
  async close(exitCommand?: string): Promise<void> {
    if (!this.pty) return;

    // Try graceful exit
    if (exitCommand) {
      this.write(exitCommand + '\r');
    }

    // Wait for exit or force kill
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this.pty?.kill();
        resolve();
      }, 3000);

      this.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.cleanup();
  }

  /**
   * Force kill the session
   */
  kill(): void {
    this.pty?.kill();
    this.cleanup();
  }

  /**
   * Resize the terminal
   */
  resize(cols: number, rows: number): void {
    this.pty?.resize(cols, rows);
    this.buffer.resize(cols, rows);
  }

  // ============ State Management ============

  /**
   * Set the session state
   */
  setState(newState: SessionState): void {
    if (this._state === newState) return;

    const prevState = this._state;
    this._state = newState;
    this.emit('state_change', newState, prevState);
  }

  /**
   * Wait for a specific state
   */
  waitForState(targetState: SessionState, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._state === targetState) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        this.off('state_change', handler);
        reject(new Error(`Timeout waiting for state: ${targetState}, current: ${this._state}`));
      }, timeoutMs);

      const handler = (state: SessionState) => {
        if (state === targetState) {
          clearTimeout(timeout);
          this.off('state_change', handler);
          resolve();
        } else if (state === 'error' || state === 'exited') {
          clearTimeout(timeout);
          this.off('state_change', handler);
          reject(new Error(`Session entered ${state} while waiting for ${targetState}`));
        }
      };

      this.on('state_change', handler);
    });
  }

  /**
   * Wait for state to change from current
   */
  waitForStateChange(currentState: SessionState, timeoutMs: number): Promise<void> {
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
   * Handle PTY output data
   */
  private handleData(data: string): void {
    // Write to log
    this.logStream?.write(data);

    // Feed to xterm-headless
    this.buffer.write(data);

    // Emit raw data event
    this.emit('data', data);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.logStream?.write(`\n--- PTY Session ${this.id} ended at ${new Date().toISOString()} ---\n`);
    this.logStream?.end();
    this.logStream = null;
    this.pty = null;
    this.buffer.dispose();
  }
}
