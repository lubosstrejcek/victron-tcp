import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withModbusClient } from '../modbus/client.js';
import { allCategories } from '../registers/index.js';
import type { RegisterDefinition } from '../modbus/types.js';
import { errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

export function registerRawTools(server: McpServer): void {
  server.registerTool(
    'victron_read_register',
    {
      title: 'Read Raw Register',
      description: 'Read raw Modbus register(s). Advanced tool for reading specific register addresses with explicit data type and scale factor. Useful for registers not covered by other tools or for debugging.',
      inputSchema: {
        host: z.string().describe('GX device IP address or hostname'),
        port: z.number().default(502).describe('Modbus TCP port'),
        unitId: z.number().describe('Modbus unit ID of the target device'),
        address: z.number().describe('Starting register address'),
        count: z.number().default(1).describe('Number of registers (words) to read'),
        dataType: z.enum(['uint16', 'int16', 'uint32', 'int32', 'uint64', 'string']).default('uint16').describe('How to interpret the register data'),
        scaleFactor: z.number().default(1).describe('Scale factor to apply (value = raw / scaleFactor)'),
      },
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
      description: 'List available Modbus registers for a given device category. Shows register addresses, names, data types, and units. Useful for finding specific registers to read.',
      inputSchema: {
        category: z.string().describe('Device category to list registers for (e.g. "system", "battery", "solar", "vebus", "grid", "tank", "temperature", "inverter", "pvinverter", "genset", "settings", "evcharger", "multi", "alternator", "dcload", "dcsystem", "dcdc", "acsystem")'),
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

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );
}
