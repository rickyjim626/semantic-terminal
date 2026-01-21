/**
 * Terminal Buffer - xterm-headless wrapper
 * Handles ANSI parsing and maintains virtual screen
 */

import { Terminal } from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';

export interface BufferOptions {
  cols?: number;
  rows?: number;
}

export class TerminalBuffer {
  private terminal: Terminal;
  private serializeAddon: SerializeAddon;
  readonly cols: number;
  readonly rows: number;

  constructor(options: BufferOptions = {}) {
    this.cols = options.cols ?? 120;
    this.rows = options.rows ?? 30;

    this.terminal = new Terminal({
      cols: this.cols,
      rows: this.rows,
      allowProposedApi: true,
    });

    this.serializeAddon = new SerializeAddon();
    this.terminal.loadAddon(this.serializeAddon);
  }

  /**
   * Write data to the terminal buffer
   * This processes all ANSI escape sequences
   */
  write(data: string): void {
    this.terminal.write(data);
  }

  /**
   * Get the full screen text (no ANSI codes)
   */
  getScreenText(): string {
    const buffer = this.terminal.buffer.active;
    const lines: string[] = [];

    for (let i = 0; i <= buffer.baseY + buffer.cursorY; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString(true));
      }
    }

    return lines.join('\n');
  }

  /**
   * Get the last line of text
   */
  getLastLine(): string {
    const buffer = this.terminal.buffer.active;
    const lastLineIndex = buffer.baseY + buffer.cursorY;
    const line = buffer.getLine(lastLineIndex);
    return line?.translateToString(true).trim() ?? '';
  }

  /**
   * Get the last N lines of text
   */
  getLastLines(n: number): string[] {
    const buffer = this.terminal.buffer.active;
    const lastLineIndex = buffer.baseY + buffer.cursorY;
    const lines: string[] = [];

    for (let i = Math.max(0, lastLineIndex - n + 1); i <= lastLineIndex; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString(true));
      }
    }

    return lines;
  }

  /**
   * Get lines from a specific range
   */
  getLines(start: number, end: number): string[] {
    const buffer = this.terminal.buffer.active;
    const maxLine = buffer.baseY + buffer.cursorY;
    const lines: string[] = [];

    const actualStart = Math.max(0, start);
    const actualEnd = Math.min(maxLine, end);

    for (let i = actualStart; i <= actualEnd; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString(true));
      }
    }

    return lines;
  }

  /**
   * Serialize the screen with formatting (ANSI codes)
   */
  serializeScreen(): string {
    return this.serializeAddon.serialize();
  }

  /**
   * Get cursor position
   */
  getCursorPosition(): { x: number; y: number } {
    const buffer = this.terminal.buffer.active;
    return {
      x: buffer.cursorX,
      y: buffer.cursorY,
    };
  }

  /**
   * Get absolute cursor Y position (including scrollback)
   */
  getAbsoluteCursorY(): number {
    const buffer = this.terminal.buffer.active;
    return buffer.baseY + buffer.cursorY;
  }

  /**
   * Get total line count (including scrollback)
   */
  getLineCount(): number {
    return this.getAbsoluteCursorY() + 1;
  }

  /**
   * Clear the screen
   */
  clear(): void {
    this.terminal.clear();
  }

  /**
   * Reset the terminal
   */
  reset(): void {
    this.terminal.reset();
  }

  /**
   * Resize the terminal
   */
  resize(cols: number, rows: number): void {
    this.terminal.resize(cols, rows);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.terminal.dispose();
  }
}
