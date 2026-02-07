import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withModbusClient } from '../modbus/client.js';
import { vebusRegisters } from '../registers/index.js';
import { formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerVebusTools(server: McpServer): void {
  server.registerTool(
    'victron_vebus_status',
    {
      title: 'VE.Bus Inverter/Charger Status',
      description: 'Get VE.Bus inverter/charger (Multi/Quattro) data: AC input/output voltage, current, power per phase, DC voltage, input current limit, mode, state, alarms, and ESS settings. Specify unitId for the VE.Bus device (check victron_discover to find it).',
      inputSchema: {
        host: z.string().describe('GX device IP address or hostname'),
        port: z.number().default(502).describe('Modbus TCP port'),
        unitId: z.number().default(227).describe('Modbus unit ID for the VE.Bus device'),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId }) => {
      try {
        const results = await withModbusClient(host, port, unitId, async (client) => {
          return client.readRegisters(vebusRegisters.registers);
        });
        return formatResults('VE.Bus Inverter/Charger Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
