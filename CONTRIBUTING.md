# Contributing to Semantic Terminal

Thank you for your interest in contributing to Semantic Terminal!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/semantic-terminal/semantic-terminal.git
cd semantic-terminal

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode
pnpm dev
```

## Project Structure

```
semantic-terminal/
├── packages/
│   ├── core/           # @semantic-terminal/core - Core library
│   └── mcp-server/     # @semantic-terminal/mcp - MCP Server
├── examples/           # Usage examples
└── docs/               # Documentation
```

## Making Changes

1. **Fork** the repository
2. **Create a branch** for your feature: `git checkout -b feature/my-feature`
3. **Make changes** and write tests if applicable
4. **Build** to ensure everything compiles: `pnpm build`
5. **Commit** with a descriptive message
6. **Push** to your fork and create a **Pull Request**

## Adding a New Parser

Parsers are the core of Semantic Terminal. To add a new parser:

### State Parser

```typescript
// packages/core/src/parsers/state/my-tool.ts
import { BaseStateParser } from '../base.js';
import type { ParserContext, StateDetectionResult } from '../../core/types.js';

export class MyToolStateParser extends BaseStateParser {
  meta = {
    name: 'my-tool-state',
    description: 'Detect state for my-tool CLI',
    priority: 50,
  };

  detectState(context: ParserContext): StateDetectionResult | null {
    const { lastLines } = context;

    // Your detection logic here
    if (this.containsAny(lastLines.join('\n'), ['Ready>', 'my-tool>'])) {
      return { state: 'idle', confidence: 0.9 };
    }

    return null;
  }
}

export const myToolStateParser = new MyToolStateParser();
```

### Output Parser

```typescript
// packages/core/src/parsers/output/my-format.ts
import { BaseOutputParser } from '../base.js';
import type { ParserContext, SemanticOutput } from '../../core/types.js';

export class MyFormatOutputParser extends BaseOutputParser<MyDataType> {
  meta = {
    name: 'my-format',
    description: 'Parse my-format output',
    priority: 50,
  };

  canParse(context: ParserContext): boolean {
    return context.screenText.includes('MY-FORMAT-MARKER');
  }

  parse(context: ParserContext): SemanticOutput<MyDataType> | null {
    // Your parsing logic here
    const data = parseMyFormat(context.screenText);
    return this.createOutput('json', context.screenText, data, 0.9);
  }
}
```

### Register Your Parser

Add your parser to the appropriate preset or create a new preset.

## Code Style

- Use TypeScript for all code
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/core && pnpm test
```

## Commit Messages

Use conventional commit format:

- `feat: add new parser for X`
- `fix: handle edge case in table parser`
- `docs: update README with examples`
- `refactor: simplify state detection logic`

## Questions?

Open an issue on GitHub or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
