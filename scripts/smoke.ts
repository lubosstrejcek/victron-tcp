/**
 * Smoke test: boot the built server over stdio and verify it (1) advertises its
 * capabilities and (2) can perform a real end-to-end Modbus read against the
 * bundled simulator. Catches regressions the unit tests cannot see, since they
 * never spawn the server or exercise the transport/decoder path together.
 *
 * Run after `npm run build`. The CLI equivalent for ad-hoc poking is
 * `npm run inspect:cli`.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createSimulatorServer } from './modbus-simulator.js';

const EXPECTED = { tools: 32, prompts: 23, resources: 2 } as const;
const BATTERY_UNIT_ID = 247;

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverEntry = join(__dirname, '..', 'dist', 'index.js');

const failures: string[] = [];

function check(label: string, condition: boolean): void {
  if (!condition) {
    failures.push(label);
  }
}

async function main(): Promise<void> {
  if (!existsSync(serverEntry)) {
    console.error(`Server entry not found at ${serverEntry}. Run "npm run build" first.`);
    process.exit(1);
  }

  const transport = new StdioClientTransport({ command: process.execPath, args: [serverEntry] });
  const client = new Client({ name: 'victron-tcp-smoke', version: '0.0.0' });
  await client.connect(transport);

  // 1. Capabilities
  const { tools } = await client.listTools();
  const { prompts } = await client.listPrompts();
  const { resources } = await client.listResources();
  const actual = { tools: tools.length, prompts: prompts.length, resources: resources.length };
  console.log(`Capabilities: ${JSON.stringify(actual)}`);

  for (const key of ['tools', 'prompts', 'resources'] as const) {
    check(`${key}: expected ${EXPECTED[key]}, got ${actual[key]}`, actual[key] === EXPECTED[key]);
  }

  // 2. End-to-end Modbus read against the simulator on an ephemeral port.
  const simulator = await createSimulatorServer(0);
  const port = (simulator.server.address() as AddressInfo).port;

  try {
    const result = await client.callTool({
      name: 'victron_battery_status',
      arguments: { host: '127.0.0.1', port, unitId: BATTERY_UNIT_ID, transport: 'modbus' },
    });

    const text = Array.isArray(result.content)
      ? result.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
      : '';
    const readings = (result.structuredContent as { readings?: unknown[] } | undefined)?.readings;

    check('battery read returned isError', result.isError !== true);
    check('battery read produced no readings', Array.isArray(readings) && readings.length > 0);
    check('battery read missing decoded "State of charge"', text.includes('State of charge'));
    console.log(`Modbus read: ${result.isError ? 'ERROR' : 'ok'}, ${readings?.length ?? 0} readings`);
  } finally {
    await simulator.stop();
    await client.close();
  }

  if (failures.length > 0) {
    console.error('Smoke test FAILED:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error('If a capability change was intentional, update EXPECTED in scripts/smoke.ts.');
    process.exit(1);
  }

  console.log('Smoke test passed.');
}

main().catch((error) => {
  console.error(`Smoke test error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
