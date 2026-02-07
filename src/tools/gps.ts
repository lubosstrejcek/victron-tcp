import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { gpsRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerGpsTools(server: McpServer): void {
  server.registerTool(
    'victron_gps_status',
    {
      title: 'GPS Position',
      description: 'Get GPS position data: latitude, longitude, altitude, course, speed, fix status, and number of satellites. Works with USB GPS (NMEA 0183) and NMEA 2000 GPS devices connected to the GX. Unit ID is always 100.',
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
        const results = await readDeviceRegisters(params, gpsRegisters.service, gpsRegisters.registers);
        return formatResults('GPS Position', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
