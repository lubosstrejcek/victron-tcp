import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { batteryRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerBatteryTools(server: McpServer): void {
  server.registerTool(
    'victron_battery_status',
    {
      title: 'Battery Status',
      description: 'Get detailed battery monitor data: SOC, voltage, current, power, temperature, cell voltages, time-to-go, history, and alarms. Specify unitId for the battery monitor (check victron_discover to find it).',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(247).describe('Modbus unit ID for the battery monitor'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, batteryRegisters.service, batteryRegisters.registers);
        return formatResults('Battery Monitor Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
