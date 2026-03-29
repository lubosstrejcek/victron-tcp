import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { systemRegisters } from '../registers/index.js';
import { readDeviceRegisters } from '../transport.js';
import type { RegisterDefinition, RegisterReadResult } from '../modbus/types.js';
import { hostSchema, portSchema, transportInputSchema, buildConnectionParams, errorResult, READ_ONLY_ANNOTATIONS } from './helpers.js';

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
        host: hostSchema,
        port: portSchema,
        ...transportInputSchema,
      },
      outputSchema: {
        readings: z.array(z.object({
          group: z.string(),
          name: z.string(),
          description: z.string(),
          value: z.union([z.number(), z.string()]),
          unit: z.string(),
          enumLabel: z.string().optional(),
        })),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
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

        const params = buildConnectionParams({ transport, host, port, unitId: 100, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, systemRegisters.service, registers);

        const regByAddr = new Map<number, RegisterReadResult>();
        for (let i = 0; i < registers.length; i++) {
          if (results[i]) {
            regByAddr.set(registers[i].address, results[i]);
          }
        }

        const lines: string[] = ['# System Overview\n'];
        const readings: Array<{ group: string; name: string; description: string; value: number | string; unit: string; enumLabel?: string }> = [];

        const group = (label: string, addresses: number[]): void => {
          const items = addresses
            .map(a => regByAddr.get(a))
            .filter((r): r is RegisterReadResult => r !== undefined);
          if (items.length === 0) return;
          lines.push(`## ${label}`);
          for (const item of items) {
            const val = item.enumLabel ?? `${item.value}${item.unit ? ' ' + item.unit : ''}`;
            lines.push(`- **${item.description}**: ${val}`);
            readings.push({
              group: label,
              name: item.name,
              description: item.description,
              value: item.value,
              unit: item.unit,
              ...(item.enumLabel ? { enumLabel: item.enumLabel } : {}),
            });
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

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
          structuredContent: { readings },
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
