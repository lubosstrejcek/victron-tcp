import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { generatorRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerGeneratorTools(server: McpServer): void {
  server.registerTool(
    'victron_generator_status',
    {
      title: 'Generator Start/Stop Control',
      description: 'Get GX generator auto start/stop status and control: manual start/stop command, start condition (SOC/load/voltage/manual), runtime, quiet hours, start/stop state, auto start enabled, service countdown, and alarms. This controls the GX relay-based generator start/stop logic. Unit ID is always 100.',
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
        const results = await readDeviceRegisters(params, generatorRegisters.service, generatorRegisters.registers);
        return formatResults('Generator Start/Stop Control', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
