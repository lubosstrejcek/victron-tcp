/**
 * Smoke test: boot the built server over stdio and verify it (1) advertises its
 * capabilities, (2) performs a real end-to-end Modbus read against the bundled
 * simulator, and (3) performs an end-to-end MQTT read against an in-process
 * broker that emulates the GX (including the full_publish_completed signal).
 * Catches regressions the unit tests cannot see, since they never spawn the
 * server or exercise the transport/decoder path together.
 *
 * Run after `npm run build`. The CLI equivalent for ad-hoc poking is
 * `npm run inspect:cli`.
 */

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createNetServer } from 'node:net';
import type { AddressInfo, Socket } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createSimulatorServer } from './modbus-simulator.js';

const require = createRequire(import.meta.url);

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

function resultText(result: { content?: unknown }): string {
  return Array.isArray(result.content)
    ? result.content.map((c) => (c && (c as { type?: string }).type === 'text' ? (c as { text: string }).text : '')).join('\n')
    : '';
}

function readingsCount(result: { structuredContent?: unknown }): number {
  const readings = (result.structuredContent as { readings?: unknown[] } | undefined)?.readings;
  return Array.isArray(readings) ? readings.length : 0;
}

async function checkCapabilities(client: Client): Promise<void> {
  const { tools } = await client.listTools();
  const { prompts } = await client.listPrompts();
  const { resources } = await client.listResources();
  const actual = { tools: tools.length, prompts: prompts.length, resources: resources.length };
  console.log(`Capabilities: ${JSON.stringify(actual)}`);

  for (const key of ['tools', 'prompts', 'resources'] as const) {
    check(`${key}: expected ${EXPECTED[key]}, got ${actual[key]}`, actual[key] === EXPECTED[key]);
  }
}

async function checkModbusRead(client: Client): Promise<void> {
  const simulator = await createSimulatorServer(0);
  const port = (simulator.server.address() as AddressInfo).port;
  try {
    const result = await client.callTool({
      name: 'victron_battery_status',
      arguments: { host: '127.0.0.1', port, unitId: BATTERY_UNIT_ID, transport: 'modbus' },
    });
    const text = resultText(result);
    check('modbus read returned isError', result.isError !== true);
    check('modbus read produced no readings', readingsCount(result) > 0);
    check('modbus read missing decoded "State of charge"', text.includes('State of charge'));
    console.log(`Modbus read: ${result.isError ? 'ERROR' : 'ok'}, ${readingsCount(result)} readings`);
  } finally {
    await simulator.stop();
  }
}

// Minimal MQTT broker that emulates a GX: it answers CONNECT/SUBSCRIBE/PINGREQ
// and, when the server publishes its keepalive request, pushes a single battery
// value plus the full_publish_completed signal. The server should then return
// promptly via that signal — exercising the MQTT read path end to end even
// though most requested registers are never published.
function startFakeGxBroker(portalId: string, publishOnKeepalive: Record<string, number>) {
  const mqttPacket = require('mqtt-packet');
  const sockets = new Set<Socket>();

  const server = createNetServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    const parser = mqttPacket.parser({ protocolVersion: 4 });
    parser.on('packet', (pkt: { cmd: string; messageId?: number; topic?: string; subscriptions?: unknown[] }) => {
      if (pkt.cmd === 'connect') {
        socket.write(mqttPacket.generate({ cmd: 'connack', returnCode: 0, sessionPresent: false }));
      } else if (pkt.cmd === 'subscribe') {
        socket.write(mqttPacket.generate({ cmd: 'suback', messageId: pkt.messageId, granted: (pkt.subscriptions ?? []).map(() => 0) }));
      } else if (pkt.cmd === 'pingreq') {
        socket.write(mqttPacket.generate({ cmd: 'pingresp' }));
      } else if (pkt.cmd === 'publish' && String(pkt.topic).endsWith('/keepalive')) {
        for (const [topic, value] of Object.entries(publishOnKeepalive)) {
          socket.write(mqttPacket.generate({ cmd: 'publish', topic, payload: JSON.stringify({ value }), qos: 0, retain: false, dup: false }));
        }
      }
    });
    parser.on('error', () => socket.destroy());
    socket.on('data', (chunk) => parser.parse(chunk));
    socket.on('error', () => {});
  });

  const listen = (): Promise<number> =>
    new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)));

  // Destroy live sockets before closing: the server keeps an MQTT connection
  // pooled for ~30s, so a plain server.close() would block until that TTL.
  const stop = (): Promise<void> =>
    new Promise((resolve) => {
      for (const socket of sockets) {
        socket.destroy();
      }
      server.close(() => resolve());
    });

  return { listen, stop };
}

async function checkMqttRead(client: Client): Promise<void> {
  const portalId = 'smoke-portal';
  const broker = startFakeGxBroker(portalId, {
    [`N/${portalId}/battery/0/Soc`]: 85,
    [`N/${portalId}/full_publish_completed`]: 1,
  });
  const port = await broker.listen();

  try {
    const result = await client.callTool({
      name: 'victron_battery_status',
      arguments: { host: '127.0.0.1', mqttPort: port, portalId, deviceInstance: '0', transport: 'mqtt' },
    });
    const text = resultText(result);
    check('mqtt read returned isError', result.isError !== true);
    check('mqtt read missing decoded "State of charge"', text.includes('State of charge'));
    check('mqtt read missing published SOC value 85', /State of charge\D+85\b/.test(text));
    console.log(`MQTT read: ${result.isError ? 'ERROR' : 'ok'}`);
  } finally {
    await broker.stop();
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

  try {
    await checkCapabilities(client);
    await checkModbusRead(client);
    await checkMqttRead(client);
  } finally {
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
