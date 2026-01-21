#!/usr/bin/env node
/**
 * Semantic Terminal MCP Server CLI
 *
 * Usage:
 *   semantic-terminal [options]
 *
 * Options:
 *   --help       Show help
 *   --version    Show version
 *   --cwd        Default working directory
 *   --shell      Default shell
 */

import { SemanticTerminalMCP } from './server.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Semantic Terminal MCP Server

The missing Semantic Layer for AI Agents to understand Terminal output.

Usage:
  semantic-terminal [options]

Options:
  --help, -h       Show this help message
  --version, -v    Show version number
  --cwd <path>     Default working directory (default: current directory)
  --shell <path>   Default shell (default: $SHELL or /bin/bash)

MCP Server Configuration (Claude Desktop):
  Add to your claude_desktop_config.json:

  {
    "mcpServers": {
      "semantic-terminal": {
        "command": "npx",
        "args": ["@semantic-terminal/mcp"]
      }
    }
  }

Available Tools:
  terminal_session_create   - Create a new terminal session
  terminal_session_destroy  - Destroy a terminal session
  terminal_session_list     - List all active sessions
  terminal_exec             - Execute command and wait for result
  terminal_send             - Send text to terminal
  terminal_write            - Write raw data to terminal
  terminal_interrupt        - Send Ctrl+C interrupt
  terminal_screen_get       - Get screen content
  terminal_state_get        - Get current state
  terminal_state_wait       - Wait for specific state
  terminal_confirm_get      - Get pending confirmation
  terminal_confirm_respond  - Respond to confirmation
  terminal_parse_output     - Parse arbitrary text
  terminal_parser_list      - List available parsers

For more information, visit:
  https://github.com/semantic-terminal/semantic-terminal
`);
    process.exit(0);
  }

  // Handle version
  if (args.includes('--version') || args.includes('-v')) {
    console.log('0.1.0');
    process.exit(0);
  }

  // Parse options
  let cwd: string | undefined;
  let shell: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cwd' && args[i + 1]) {
      cwd = args[i + 1];
      i++;
    } else if (args[i] === '--shell' && args[i + 1]) {
      shell = args[i + 1];
      i++;
    }
  }

  // Create and start server
  const server = new SemanticTerminalMCP({
    defaultCwd: cwd,
    defaultShell: shell,
  });

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.error('\nShutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });

  // Start server
  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
