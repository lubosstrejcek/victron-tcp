import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { inverterRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerInverterTools(server: McpServer): void {
  server.registerTool(
    'victron_inverter_status',
    {
      title: 'Inverter Status',
      description: 'Get standalone inverter data (Phoenix, Inverter RS, VE.Direct inverters): AC output voltage, current, power, frequency, state, and alarms. This is for standalone inverters — for Multi/Quattro, use victron_vebus_status instead.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(232).describe('Modbus unit ID for the inverter'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, inverterRegisters.service, inverterRegisters.registers);
        return formatResults('Inverter Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
