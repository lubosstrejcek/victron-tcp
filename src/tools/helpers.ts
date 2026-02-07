import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { RegisterReadResult } from '../modbus/types.js';

export function formatResults(title: string, results: RegisterReadResult[]): CallToolResult {
  const lines: string[] = [`# ${title}\n`];

  for (const result of results) {
    if (result.value === 'Not available' || result.value === 'Error reading register') continue;
    const val = result.enumLabel ?? `${result.value}${result.unit ? ' ' + result.unit : ''}`;
    lines.push(`- **${result.description}**: ${val}`);
  }

  if (lines.length === 1) {
    lines.push('No data available. The device may be disconnected or the unit ID may be incorrect.');
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

export function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}

export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export const DISCOVERY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;
