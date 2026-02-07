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

export function registerGxInfoTools(server: McpServer): void {
  server.registerTool(
    'victron_gx_info',
    {
      title: 'GX Device Info',
      description: 'Get GX device identity and connection info: serial number, relay states, system time, and connection details. MAC address and hostname are NOT available via Modbus TCP. Unit ID is always 100.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        ...transportInputSchema,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ host, port, transport, mqttHost, mqttPort, portalId, deviceInstance }) => {
      try {
        const registers = findRegisters([800, 806, 807, 830]);

        const params = buildConnectionParams({ transport, host, port, unitId: 100, mqttHost, mqttPort, portalId, deviceInstance });
        const results = await readDeviceRegisters(params, systemRegisters.service, registers);

        const regByAddr = new Map<number, RegisterReadResult>();
        for (let i = 0; i < registers.length; i++) {
          if (results[i]) {
            regByAddr.set(registers[i].address, results[i]);
          }
        }

        const lines: string[] = ['# GX Device Info\n'];

        lines.push('## Connection');
        lines.push(`- **IP Address**: ${host}`);
        lines.push(`- **Modbus TCP Port**: ${port}`);
        lines.push('');

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

        group('Identity', [800]);
        group('Relays', [806, 807]);
        group('System Time', [830]);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
