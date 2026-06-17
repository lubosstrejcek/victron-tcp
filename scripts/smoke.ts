/**
 * Smoke test: boot the built server over stdio and verify it advertises its
 * capabilities. Catches regressions where the server fails to start or a
 * tool/prompt/resource registration is dropped — the kind of thing the unit
 * tests (which never spawn the server) cannot see.
 *
 * Run after `npm run build`. The CLI equivalent for ad-hoc poking is
 * `npm run inspect:cli`.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const EXPECTED = { tools: 32, prompts: 23, resources: 2 } as const;

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverEntry = join(__dirname, '..', 'dist', 'index.js');

async function main(): Promise<void> {
  if (!existsSync(serverEntry)) {
    console.error(`Server entry not found at ${serverEntry}. Run "npm run build" first.`);
    process.exit(1);
  }

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
  });
  const client = new Client({ name: 'victron-tcp-smoke', version: '0.0.0' });

  await client.connect(transport);

  const { tools } = await client.listTools();
  const { prompts } = await client.listPrompts();
  const { resources } = await client.listResources();

  await client.close();

  const actual = {
    tools: tools.length,
    prompts: prompts.length,
    resources: resources.length,
  };
  console.log(`Capabilities: ${JSON.stringify(actual)}`);

  const failures: string[] = [];
  for (const key of ['tools', 'prompts', 'resources'] as const) {
    if (actual[key] !== EXPECTED[key]) {
      failures.push(`${key}: expected ${EXPECTED[key]}, got ${actual[key]}`);
    }
  }

  if (failures.length > 0) {
    console.error('Smoke test FAILED:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error('If the change was intentional, update EXPECTED in scripts/smoke.ts.');
    process.exit(1);
  }

  console.log('Smoke test passed.');
}

main().catch((error) => {
  console.error(`Smoke test error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
