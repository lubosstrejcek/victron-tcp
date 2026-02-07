import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { chargerRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerChargerTools(server: McpServer): void {
  server.registerTool(
    'victron_charger_status',
    {
      title: 'AC Charger Status',
      description: 'Get AC charger data (Skylla-i, Skylla-IP44, Smart IP43, Blue Smart IP22): output voltage/current/temperature for up to 3 outputs, AC current/power, charge state, error code, current limit, and alarms. Use victron_discover to find the unit ID.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(100).describe('Modbus unit ID for the charger'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, chargerRegisters.service, chargerRegisters.registers);
        return formatResults('AC Charger Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
