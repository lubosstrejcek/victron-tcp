import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { meteoRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerMeteoTools(server: McpServer): void {
  server.registerTool(
    'victron_meteo_status',
    {
      title: 'Meteo / Irradiance Sensor',
      description: 'Get meteorological sensor data from IMT Solar irradiance sensors: solar irradiance (W/m²), wind speed, cell temperature, and external temperatures. Connected via RS485/USB. Unit ID is always 100.',
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
        const results = await readDeviceRegisters(params, meteoRegisters.service, meteoRegisters.registers);
        return formatResults('Meteo / Irradiance Sensor', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
