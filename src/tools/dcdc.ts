import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { dcdcRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerDcdcTools(server: McpServer): void {
  server.registerTool(
    'victron_dcdc_status',
    {
      title: 'DC-DC Converter Status',
      description: 'Get Orion XS DC-DC converter data: battery voltage/current/temperature, input voltage/power, charge state, error code, switch position, and accumulated Ah. Use victron_discover to find the unit ID.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(100).describe('Modbus unit ID for the DC-DC converter'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, dcdcRegisters.service, dcdcRegisters.registers);
        return formatResults('DC-DC Converter Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
