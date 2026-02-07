import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { multiRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerMultiTools(server: McpServer): void {
  server.registerTool(
    'victron_multi_status',
    {
      title: 'Multi RS Status',
      description: 'Get Multi RS inverter/charger data: AC input/output voltage/current/power per phase, input frequency, AC source type, current limits, battery voltage/current/power/SOC/temperature, charger/inverter state, and alarms. Use victron_discover to find the unit ID.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(100).describe('Modbus unit ID for the Multi RS'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, multiRegisters.service, multiRegisters.registers);
        return formatResults('Multi RS Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
