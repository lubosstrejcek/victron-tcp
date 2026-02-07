import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { tankRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerTankTools(server: McpServer): void {
  server.registerTool(
    'victron_tank_levels',
    {
      title: 'Tank Levels',
      description: 'Get tank sensor data: level, capacity, remaining, and fluid type (fuel, fresh water, waste water, live well, oil, black water, gasoline). Specify unitId for the tank sensor (check victron_discover to find it).',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(20).describe('Modbus unit ID for the tank sensor'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, tankRegisters.service, tankRegisters.registers);
        return formatResults('Tank Sensor Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
