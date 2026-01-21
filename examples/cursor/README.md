# Cursor IDE Integration

This guide shows how to integrate Semantic Terminal with Cursor IDE.

## Configuration

Cursor supports MCP servers through its settings. Add the following to your Cursor settings:

1. Open Cursor Settings (`Cmd+,` or `Ctrl+,`)
2. Search for "MCP" or navigate to Extensions > MCP
3. Add a new MCP server configuration:

```json
{
  "mcp.servers": {
    "semantic-terminal": {
      "command": "npx",
      "args": ["@semantic-terminal/mcp"]
    }
  }
}
```

## Usage with Cursor Composer

In Cursor's Composer, you can now use terminal commands with semantic understanding:

### Example 1: Build and Fix

```
Build the project and fix any TypeScript errors
```

Cursor + Semantic Terminal will:
1. Run `npm run build`
2. Parse TypeScript errors semantically
3. Show you the specific files and line numbers
4. Suggest fixes

### Example 2: Test Coverage

```
Run tests and show me which files have low coverage
```

### Example 3: Dependency Analysis

```
Check for outdated dependencies and update the safe ones
```

## Benefits over Built-in Terminal

| Feature | Built-in Terminal | Semantic Terminal |
|---------|-------------------|-------------------|
| Error parsing | Raw text | Structured |
| Suggestions | None | Actionable |
| State awareness | Limited | Full |
| Confirmation handling | Manual | Automatic |

## Tips

1. **Use natural language**: Describe what you want to achieve, not the exact commands.
2. **Chain operations**: "Build, test, and deploy if all tests pass"
3. **Error recovery**: Semantic Terminal can automatically retry with different flags.
