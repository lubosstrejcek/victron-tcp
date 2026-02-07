import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { dcsourceRegisters, dcloadRegisters, dcsystemRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

const categoryMap = {
  source: { registers: dcsourceRegisters, title: 'DC Source' },
  load: { registers: dcloadRegisters, title: 'DC Load' },
  system: { registers: dcsystemRegisters, title: 'DC System' },
} as const;

export function registerDcenergyTools(server: McpServer): void {
  server.registerTool(
    'victron_dcenergy_status',
    {
      title: 'DC Energy Meter',
      description: 'Get DC energy meter data from SmartShunts configured in DC meter mode: voltage, current, auxiliary voltage, temperature, energy produced/consumed, and alarms. Specify type: "source" (alternator, solar, wind), "load" (fridge, pump, generic DC load), or "system" (aggregate DC system). Unit ID is always 100.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        type: z.enum(['source', 'load', 'system']).describe('DC energy meter type: source, load, or system'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, type, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const { registers, title } = categoryMap[type];
        const params = buildConnectionParams({ transport, host, port, unitId: 100, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, registers.service, registers.registers);
        return formatResults(`${title} Energy Meter`, results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
