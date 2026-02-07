import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withModbusClient } from '../modbus/client.js';
import { gridRegisters } from '../registers/index.js';
import { formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerGridTools(server: McpServer): void {
  server.registerTool(
    'victron_grid_status',
    {
      title: 'Grid Meter Status',
      description: 'Get grid meter data: power per phase (L1/L2/L3), voltage, current, frequency, and energy counters (forward/reverse). Specify unitId for the grid meter (check victron_discover to find it).',
      inputSchema: {
        host: z.string().describe('GX device IP address or hostname'),
        port: z.number().default(502).describe('Modbus TCP port'),
        unitId: z.number().default(30).describe('Modbus unit ID for the grid meter'),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId }) => {
      try {
        const results = await withModbusClient(host, port, unitId, async (client) => {
          return client.readRegisters(gridRegisters.registers);
        });
        return formatResults('Grid Meter Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
