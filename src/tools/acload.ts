import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { acloadRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerAcloadTools(server: McpServer): void {
  server.registerTool(
    'victron_acload_status',
    {
      title: 'AC Load / Current Sensor',
      description: 'Get AC load and current sensor data: per-phase power, voltage, current, energy totals, frequency, and power factor. Used for AC current sensors measuring PV inverter output or other AC loads. Use victron_discover to find the unit ID.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(100).describe('Modbus unit ID for the AC load sensor'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, acloadRegisters.service, acloadRegisters.registers);
        return formatResults('AC Load / Current Sensor', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
