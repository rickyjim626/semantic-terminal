# LangChain Integration

This guide shows how to use Semantic Terminal with LangChain agents.

## Installation

```bash
npm install @semantic-terminal/core langchain @langchain/openai
```

## Basic Usage

```typescript
import { SemanticTerminal, createShellPreset } from '@semantic-terminal/core';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';

// Create semantic terminal
const terminal = new SemanticTerminal({
  cwd: process.cwd(),
  preset: createShellPreset(),
});

await terminal.start();

// Define the terminal tool for LangChain
const terminalTool = {
  name: 'terminal',
  description: 'Execute shell commands and get semantic output. Returns structured data with error detection and suggestions.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
    },
    required: ['command'],
  },
  func: async ({ command }) => {
    const result = await terminal.exec(command);
    return JSON.stringify(result, null, 2);
  },
};

// Create LangChain agent
const model = new ChatOpenAI({ modelName: 'gpt-4' });
const tools = [terminalTool];
const agent = await createOpenAIFunctionsAgent({
  llm: model,
  tools,
  prompt: /* your prompt */,
});

const executor = new AgentExecutor({ agent, tools });

// Run the agent
const result = await executor.invoke({
  input: 'Check if there are any linting errors in the project and fix them',
});

console.log(result.output);

// Cleanup
await terminal.close();
```

## Advanced: Custom Tool with Confirmation Handling

```typescript
import { SemanticTerminal, createShellPreset, ConfirmInfo } from '@semantic-terminal/core';

class SemanticTerminalTool {
  private terminal: SemanticTerminal;
  private autoConfirm: Set<string> = new Set();

  constructor(cwd: string) {
    this.terminal = new SemanticTerminal({
      cwd,
      preset: createShellPreset(),
    });

    // Handle confirmations
    this.terminal.on('confirm_required', (info: ConfirmInfo) => {
      if (this.shouldAutoConfirm(info)) {
        this.terminal.confirm({ action: 'confirm' });
      }
    });
  }

  async start() {
    await this.terminal.start();
  }

  private shouldAutoConfirm(info: ConfirmInfo): boolean {
    // Auto-confirm safe operations
    if (info.tool?.name && this.autoConfirm.has(info.tool.name)) {
      return true;
    }
    // Never auto-confirm destructive operations
    if (info.prompt.toLowerCase().includes('delete') ||
        info.prompt.toLowerCase().includes('remove')) {
      return false;
    }
    return false;
  }

  allowAutoConfirm(toolName: string) {
    this.autoConfirm.add(toolName);
  }

  async execute(command: string, timeoutMs = 30000) {
    return await this.terminal.exec(command, timeoutMs);
  }

  async close() {
    await this.terminal.close();
  }
}

// Usage
const tool = new SemanticTerminalTool('/my/project');
await tool.start();
tool.allowAutoConfirm('Read');  // Auto-confirm file reads

const result = await tool.execute('cat package.json');
console.log(result);

await tool.close();
```

## With LangGraph

```typescript
import { StateGraph, END } from '@langchain/langgraph';
import { SemanticTerminal } from '@semantic-terminal/core';

// Define state
interface AgentState {
  task: string;
  terminalOutput: any;
  error: string | null;
  retryCount: number;
}

// Create terminal
const terminal = new SemanticTerminal({ cwd: process.cwd() });
await terminal.start();

// Define nodes
const executeCommand = async (state: AgentState) => {
  const result = await terminal.exec(state.task);
  return {
    ...state,
    terminalOutput: result,
    error: result.severity === 'error' ? result.raw : null,
  };
};

const handleError = async (state: AgentState) => {
  const output = state.terminalOutput;
  if (output.suggestions?.length > 0) {
    const suggestion = output.suggestions[0];
    if (suggestion.automated) {
      const retryResult = await terminal.exec(suggestion.action);
      return {
        ...state,
        terminalOutput: retryResult,
        error: retryResult.severity === 'error' ? retryResult.raw : null,
        retryCount: state.retryCount + 1,
      };
    }
  }
  return state;
};

// Build graph
const graph = new StateGraph<AgentState>()
  .addNode('execute', executeCommand)
  .addNode('handle_error', handleError)
  .addEdge('__start__', 'execute')
  .addConditionalEdges('execute', (state) =>
    state.error && state.retryCount < 3 ? 'handle_error' : END
  )
  .addEdge('handle_error', 'execute');

const app = graph.compile();

// Run
const result = await app.invoke({
  task: 'npm install',
  terminalOutput: null,
  error: null,
  retryCount: 0,
});
```

## Benefits

1. **Structured Output**: Get parsed data instead of raw text
2. **Error Awareness**: Know when commands fail and why
3. **Auto-Recovery**: Use suggestions to automatically fix issues
4. **State Tracking**: Know exactly what state the terminal is in
5. **Confirmation Handling**: Programmatically handle Y/n prompts
