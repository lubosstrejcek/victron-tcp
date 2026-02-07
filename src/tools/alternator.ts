import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { alternatorRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerAlternatorTools(server: McpServer): void {
  server.registerTool(
    'victron_alternator_status',
    {
      title: 'Alternator Status',
      description: 'Get alternator data from Wakespeed WS500, Arco Zeus, Revatek Altion, or other NMEA 2000 DC alternator regulators: battery voltage/current, auxiliary voltage, temperature, energy produced, engine/alternator RPM, field drive %, alarms, and state. Use victron_discover to find the unit ID.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(100).describe('Modbus unit ID for the alternator'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, alternatorRegisters.service, alternatorRegisters.registers);
        return formatResults('Alternator Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
