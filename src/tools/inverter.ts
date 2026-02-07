import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withModbusClient } from '../modbus/client.js';
import { inverterRegisters } from '../registers/index.js';
import { formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerInverterTools(server: McpServer): void {
  server.registerTool(
    'victron_inverter_status',
    {
      title: 'Inverter Status',
      description: 'Get standalone inverter data (Phoenix, Inverter RS, VE.Direct inverters): AC output voltage, current, power, frequency, state, and alarms. This is for standalone inverters — for Multi/Quattro, use victron_vebus_status instead.',
      inputSchema: {
        host: z.string().describe('GX device IP address or hostname'),
        port: z.number().default(502).describe('Modbus TCP port'),
        unitId: z.number().default(232).describe('Modbus unit ID for the inverter'),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId }) => {
      try {
        const results = await withModbusClient(host, port, unitId, async (client) => {
          return client.readRegisters(inverterRegisters.registers);
        });
        return formatResults('Inverter Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
