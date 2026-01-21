/**
 * Semantic Terminal MCP Server
 *
 * Transform any CLI into a structured, semantic API for AI agents
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';

import { SessionManager } from './session-manager.js';

export interface SemanticTerminalMCPOptions {
  /** Server name */
  name?: string;
  /** Server version */
  version?: string;
  /** Default shell */
  defaultShell?: string;
  /** Default working directory */
  defaultCwd?: string;
}

export class SemanticTerminalMCP {
  private server: McpServer;
  private sessionManager: SessionManager;

  constructor(private options: SemanticTerminalMCPOptions = {}) {
    this.server = new McpServer({
      name: options.name ?? 'semantic-terminal',
      version: options.version ?? '0.1.0',
    });

    this.sessionManager = new SessionManager({
      defaultShell: options.defaultShell,
      defaultCwd: options.defaultCwd,
    });

    this.registerTools();
  }

  /**
   * Register all MCP tools
   */
  private registerTools(): void {
    // ========== Session Lifecycle Tools ==========

    // terminal_session_create
    this.server.tool(
      'terminal_session_create',
      'Create a new terminal session with optional preset configuration',
      {
        preset: z.enum(['shell', 'claude-code', 'docker']).optional().describe('Preset configuration'),
        cwd: z.string().optional().describe('Working directory'),
        command: z.string().optional().describe('Command to run'),
        args: z.array(z.string()).optional().describe('Command arguments'),
        env: z.record(z.string()).optional().describe('Environment variables'),
        cols: z.number().optional().describe('Terminal columns (default: 120)'),
        rows: z.number().optional().describe('Terminal rows (default: 30)'),
      },
      async (args) => {
        const result = await this.sessionManager.create({
          preset: args.preset,
          cwd: args.cwd,
          command: args.command,
          args: args.args,
          env: args.env,
          cols: args.cols,
          rows: args.rows,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
    );

    // terminal_session_destroy
    this.server.tool(
      'terminal_session_destroy',
      'Destroy a terminal session',
      {
        session_id: z.string().describe('Session ID to destroy'),
        force: z.boolean().optional().describe('Force kill without graceful shutdown'),
      },
      async (args) => {
        const result = await this.sessionManager.destroy(args.session_id, args.force);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
    );

    // terminal_session_list
    this.server.tool(
      'terminal_session_list',
      'List all active terminal sessions',
      {},
      async () => {
        const sessions = this.sessionManager.list();
        return { content: [{ type: 'text', text: JSON.stringify({ sessions }, null, 2) }] };
      }
    );

    // ========== Command Execution Tools ==========

    // terminal_exec
    this.server.tool(
      'terminal_exec',
      'Execute a command in a terminal session and wait for completion. Returns structured semantic output when possible.',
      {
        command: z.string().describe('The command to execute'),
        session_id: z.string().optional().describe('Session ID. If not provided, creates a temporary session.'),
        timeout_ms: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
        parse_output: z.boolean().optional().describe('Whether to parse output semantically (default: true)'),
      },
      async (args) => {
        let sessionId = args.session_id;
        let tempSession = false;

        if (!sessionId) {
          const session = await this.sessionManager.create();
          sessionId = session.id;
          tempSession = true;
        }

        try {
          const result = await this.sessionManager.exec(sessionId, args.command, {
            timeout_ms: args.timeout_ms,
            parse_output: args.parse_output,
          });
          return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] };
        } finally {
          if (tempSession) {
            await this.sessionManager.destroy(sessionId, true);
          }
        }
      }
    );

    // terminal_send
    this.server.tool(
      'terminal_send',
      'Send text to a terminal session followed by Enter key. Does not wait for completion.',
      {
        session_id: z.string().describe('Session ID'),
        text: z.string().describe('Text to send'),
      },
      async (args) => {
        this.sessionManager.send(args.session_id, args.text);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
      }
    );

    // terminal_write
    this.server.tool(
      'terminal_write',
      'Write raw data to a terminal session. No Enter key is appended.',
      {
        session_id: z.string().describe('Session ID'),
        data: z.string().describe('Raw data to write'),
      },
      async (args) => {
        this.sessionManager.write(args.session_id, args.data);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
      }
    );

    // terminal_interrupt
    this.server.tool(
      'terminal_interrupt',
      'Send interrupt signal (Ctrl+C) to a terminal session',
      {
        session_id: z.string().describe('Session ID'),
      },
      async (args) => {
        this.sessionManager.interrupt(args.session_id);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
      }
    );

    // ========== Screen & State Tools ==========

    // terminal_screen_get
    this.server.tool(
      'terminal_screen_get',
      'Get the current screen content from a terminal session',
      {
        session_id: z.string().describe('Session ID'),
        lines: z.number().optional().describe('Number of lines to get (from bottom)'),
      },
      async (args) => {
        const content = this.sessionManager.getScreen(args.session_id, args.lines);
        return { content: [{ type: 'text', text: JSON.stringify({ content }, null, 2) }] };
      }
    );

    // terminal_state_get
    this.server.tool(
      'terminal_state_get',
      'Get the current state of a terminal session. States: idle, thinking, responding, tool_running, confirming, error, exited.',
      {
        session_id: z.string().describe('Session ID'),
      },
      async (args) => {
        const state = this.sessionManager.getState(args.session_id);
        return { content: [{ type: 'text', text: JSON.stringify({ state }) }] };
      }
    );

    // terminal_state_wait
    this.server.tool(
      'terminal_state_wait',
      'Wait for a terminal session to reach a specific state',
      {
        session_id: z.string().describe('Session ID'),
        state: z.enum(['idle', 'thinking', 'responding', 'tool_running', 'confirming', 'error', 'exited']).describe('Target state'),
        timeout_ms: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
      },
      async (args) => {
        const timeoutMs = args.timeout_ms ?? 30000;
        try {
          await this.sessionManager.waitForState(args.session_id, args.state, timeoutMs);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, reached_state: args.state }) }] };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: message }) }] };
        }
      }
    );

    // ========== Confirmation Tools ==========

    // terminal_confirm_get
    this.server.tool(
      'terminal_confirm_get',
      'Get pending confirmation dialog information from a terminal session',
      {
        session_id: z.string().describe('Session ID'),
      },
      async (args) => {
        const confirm = this.sessionManager.getPendingConfirm(args.session_id);
        if (!confirm) {
          return { content: [{ type: 'text', text: JSON.stringify({ has_pending: false }) }] };
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              has_pending: true,
              type: confirm.type,
              prompt: confirm.prompt,
              options: confirm.options,
              tool: confirm.tool,
            }, null, 2),
          }],
        };
      }
    );

    // terminal_confirm_respond
    this.server.tool(
      'terminal_confirm_respond',
      'Respond to a pending confirmation dialog. Use action "confirm" or "deny" for yes/no prompts, or provide an option number/input value.',
      {
        session_id: z.string().describe('Session ID'),
        action: z.enum(['confirm', 'deny', 'select', 'input']).describe('Action to take'),
        option: z.union([z.string(), z.number()]).optional().describe('Option to select (for "select" action)'),
        value: z.string().optional().describe('Input value (for "input" action)'),
      },
      async (args) => {
        let response: 'confirm' | 'deny' | { select: number | string } | { input: string };

        switch (args.action) {
          case 'confirm':
            response = 'confirm';
            break;
          case 'deny':
            response = 'deny';
            break;
          case 'select':
            if (args.option === undefined) {
              throw new Error('Option required for select action');
            }
            response = { select: args.option };
            break;
          case 'input':
            if (args.value === undefined) {
              throw new Error('Value required for input action');
            }
            response = { input: args.value };
            break;
          default:
            throw new Error(`Unknown action: ${args.action}`);
        }

        this.sessionManager.respondToConfirm(args.session_id, response);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
      }
    );

    // ========== Parser Tools ==========

    // terminal_parse_output
    this.server.tool(
      'terminal_parse_output',
      'Parse arbitrary terminal output text and return structured semantic data',
      {
        text: z.string().describe('The text to parse'),
        parser: z.string().optional().describe('Specific parser to use (optional)'),
      },
      async (args) => {
        // Import lazily to avoid circular dependency
        const { createRegistry, createEnhancedOutput } = await import('@semantic-terminal/core');

        const registry = createRegistry();
        const context = {
          screenText: args.text,
          lastLines: args.text.split('\n').slice(-20),
        };

        const result = registry.parseOutput(context);
        if (!result) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                parsed: false,
                raw: args.text,
                message: 'No parser could parse this output',
              }, null, 2),
            }],
          };
        }

        const enhanced = createEnhancedOutput(result);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ parsed: true, ...enhanced }, null, 2),
          }],
        };
      }
    );

    // terminal_parser_list
    this.server.tool(
      'terminal_parser_list',
      'List all available output parsers and their descriptions',
      {},
      async () => {
        const { createRegistry } = await import('@semantic-terminal/core');
        const registry = createRegistry();

        const stateParsers = registry.getStateParsers().map((p: { meta: { name: string; description?: string; priority?: number } }) => ({
          name: p.meta.name,
          type: 'state',
          description: p.meta.description,
          priority: p.meta.priority ?? 0,
        }));

        const outputParsers = registry.getOutputParsers().map((p: { meta: { name: string; description?: string; priority?: number } }) => ({
          name: p.meta.name,
          type: 'output',
          description: p.meta.description,
          priority: p.meta.priority ?? 0,
        }));

        const confirmParsers = registry.getConfirmParsers().map((p: { meta: { name: string; description?: string; priority?: number } }) => ({
          name: p.meta.name,
          type: 'confirm',
          description: p.meta.description,
          priority: p.meta.priority ?? 0,
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              parsers: [...stateParsers, ...outputParsers, ...confirmParsers],
              counts: {
                state: stateParsers.length,
                output: outputParsers.length,
                confirm: confirmParsers.length,
              },
            }, null, 2),
          }],
        };
      }
    );
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Semantic Terminal MCP Server started');
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    await this.sessionManager.destroyAll();
    await this.server.close();
  }

  /**
   * Get the session manager (for testing)
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }
}
