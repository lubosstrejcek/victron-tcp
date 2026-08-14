import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import { createSimulatorServer, type SimulatorServer } from '../scripts/modbus-simulator.js';
import { resetConfigForTesting } from '../src/config.js';

// Regression tests for issue #44: tools rejected calls omitting `host` at the
// schema level, so the documented VICTRON_HOST/VICTRON_MODBUS_PORT env-var
// fallbacks were unreachable.

const TEST_PORT = 15503;
const ENV_KEYS = ['VICTRON_TRANSPORT', 'VICTRON_HOST', 'VICTRON_MODBUS_PORT', 'VICTRON_MQTT_PORT', 'VICTRON_PORTAL_ID', 'VICTRON_UNIT_ID'];

let simulator: SimulatorServer;
const originalEnv = { ...process.env };

beforeAll(async () => {
  simulator = await createSimulatorServer(TEST_PORT);
});

afterAll(async () => {
  await simulator.stop();
  process.env = { ...originalEnv };
});

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  resetConfigForTesting();
});

async function createTestClient(): Promise<Client> {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

describe('env var fallback (issue #44)', () => {
  it('device tool works with no host argument when VICTRON_HOST is set', async () => {
    process.env['VICTRON_HOST'] = '127.0.0.1';
    process.env['VICTRON_MODBUS_PORT'] = String(TEST_PORT);
    resetConfigForTesting();

    const client = await createTestClient();
    const result = await client.callTool({ name: 'victron_battery_status', arguments: {} });

    expect(result.isError).not.toBe(true);
    const readings = (result.structuredContent as { readings: unknown[] }).readings;
    expect(readings.length).toBeGreaterThan(0);
    await client.close();
  });

  it('victron_read_register falls back to VICTRON_HOST, VICTRON_MODBUS_PORT, and VICTRON_UNIT_ID', async () => {
    process.env['VICTRON_HOST'] = '127.0.0.1';
    process.env['VICTRON_MODBUS_PORT'] = String(TEST_PORT);
    process.env['VICTRON_UNIT_ID'] = '100';
    resetConfigForTesting();

    const client = await createTestClient();
    // Register 800 (system serial) exists on unit 100 in the simulator.
    const result = await client.callTool({
      name: 'victron_read_register',
      arguments: { address: 800, count: 6, dataType: 'string' },
    });

    expect(result.isError).not.toBe(true);
    expect((result.structuredContent as { address: number }).address).toBe(800);
    await client.close();
  });

  it('returns an actionable error (not schema rejection) when host is missing everywhere', async () => {
    const client = await createTestClient();
    const result = await client.callTool({ name: 'victron_battery_status', arguments: {} });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Host is required');
    expect(text).toContain('VICTRON_HOST');
    await client.close();
  });

  it('explicit host argument overrides VICTRON_HOST', async () => {
    // Env points at a blackhole; the explicit argument must win.
    process.env['VICTRON_HOST'] = '192.0.2.1';
    resetConfigForTesting();

    const client = await createTestClient();
    const result = await client.callTool({
      name: 'victron_battery_status',
      arguments: { host: '127.0.0.1', port: TEST_PORT },
    });

    expect(result.isError).not.toBe(true);
    await client.close();
  });

  it('victron_evcs_status still requires an explicit host (targets the EVCS, not the GX)', async () => {
    process.env['VICTRON_HOST'] = '127.0.0.1';
    resetConfigForTesting();

    const client = await createTestClient();
    const result = await client.callTool({ name: 'victron_evcs_status', arguments: {} });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toMatch(/host/i);
    await client.close();
  });
});
