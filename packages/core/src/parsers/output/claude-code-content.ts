/**
 * Claude Code Content Parser
 * Parses Claude's text responses (lines starting with ⏺)
 */

import type {
  OutputParser,
  ParserContext,
  SemanticOutput,
  ClaudeCodeContent,
} from '../../core/types.js';
import { BaseOutputParser } from '../base.js';

// Claude response marker
const RESPONSE_MARKER = '⏺';

// Separator line pattern (used to detect response boundaries)
const SEPARATOR_PATTERN = /^[─━═]+$/;
const STATUSBAR_PATTERN = /esc to interrupt/i;
const SPINNER_ONLY_PATTERN = /^[·✻✽✶✳✢⠐⠂⠈⠁⠉⠃⠋⠓⠒⠖⠦⠤]+$/;

export class ClaudeCodeContentParser extends BaseOutputParser<ClaudeCodeContent> implements OutputParser<ClaudeCodeContent> {
  meta = {
    name: 'claude-code-content',
    description: 'Parses Claude Code text responses',
    priority: 90,
    version: '1.0.0',
  };

  canParse(context: ParserContext): boolean {
    // Check screenText for response marker (not just lastLines - long responses may scroll)
    return context.screenText.includes(RESPONSE_MARKER);
  }

  parse(context: ParserContext): SemanticOutput<ClaudeCodeContent> | null {
    const lines = context.screenText.split('\n');

    // Find the LAST response marker (most recent Claude response)
    let lastMarkerIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith(RESPONSE_MARKER)) {
        // Skip tool output markers (⏺ followed by a tool header)
        if (this.isToolHeader(lines, i)) {
          continue;
        }
        lastMarkerIndex = i;
        break;
      }
    }

    if (lastMarkerIndex === -1) {
      return null;
    }

    // Collect content from the last marker forward
    const contentLines: string[] = [];
    let foundSeparator = false;

    for (let i = lastMarkerIndex; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // First line: extract content after marker
      if (i === lastMarkerIndex) {
        const content = trimmed.slice(RESPONSE_MARKER.length).trim();
        if (content) {
          contentLines.push(content);
        }
        continue;
      }

      // Check for separator (end of response)
      if (SEPARATOR_PATTERN.test(trimmed)) {
        foundSeparator = true;
        break;
      }

      // Check for prompt (end of response)
      if (trimmed.startsWith('❯') || trimmed.startsWith('>')) {
        break;
      }

      // Check for new response marker (another ⏺ block)
      if (trimmed.startsWith(RESPONSE_MARKER)) {
        break;
      }

      // Skip tool output lines
      if (trimmed.startsWith('│')) {
        continue;
      }
      if (trimmed.startsWith('⎿')) {
        continue;
      }

      // Skip status bar and spinner-only lines (but keep legitimate content like "· bullet")
      if (STATUSBAR_PATTERN.test(trimmed) || SPINNER_ONLY_PATTERN.test(trimmed)) {
        continue;
      }

      if (trimmed.length > 0) {
        contentLines.push(trimmed);
      }
    }

    if (contentLines.length === 0) {
      return null;
    }

    const content = contentLines.join('\n').trim();

    const data: ClaudeCodeContent = {
      role: 'assistant',
      content,
      isComplete: foundSeparator,
    };

    return this.createOutput('claude-content', content, data, 0.9);
  }

  /**
   * Check if a line is a tool header (not regular content)
   * Tool headers have format: "ToolName" or "ToolName (completed in Xs)"
   * Must be exact tool name, not just starting with tool name
   */
  private isToolHeader(lines: string[], markerIndex: number): boolean {
    const markerLine = lines[markerIndex]?.trim() ?? '';
    const afterMarker = markerLine.slice(RESPONSE_MARKER.length).trim();
    if (!afterMarker) return false;

    // Inline tool headers look like: "ToolName(args...)" (no space before '(')
    const inlineHeaderMatch = afterMarker.match(/^(\w+)\(.+\)$/);
    if (inlineHeaderMatch) {
      const toolName = inlineHeaderMatch[1] ?? '';
      const knownTools = [
        'Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep',
        'WebFetch', 'WebSearch', 'Task', 'LSP', 'NotebookEdit',
        'TodoRead', 'TodoWrite', 'AskUserQuestion', 'Skill', 'Search',
      ];
      if (knownTools.includes(toolName)) {
        return true;
      }
    }

    // Tool header patterns:
    // "Bash" (just tool name)
    // "Bash (completed in 0.5s)" (with completion time)
    // Must be exact header shape, not "Bash is a shell" (which is content)
    const headerLike = /^(\w+)(?:\s+\(completed\s+in\s+[\d.]+s?\))?$/i.test(afterMarker);
    if (!headerLike) return false;

    const firstToken = afterMarker.split(/\s+/)[0] ?? '';
    const knownTools = [
      'Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep',
      'WebFetch', 'WebSearch', 'Task', 'LSP', 'NotebookEdit',
      'TodoRead', 'TodoWrite', 'AskUserQuestion', 'Skill',
    ];
    if (knownTools.includes(firstToken)) {
      return true;
    }

    // Structural detection: tool headers are immediately followed by │ lines
    for (let j = markerIndex + 1; j < Math.min(lines.length, markerIndex + 6); j++) {
      const t = lines[j]?.trim() ?? '';
      if (!t) continue;
      if (t.startsWith('│')) return true;
      if (t.startsWith('⎿')) return true;

      // If we hit another boundary before seeing tool content, treat as normal content
      if (SEPARATOR_PATTERN.test(t) || t.startsWith('❯') || t.startsWith('>') || t.startsWith(RESPONSE_MARKER)) {
        break;
      }
    }

    return false;
  }
}

/**
 * Create a Claude Code content parser instance
 */
export function createClaudeCodeContentParser(): ClaudeCodeContentParser {
  return new ClaudeCodeContentParser();
}

export const claudeCodeContentParser = new ClaudeCodeContentParser();
