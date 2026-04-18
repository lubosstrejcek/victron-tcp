import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { vebusRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';
import { outputSchemas } from './output_schemas.js';

export function registerVebusTools(server: McpServer): void {
  server.registerTool(
    'victron_vebus_status',
    {
      title: 'VE.Bus Inverter/Charger Status',
      description: 'Get VE.Bus inverter/charger (Multi/Quattro) data: AC input/output voltage, current, power per phase, DC voltage, input current limit, mode, state, alarms, and ESS settings. Specify unitId for the VE.Bus device (check victron_discover to find it).',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(227).describe('Modbus unit ID for the VE.Bus device'),
        ...transportInputSchema,
      },
      outputSchema: outputSchemas.readings,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, vebusRegisters.service, vebusRegisters.registers);
        return formatResults('VE.Bus Inverter/Charger Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
