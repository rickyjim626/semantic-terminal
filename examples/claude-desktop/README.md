# Claude Desktop Integration

This guide shows how to integrate Semantic Terminal with Claude Desktop.

## Installation

1. Install the MCP server globally:
```bash
npm install -g @semantic-terminal/mcp
```

Or use npx (recommended):
```bash
npx @semantic-terminal/mcp
```

## Configuration

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "semantic-terminal": {
      "command": "npx",
      "args": ["@semantic-terminal/mcp"]
    }
  }
}
```

### With Custom Working Directory

```json
{
  "mcpServers": {
    "semantic-terminal": {
      "command": "npx",
      "args": ["@semantic-terminal/mcp", "--cwd", "/path/to/your/project"]
    }
  }
}
```

## Usage Examples

### Basic Command Execution

In Claude Desktop, you can now ask:

> "Run `ls -la` in the terminal"

Claude will:
1. Create a terminal session
2. Execute the command
3. Return structured output with file listings

### Error Recovery

> "Run `npm install` and fix any dependency errors"

Claude will:
1. Execute `npm install`
2. Parse the output semantically
3. If ERESOLVE error occurs, automatically suggest and execute `npm install --legacy-peer-deps`

### Interactive Sessions

> "Start a Python REPL and calculate fibonacci(10)"

Claude will:
1. Create a session with `python3` command
2. Send `def fib(n): return n if n < 2 else fib(n-1) + fib(n-2)`
3. Send `print(fib(10))`
4. Parse and return the result

### Git Operations

> "Check git status and commit all changes with a descriptive message"

Claude will:
1. Run `git status`
2. Parse the output to understand changed files
3. Stage changes with `git add`
4. Create a commit with an appropriate message

## Available Tools

When using Semantic Terminal with Claude Desktop, you have access to these tools:

| Tool | What it does |
|------|--------------|
| `terminal_session_create` | Start a new terminal |
| `terminal_exec` | Run a command and get semantic output |
| `terminal_send` | Send text to terminal |
| `terminal_interrupt` | Send Ctrl+C |
| `terminal_screen_get` | Read screen content |
| `terminal_state_get` | Check terminal state |
| `terminal_confirm_respond` | Answer Y/n prompts |

## Tips

1. **Let Claude manage sessions**: Claude will automatically create and destroy sessions as needed.

2. **Be specific about errors**: Say "fix any TypeScript errors" rather than just "fix errors" for better results.

3. **Use presets**: Mention "use the claude-code preset" for better parsing of Claude Code output.

4. **Multi-step tasks**: Claude can chain multiple commands based on output parsing.

## Troubleshooting

### Server not starting

Check if node-pty is installed correctly:
```bash
npm install -g node-pty
```

### Slow response

The first command may be slow as the terminal initializes. Subsequent commands will be faster.

### Permission errors

Ensure the working directory is accessible and you have proper permissions.
