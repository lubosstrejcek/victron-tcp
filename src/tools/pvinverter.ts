import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { pvinverterRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerPvinverterTools(server: McpServer): void {
  server.registerTool(
    'victron_pvinverter_status',
    {
      title: 'PV Inverter Status',
      description: 'Get AC-coupled PV inverter data (SolarEdge, Fronius, ABB, etc.): power per phase, voltage, current, energy totals, frequency, position, serial, and power limit. Use victron_discover to find the PV inverter unit ID.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(31).describe('Modbus unit ID for the PV inverter'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, pvinverterRegisters.service, pvinverterRegisters.registers);
        return formatResults('PV Inverter Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
