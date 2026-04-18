import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';

async function createTestClient(): Promise<Client> {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return client;
}

describe('MCP Server', () => {
  describe('tools', () => {
    it('lists all 32 tools', async () => {
      const client = await createTestClient();
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(32);
      await client.close();
    });

    it('every tool has name, description, and inputSchema', async () => {
      const client = await createTestClient();
      const { tools } = await client.listTools();

      for (const tool of tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
      }

      await client.close();
    });

    it('every tool has annotations', async () => {
      const client = await createTestClient();
      const { tools } = await client.listTools();

      for (const tool of tools) {
        expect(tool.annotations).toBeDefined();
        expect(typeof tool.annotations!.readOnlyHint).toBe('boolean');
        expect(typeof tool.annotations!.destructiveHint).toBe('boolean');
        expect(typeof tool.annotations!.idempotentHint).toBe('boolean');
        expect(typeof tool.annotations!.openWorldHint).toBe('boolean');
      }

      await client.close();
    });

    it('all tools are currently read-only', async () => {
      const client = await createTestClient();
      const { tools } = await client.listTools();

      for (const tool of tools) {
        expect(tool.annotations!.readOnlyHint).toBe(true);
        expect(tool.annotations!.destructiveHint).toBe(false);
      }

      await client.close();
    });

    it('every tool declares outputSchema', async () => {
      const client = await createTestClient();
      const { tools } = await client.listTools();

      const withOutput = tools.filter(t => t.outputSchema);
      expect(withOutput.length).toBe(tools.length);

      for (const tool of withOutput) {
        const schema = tool.outputSchema as { type?: string; properties?: Record<string, unknown> };
        expect(schema.type === 'object' || schema.properties !== undefined).toBe(true);
      }

      await client.close();
    });

    it('tool names follow victron_ prefix convention', async () => {
      const client = await createTestClient();
      const { tools } = await client.listTools();

      for (const tool of tools) {
        expect(tool.name).toMatch(/^victron_/);
      }

      await client.close();
    });
  });

  describe('prompts', () => {
    it('lists all 23 prompts', async () => {
      const client = await createTestClient();
      const { prompts } = await client.listPrompts();
      expect(prompts).toHaveLength(23);
      await client.close();
    });

    it('prompts have names and descriptions', async () => {
      const client = await createTestClient();
      const { prompts } = await client.listPrompts();

      const names = prompts.map(p => p.name).sort();
      expect(names).toEqual([
        'commissioning', 'daily-report', 'device-inventory', 'diagnose-system',
        'energy-optimizer', 'ess-tuning', 'find-devices', 'firmware-check',
        'generator-management', 'hourly-snapshot', 'identify-device',
        'monthly-analysis', 'mqtt-debug', 'nodered-check', 'register-explorer',
        'setup-guide', 'site-audit', 'solar-performance', 'storm-prep',
        'system-topology', 'tank-monitor', 'troubleshoot',
        'weekly-review',
      ]);

      for (const prompt of prompts) {
        expect(prompt.description).toBeTruthy();
      }

      await client.close();
    });

    it('setup-guide prompt returns messages', async () => {
      const client = await createTestClient();
      const result = await client.getPrompt({ name: 'setup-guide' });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content).toMatchObject({ type: 'text' });

      const text = (result.messages[0].content as { type: 'text'; text: string }).text;
      expect(text).toContain('victron_network_scan');
      expect(text).toContain('victron_setup');

      await client.close();
    });

    it('diagnose-system prompt accepts host arg', async () => {
      const client = await createTestClient();
      const result = await client.getPrompt({
        name: 'diagnose-system',
        arguments: { host: '192.168.1.50' },
      });

      const text = (result.messages[0].content as { type: 'text'; text: string }).text;
      expect(text).toContain('192.168.1.50');

      await client.close();
    });
  });

  describe('resources', () => {
    it('lists all 2 resources', async () => {
      const client = await createTestClient();
      const { resources } = await client.listResources();
      expect(resources).toHaveLength(2);
      await client.close();
    });

    it('register-list resource contains register data', async () => {
      const client = await createTestClient();
      const result = await client.readResource({ uri: 'victron://register-list' });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe('text/markdown');

      const text = result.contents[0].text!;
      expect(text).toContain('com.victronenergy.system');
      expect(text).toContain('Battery Voltage');
      expect(text.split('\n').length).toBeGreaterThan(900);

      await client.close();
    });

    it('unit-id-mapping resource contains mapping table', async () => {
      const client = await createTestClient();
      const result = await client.readResource({ uri: 'victron://unit-id-mapping' });

      const text = result.contents[0].text!;
      expect(text).toContain('Unit ID Mapping');

      await client.close();
    });

  });

  describe('tool execution', () => {
    it('victron_list_registers returns structured content', async () => {
      const client = await createTestClient();
      const result = await client.callTool({
        name: 'victron_list_registers',
        arguments: { category: 'gps' },
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);

      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('GPS');
      expect(text).toContain('Latitude');

      expect(result.structuredContent).toBeDefined();
      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc.service).toBe('com.victronenergy.gps');
      expect(sc.registerCount).toBe(7);
      expect(Array.isArray(sc.registers)).toBe(true);

      await client.close();
    });

    it('victron_list_registers returns error for invalid category', async () => {
      const client = await createTestClient();
      const result = await client.callTool({
        name: 'victron_list_registers',
        arguments: { category: 'nonexistent_xyz' },
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('not found');

      await client.close();
    });

    it('victron_search_docs finds battery registers', async () => {
      const client = await createTestClient();
      const result = await client.callTool({
        name: 'victron_search_docs',
        arguments: { query: 'State of charge', source: 'registers', maxResults: 5 },
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('State of charge');
      expect(text).toContain('register-list');

      await client.close();
    });

    it('victron_search_docs returns fallback for no results', async () => {
      const client = await createTestClient();
      const result = await client.callTool({
        name: 'victron_search_docs',
        arguments: { query: 'xyznonexistent12345', source: 'all', maxResults: 10 },
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('No results found');
      expect(text).toContain('victron_check_online');

      await client.close();
    });

    it('victron_check_online returns URL and version info', async () => {
      const client = await createTestClient();
      const result = await client.callTool({
        name: 'victron_check_online',
        arguments: { source: 'modbus-faq' },
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('victronenergy.com');
      expect(text).toContain('Rev 3.71');

      await client.close();
    });
  });
});
