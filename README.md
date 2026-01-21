# Semantic Terminal

**The missing Semantic Layer for AI Agents to understand Terminal output**

[![npm version](https://badge.fury.io/js/@semantic-terminal%2Fcore.svg)](https://badge.fury.io/js/@semantic-terminal%2Fcore)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## The Problem

AI agents interact with terminals through raw text. They see:
- Unstructured output mixed with ANSI escape codes
- No understanding of success vs failure
- No context about what action to take next
- Confirmation dialogs they can't reliably parse

This leads to:
- Brittle automation that breaks on minor output changes
- Agents that can't recover from errors
- Manual intervention required for simple confirmations

## The Solution

Semantic Terminal transforms **any CLI** into a **structured, semantic API**.

```
Raw Terminal Output          Semantic Terminal
─────────────────────       ─────────────────────
npm ERR! code ERESOLVE      {
npm ERR! ERESOLVE unable      "type": "error",
  to resolve dependency       "severity": "error",
npm ERR!                      "data": {
npm ERR! Could not resolve      "code": "ERESOLVE",
  dependency:                   "package": "react"
npm ERR! peer react@"^17.0"   },
  from package@1.0.0          "suggestions": [{
                                "type": "fix",
                                "action": "npm install --legacy-peer-deps",
                                "automated": true
                              }]
                            }
```

## Key Features

### Semantic State Detection
Know exactly what state your terminal is in:
- `idle` - Ready for input
- `thinking` - Processing (spinner visible)
- `responding` - Output in progress
- `confirming` - Waiting for Y/n response
- `error` - Something went wrong

### Structured Output Parsing
Automatic parsing of common output formats:
- **Tables** → `{ headers: [...], rows: [...] }`
- **JSON** → Native objects
- **Diffs** → `{ hunks: [{ changes: [...] }] }`
- **Lists** → Typed arrays
- **Errors** → Severity + actionable suggestions

### Confirmation Handling
Detect and respond to confirmation dialogs:
- Yes/No prompts (`[Y/n]`, `Continue?`)
- Tool permission requests (Claude Code style)
- Multi-option selections

### MCP Protocol Native
First-class support for [Model Context Protocol](https://modelcontextprotocol.io/):
- 14 semantic tools for terminal interaction
- Works with Claude Desktop, Cursor IDE, and any MCP client
- Automatic session management

### Extensible Parser Architecture
Add custom parsers for your specific CLI tools:

```typescript
import { createOutputParser } from '@semantic-terminal/core';

const myParser = createOutputParser('my-cli',
  (ctx) => ctx.screenText.includes('MY-CLI'),
  (ctx) => ({
    type: 'json',
    data: parseMyOutput(ctx.screenText),
    confidence: 0.9
  })
);
```

## Quick Start

### As MCP Server (Recommended)

Add to your `claude_desktop_config.json`:

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

Then in Claude Desktop:
> "Run `npm install` and fix any errors"

Claude will:
1. Create a terminal session
2. Execute the command
3. Parse the output semantically
4. Automatically retry with `--legacy-peer-deps` if ERESOLVE error occurs

### As Library

```typescript
import { SemanticTerminal, createShellPreset } from '@semantic-terminal/core';

const terminal = new SemanticTerminal({
  cwd: '/my/project',
  preset: createShellPreset(),
});

await terminal.start();

// Execute with semantic output
const result = await terminal.exec('npm test');

if (result.type === 'error') {
  console.log('Test failed:', result.data);
  console.log('Suggestion:', result.suggestions?.[0]?.action);
}

// Handle confirmations
terminal.on('confirm_required', (info) => {
  if (info.tool?.name === 'safe-tool') {
    terminal.confirm({ action: 'confirm' });
  }
});

await terminal.close();
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Agent / MCP Client                     │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    MCP Protocol (JSON-RPC)
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                     @semantic-terminal/mcp                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Session Mgr  │  │ Tool Router  │  │ Response Formatter   │  │
│  └──────┬───────┘  └──────────────┘  └──────────────────────┘  │
└─────────┼───────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                     @semantic-terminal/core                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PTYSession  │  │   Parsers    │  │      Presets         │  │
│  │  (node-pty)  │  │ State/Output │  │ shell/claude/docker  │  │
│  └──────┬───────┘  │   /Confirm   │  └──────────────────────┘  │
│         │          └──────────────┘                              │
│  ┌──────▼───────┐                                                │
│  │TerminalBuffer│  (xterm-headless)                              │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

## MCP Tools Reference

### Session Lifecycle
| Tool | Description |
|------|-------------|
| `terminal_session_create` | Create a new terminal session |
| `terminal_session_destroy` | Destroy a terminal session |
| `terminal_session_list` | List all active sessions |

### Command Execution
| Tool | Description |
|------|-------------|
| `terminal_exec` | Execute command and wait for semantic result |
| `terminal_send` | Send text + Enter (non-blocking) |
| `terminal_write` | Send raw data |
| `terminal_interrupt` | Send Ctrl+C |

### Screen & State
| Tool | Description |
|------|-------------|
| `terminal_screen_get` | Get current screen content |
| `terminal_state_get` | Get current state |
| `terminal_state_wait` | Wait for specific state |

### Confirmation
| Tool | Description |
|------|-------------|
| `terminal_confirm_get` | Get pending confirmation info |
| `terminal_confirm_respond` | Respond to confirmation |

### Parsing
| Tool | Description |
|------|-------------|
| `terminal_parse_output` | Parse arbitrary text |
| `terminal_parser_list` | List available parsers |

## Use Cases

### Claude Desktop Integration
Let Claude control your terminal with semantic understanding:
- Execute build commands and understand errors
- Run tests and parse results
- Handle git operations with conflict awareness

### Cursor IDE
Enhance Cursor's terminal capabilities:
- Better error recovery
- Automatic suggestion application
- Multi-step task automation

### Custom AI Agents
Build agents that truly understand CLI output:
- DevOps automation with error handling
- CI/CD pipeline control
- Infrastructure management

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| `@semantic-terminal/core` | Core library | [![npm](https://img.shields.io/npm/v/@semantic-terminal/core)](https://www.npmjs.com/package/@semantic-terminal/core) |
| `@semantic-terminal/mcp` | MCP Server | [![npm](https://img.shields.io/npm/v/@semantic-terminal/mcp)](https://www.npmjs.com/package/@semantic-terminal/mcp) |

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development

```bash
# Clone the repository
git clone https://github.com/semantic-terminal/semantic-terminal.git
cd semantic-terminal

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Development mode
pnpm dev
```

## Roadmap

- [ ] More output parsers (pytest, jest, cargo, etc.)
- [ ] WebSocket transport for remote terminals
- [ ] Browser extension for web terminals
- [ ] LangChain/LlamaIndex integration packages
- [ ] VS Code extension

## License

MIT - See [LICENSE](LICENSE) for details.

## Acknowledgments

Built with:
- [node-pty](https://github.com/microsoft/node-pty) - PTY bindings
- [xterm-headless](https://github.com/xtermjs/xterm.js) - Terminal emulation
- [MCP SDK](https://github.com/modelcontextprotocol/sdk) - Protocol implementation

---

<p align="center">
  <b>Make your AI agents understand terminals.</b><br>
  <a href="https://github.com/semantic-terminal/semantic-terminal">GitHub</a> •
  <a href="https://www.npmjs.com/package/@semantic-terminal/mcp">npm</a> •
  <a href="https://github.com/semantic-terminal/semantic-terminal/issues">Issues</a>
</p>
