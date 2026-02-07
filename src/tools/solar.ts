import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { solarRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerSolarTools(server: McpServer): void {
  server.registerTool(
    'victron_solar_status',
    {
      title: 'Solar Charger Status',
      description: 'Get solar charger data: PV voltage, current, power, yield today/yesterday/total, charger state, error code, and tracker data. Specify unitId for the solar charger (check victron_discover to find it).',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(226).describe('Modbus unit ID for the solar charger'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, solarRegisters.service, solarRegisters.registers);
        return formatResults('Solar Charger Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
