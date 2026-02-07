import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withModbusClient } from '../modbus/client.js';
import { batteryRegisters } from '../registers/index.js';
import { formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerBatteryTools(server: McpServer): void {
  server.registerTool(
    'victron_battery_status',
    {
      title: 'Battery Status',
      description: 'Get detailed battery monitor data: SOC, voltage, current, power, temperature, cell voltages, time-to-go, history, and alarms. Specify unitId for the battery monitor (check victron_discover to find it).',
      inputSchema: {
        host: z.string().describe('GX device IP address or hostname'),
        port: z.number().default(502).describe('Modbus TCP port'),
        unitId: z.number().default(247).describe('Modbus unit ID for the battery monitor'),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId }) => {
      try {
        const results = await withModbusClient(host, port, unitId, async (client) => {
          return client.readRegisters(batteryRegisters.registers);
        });
        return formatResults('Battery Monitor Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
