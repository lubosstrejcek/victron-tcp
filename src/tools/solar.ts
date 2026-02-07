import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withModbusClient } from '../modbus/client.js';
import { solarRegisters } from '../registers/index.js';
import { formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerSolarTools(server: McpServer): void {
  server.registerTool(
    'victron_solar_status',
    {
      title: 'Solar Charger Status',
      description: 'Get solar charger data: PV voltage, current, power, yield today/yesterday/total, charger state, error code, and tracker data. Specify unitId for the solar charger (check victron_discover to find it).',
      inputSchema: {
        host: z.string().describe('GX device IP address or hostname'),
        port: z.number().default(502).describe('Modbus TCP port'),
        unitId: z.number().default(226).describe('Modbus unit ID for the solar charger'),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId }) => {
      try {
        const results = await withModbusClient(host, port, unitId, async (client) => {
          return client.readRegisters(solarRegisters.registers);
        });
        return formatResults('Solar Charger Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
