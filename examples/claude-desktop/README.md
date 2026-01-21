# Claude Desktop Integration

This example shows how to configure Semantic Terminal as an MCP server for Claude Desktop.

## Setup

1. Locate your Claude Desktop config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the Semantic Terminal MCP server:

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

3. Restart Claude Desktop

## Usage

Once configured, you can ask Claude to interact with your terminal:

- "Create a terminal session and run `npm install`"
- "Execute `git status` and tell me what files changed"
- "Run the tests and fix any errors you find"
- "Build the project and handle any dependency conflicts"

## Available Tools

Claude will have access to 14 terminal tools:

### Session Management
- `terminal_session_create` - Create a new terminal session
- `terminal_session_destroy` - Destroy a terminal session
- `terminal_session_list` - List all active sessions

### Command Execution
- `terminal_exec` - Execute command and wait for result
- `terminal_send` - Send text + Enter
- `terminal_write` - Send raw data
- `terminal_interrupt` - Send Ctrl+C

### Screen & State
- `terminal_screen_get` - Get screen content
- `terminal_state_get` - Get current state
- `terminal_state_wait` - Wait for specific state

### Confirmation Handling
- `terminal_confirm_get` - Get pending confirmation
- `terminal_confirm_respond` - Respond to confirmation

### Output Parsing
- `terminal_parse_output` - Parse arbitrary text
- `terminal_parser_list` - List available parsers

## Advanced Configuration

### Custom Working Directory

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

### Environment Variables

```json
{
  "mcpServers": {
    "semantic-terminal": {
      "command": "npx",
      "args": ["@semantic-terminal/mcp"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```
