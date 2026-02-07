import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { dcgensetRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerDcgensetTools(server: McpServer): void {
  server.registerTool(
    'victron_dcgenset_status',
    {
      title: 'DC Genset Status',
      description: 'Get DC generator data (Fischer Panda, Hatz fiPMG): DC voltage/current, engine load/speed/RPM, coolant/winding/exhaust temperature, oil pressure, starter battery voltage, status, error codes, and start command. Use victron_discover to find the unit ID.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(100).describe('Modbus unit ID for the DC genset'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, dcgensetRegisters.service, dcgensetRegisters.registers);
        return formatResults('DC Genset Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
