import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withModbusClient } from '../modbus/client.js';
import { systemRegisters } from '../registers/index.js';
import type { RegisterDefinition, RegisterReadResult } from '../modbus/types.js';
import { errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

function findRegisters(addresses: number[]): RegisterDefinition[] {
  return addresses
    .map(a => systemRegisters.registers.find(r => r.address === a))
    .filter((r): r is RegisterDefinition => r !== undefined);
}

export function registerSystemTools(server: McpServer): void {
  server.registerTool(
    'victron_system_overview',
    {
      title: 'System Overview',
      description: 'Get system overview: battery SOC/voltage/current/power, PV power, grid power, AC consumption, inverter state, and Dynamic ESS status. Unit ID is always 100.',
      inputSchema: {
        host: z.string().describe('GX device IP address or hostname'),
        port: z.number().default(502).describe('Modbus TCP port'),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port }) => {
      try {
        const registers = findRegisters([
          840, 841, 842, 843, 844, 845, 846,
          850, 851,
          808, 809, 810,
          811, 812, 813,
          817, 818, 819,
          820, 821, 822,
          823, 824, 825,
          826,
          855,
          860,
          865, 866,
          5400, 5401, 5402, 5404, 5406, 5407,
        ]);

        const results = await withModbusClient(host, port, 100, async (client) => {
          return client.readRegisters(registers);
        });

        // Build address→result lookup for stable grouping
        const regByAddr = new Map<number, RegisterReadResult>();
        for (let i = 0; i < registers.length; i++) {
          if (results[i]) {
            regByAddr.set(registers[i].address, results[i]);
          }
        }

        const lines: string[] = ['# System Overview\n'];

        const group = (label: string, addresses: number[]): void => {
          const items = addresses
            .map(a => regByAddr.get(a))
            .filter((r): r is RegisterReadResult => r !== undefined);
          if (items.length === 0) return;
          lines.push(`## ${label}`);
          for (const item of items) {
            const val = item.enumLabel ?? `${item.value}${item.unit ? ' ' + item.unit : ''}`;
            lines.push(`- **${item.description}**: ${val}`);
          }
          lines.push('');
        };

        group('Battery', [840, 841, 842, 843, 844, 845, 846]);
        group('Solar (DC-coupled)', [850, 851]);
        group('PV AC Output', [808, 809, 810]);
        group('PV AC Input', [811, 812, 813]);
        group('AC Consumption', [817, 818, 819]);
        group('Grid', [820, 821, 822, 826]);
        group('Generator', [823, 824, 825]);
        group('DC System', [855, 860, 865, 866]);
        group('Dynamic ESS', [5400, 5401, 5402, 5404, 5406, 5407]);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
