import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { digitalinputRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerDigitalInputTools(server: McpServer): void {
  server.registerTool(
    'victron_digital_inputs',
    {
      title: 'Digital Inputs',
      description: 'Read digital input data from the GX device. On Cerbo GX, this reads the primary digital input. Includes state (open/closed/running/stopped), input type (door, bilge, alarm, generator), alarm status, and pulse count. Unit ID is always 100.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId: 100, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, digitalinputRegisters.service, digitalinputRegisters.registers);
        return formatResults('Digital Input', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
