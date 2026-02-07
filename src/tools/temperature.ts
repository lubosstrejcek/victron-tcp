import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { temperatureRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerTemperatureTools(server: McpServer): void {
  server.registerTool(
    'victron_temperature',
    {
      title: 'Temperature Sensor',
      description: 'Get temperature sensor data from com.victronenergy.temperature: temperature, type (battery, fridge, generic), humidity, pressure, and status. Note: Battery temperatures measured by inverters/chargers or solar chargers are reported in their own device registers (use victron_vebus_status or victron_solar_status), not here. This tool reads dedicated temperature sensor inputs only. Specify unitId for the temperature sensor (check victron_discover to find it).',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema.default(24).describe('Modbus unit ID for the temperature sensor'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const params = buildConnectionParams({ transport, host, port, unitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, temperatureRegisters.service, temperatureRegisters.registers);
        return formatResults('Temperature Sensor Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
