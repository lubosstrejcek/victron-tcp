import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { gridRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerGridTools(server: McpServer): void {
  server.registerTool(
    'victron_grid_status',
    {
      title: 'Grid Meter Status',
      description: 'Get grid meter data: power per phase (L1/L2/L3), voltage, current, frequency, and energy counters (forward/reverse). Specify unitId for the grid meter (check victron_discover to find it).',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(30).describe('Modbus unit ID for the grid meter'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, gridRegisters.service, gridRegisters.registers);
        return formatResults('Grid Meter Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
