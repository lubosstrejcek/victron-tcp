import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withModbusClient } from '../modbus/client.js';
import { allCategories } from '../registers/index.js';
import type { RegisterDefinition } from '../modbus/types.js';
import { hostSchema, portSchema, unitIdSchema, addressSchema, countSchema, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';
import { outputSchemas } from './output_schemas.js';

export function registerRawTools(server: McpServer): void {
  server.registerTool(
    'victron_read_register',
    {
      title: 'Read Raw Register',
      description: 'Read raw Modbus register(s). Modbus TCP only — not available via MQTT. Advanced tool for reading specific register addresses with explicit data type and scale factor. Use victron_search_docs or victron_list_registers first to find the correct address, data type, and scale factor for the register you want to read.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        unitId: unitIdSchema,
        address: addressSchema,
        count: countSchema,
        dataType: z.enum(['uint16', 'int16', 'uint32', 'int32', 'uint64', 'string']).default('uint16').describe('How to interpret the register data'),
        scaleFactor: z.number().default(1).describe('Scale factor to apply (value = raw / scaleFactor)'),
      },
      outputSchema: outputSchemas.rawRegister,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, unitId, address, count, dataType, scaleFactor }) => {
      try {
        const reg: RegisterDefinition = {
          address,
          name: `register_${address}`,
          description: `Register at address ${address}`,
          dataType,
          scaleFactor,
          unit: '',
          writable: false,
          dbusPath: '',
          words: count,
        };

        const result = await withModbusClient(host, port, unitId, async (client) => {
          return client.readRegister(reg);
        });

        const lines = [
          '# Raw Register Read\n',
          `- **Address**: ${address}`,
          `- **Unit ID**: ${unitId}`,
          `- **Data Type**: ${dataType}`,
          `- **Scale Factor**: ${scaleFactor}`,
          `- **Raw Value**: ${JSON.stringify(result.rawValue)}`,
          `- **Decoded Value**: ${result.value}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'victron_list_registers',
    {
      title: 'List Registers',
      description: 'List available Modbus registers for a given device category. Shows register addresses, names, data types, and units. For free-text search across all docs use victron_search_docs instead.',
      inputSchema: {
        category: z.string().describe('Device category to list registers for (e.g. "system", "battery", "solar", "vebus", "grid", "tank", "temperature", "inverter", "pvinverter", "genset", "settings", "evcharger", "multi", "alternator", "dcload", "dcsystem", "dcdc", "acsystem")'),
      },
      outputSchema: {
        service: z.string(),
        description: z.string(),
        defaultUnitId: z.number(),
        registerCount: z.number(),
        registers: z.array(z.object({
          address: z.number(),
          description: z.string(),
          dataType: z.string(),
          scaleFactor: z.number(),
          unit: z.string(),
          writable: z.boolean(),
        })),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ category }) => {
      const searchTerm = category.toLowerCase();
      const found = allCategories.find(c =>
        c.service.toLowerCase().includes(searchTerm) ||
        c.description.toLowerCase().includes(searchTerm)
      );

      if (!found) {
        const available = allCategories
          .map(c => `- **${c.service.replace('com.victronenergy.', '')}**: ${c.description} (${c.registers.length} registers)`)
          .join('\n');
        return {
          content: [{
            type: 'text',
            text: `Category "${category}" not found. Available categories:\n\n${available}`,
          }],
          isError: true,
        };
      }

      const lines = [
        `# ${found.description} Registers`,
        `**Service**: ${found.service}`,
        `**Default Unit ID**: ${found.defaultUnitId}`,
        `**Register Count**: ${found.registers.length}\n`,
        '| Address | Description | Type | Scale | Unit | Writable |',
        '|---------|-------------|------|-------|------|----------|',
      ];

      for (const reg of found.registers) {
        const writable = reg.writable ? 'Yes' : 'No';
        lines.push(`| ${reg.address} | ${reg.description} | ${reg.dataType} | ${reg.scaleFactor} | ${reg.unit} | ${writable} |`);
      }

      const structuredContent = {
        service: found.service,
        description: found.description,
        defaultUnitId: found.defaultUnitId,
        registerCount: found.registers.length,
        registers: found.registers.map(reg => ({
          address: reg.address,
          description: reg.description,
          dataType: reg.dataType,
          scaleFactor: reg.scaleFactor,
          unit: reg.unit,
          writable: reg.writable,
        })),
      };

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
        structuredContent,
      };
    },
  );
}
