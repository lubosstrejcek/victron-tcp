import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withModbusClient } from '../modbus/client.js';
import { tankRegisters } from '../registers/index.js';
import { formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerTankTools(server: McpServer): void {
  server.registerTool(
    'victron_tank_levels',
    {
      title: 'Tank Levels',
      description: 'Get tank sensor data: level, capacity, remaining, and fluid type (fuel, fresh water, waste water, live well, oil, black water, gasoline). Specify unitId for the tank sensor (check victron_discover to find it).',
      inputSchema: {
        host: z.string().describe('GX device IP address or hostname'),
        port: z.number().default(502).describe('Modbus TCP port'),
        unitId: z.number().default(20).describe('Modbus unit ID for the tank sensor'),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId }) => {
      try {
        const results = await withModbusClient(host, port, unitId, async (client) => {
          return client.readRegisters(tankRegisters.registers);
        });
        return formatResults('Tank Sensor Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
