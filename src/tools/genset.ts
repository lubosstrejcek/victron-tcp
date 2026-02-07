import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { gensetRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerGensetTools(server: McpServer): void {
  server.registerTool(
    'victron_genset_status',
    {
      title: 'AC Genset Status',
      description: 'Get AC generator/genset controller data (Fischer Panda, ComAp, DSE, CRE, DEIF): 3-phase AC voltage/current/power/frequency, engine temperature/load/speed/RPM, oil pressure, coolant temperature, exhaust temperature, starter voltage, model name, and error codes. Use victron_discover to find the unit ID.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(23).describe('Modbus unit ID for the genset'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, gensetRegisters.service, gensetRegisters.registers);
        return formatResults('AC Genset Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
