import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { allCategories } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import { hostSchema, portSchema, unitIdSchema, transportInputSchema, buildConnectionParams, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerCategoryTools(server: McpServer): void {
  server.registerTool(
    'victron_read_category',
    {
      title: 'Read Device Category',
      description: 'Read all registers for any Victron device category by service name. Covers all 33 categories including digital inputs, genset, PV inverter, settings, GPS, meteo, and more. Use victron_discover to find connected devices and their unit IDs first.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        category: z.string().min(1).describe('Device category service name (e.g. "digitalinput", "genset", "pvinverter", "settings", "gps"). Partial match supported — you can use just the short name without the "com.victronenergy." prefix.'),
        unitId: unitIdSchema.optional().describe('Modbus unit ID. If omitted, uses the default unit ID for the category.'),
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, category, unitId, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      const searchTerm = category.toLowerCase();
      const found = allCategories.find(c =>
        c.service.toLowerCase() === searchTerm ||
        c.service.toLowerCase() === `com.victronenergy.${searchTerm}` ||
        c.service.toLowerCase().includes(searchTerm),
      );

      if (!found) {
        const available = allCategories
          .map(c => `- **${c.service.replace('com.victronenergy.', '')}** (${c.service}) — ${c.description}`)
          .join('\n');
        return {
          content: [{
            type: 'text',
            text: `Category "${category}" not found.\n\nAvailable categories:\n${available}`,
          }],
          isError: true,
        };
      }

      const effectiveUnitId = unitId ?? found.defaultUnitId;

      try {
        const params = buildConnectionParams({ transport, host, port, unitId: effectiveUnitId, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, found.service, found.registers);
        return formatResults(`${found.description} (${found.service})`, results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
