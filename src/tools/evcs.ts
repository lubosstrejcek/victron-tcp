import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withModbusClient } from '../modbus/client.js';
import { evcsRegisters } from '../registers/index.js';
import { unitIdSchema, formatResults, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';
import { outputSchemas } from './output_schemas.js';

export function registerEvcsTools(server: McpServer): void {
  server.registerTool(
    'victron_evcs_status',
    {
      title: 'EV Charging Station (Direct)',
      description: 'Get EV Charging Station status by connecting directly to the EVCS device (not through the GX). Reads charger status, power per phase, charging current, session energy, mode, phase configuration, temperatures, and errors. The host parameter should be the EVCS IP address (not the GX). For EV charger data proxied through the GX device, use victron_read_category with category "evcharger" instead.',
      inputSchema: {
        // Deliberately required (no VICTRON_HOST fallback): this tool targets the
        // EVCS itself, while VICTRON_HOST points at the GX device.
        host: z.string().min(1).describe('EVCS device IP address (connect directly to the EVCS, not the GX)'),
        port: z.number().int().min(1).max(65535).default(502).describe('Modbus TCP port'),
        unitId: unitIdSchema.default(1).describe('Modbus unit ID (default: 1 for EVCS)'),
      },
      outputSchema: outputSchemas.readings,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId }) => {
      try {
        const results = await withModbusClient(host, port, unitId, async (client) => {
          return client.readRegisters(evcsRegisters.registers);
        });
        return formatResults('EV Charging Station Status', results);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
