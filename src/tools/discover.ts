import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VictronModbusClient } from '../modbus/client.js';
import { allCategories } from '../registers/index.js';
import { hostSchema, portSchema, unitIdSchema, errorResult, DISCOVERY_ANNOTATIONS } from './helpers.js';

const PROBE_REGISTERS: Record<string, { address: number; words: number }> = {
  'com.victronenergy.system': { address: 800, words: 6 },
  'com.victronenergy.vebus': { address: 3, words: 1 },
  'com.victronenergy.battery': { address: 259, words: 1 },
  'com.victronenergy.solarcharger': { address: 771, words: 1 },
  'com.victronenergy.pvinverter': { address: 1026, words: 1 },
  'com.victronenergy.grid': { address: 2600, words: 1 },
  'com.victronenergy.tank': { address: 3000, words: 1 },
  'com.victronenergy.inverter': { address: 3100, words: 1 },
  'com.victronenergy.genset': { address: 3200, words: 1 },
  'com.victronenergy.temperature': { address: 3300, words: 1 },
  'com.victronenergy.charger': { address: 2307, words: 1 },
  'com.victronenergy.evcharger': { address: 3800, words: 1 },
  'com.victronenergy.acload': { address: 3900, words: 1 },
  'com.victronenergy.alternator': { address: 4100, words: 1 },
  'com.victronenergy.dcload': { address: 4300, words: 1 },
  'com.victronenergy.dcsystem': { address: 4400, words: 1 },
  'com.victronenergy.multi': { address: 4500, words: 1 },
  'com.victronenergy.dcdc': { address: 4800, words: 1 },
  'com.victronenergy.acsystem': { address: 4900, words: 1 },
};

export function registerDiscoverTools(server: McpServer): void {
  server.registerTool(
    'victron_discover',
    {
      title: 'Discover Devices',
      description: 'Discover connected Victron devices by probing unit IDs. Scans a range of unit IDs to find active devices and identify their service type. This is the first tool you should use to find what devices are available and their unit IDs.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        startUnitId: unitIdSchema.default(0).describe('Start of unit ID range to scan (default: 0)'),
        endUnitId: unitIdSchema.default(247).describe('End of unit ID range to scan (default: 247)'),
      },
      annotations: DISCOVERY_ANNOTATIONS,
    },
    async ({ host, port, startUnitId, endUnitId }) => {
      const client = new VictronModbusClient();
      const found: Array<{ unitId: number; service: string; description: string }> = [];

      try {
        await client.connect(host, port);

        for (let unitId = startUnitId; unitId <= endUnitId; unitId++) {
          client.setUnitId(unitId);

          for (const [service, probe] of Object.entries(PROBE_REGISTERS)) {
            try {
              await client.readRawRegisters(probe.address, probe.words);
              const category = allCategories.find(c => c.service === service);
              found.push({
                unitId,
                service,
                description: category?.description ?? service,
              });
              break;
            } catch {
              // Not available at this unit ID
            }
          }
        }
      } catch (error) {
        return errorResult(error);
      } finally {
        await client.close();
      }

      if (found.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No devices found. Make sure Modbus TCP is enabled on the GX device (Settings → Services → Modbus TCP).',
          }],
        };
      }

      const lines = ['# Discovered Victron Devices\n'];
      lines.push('| Unit ID | Service | Description |');
      lines.push('|---------|---------|-------------|');
      for (const device of found) {
        lines.push(`| ${device.unitId} | ${device.service} | ${device.description} |`);
      }

      lines.push('\nUse the unit ID with the corresponding tool to read device data.');
      lines.push('For example: `victron_battery_status` with the battery unit ID.');
      lines.push('\nFor categories without a dedicated tool (digital inputs, genset, PV inverter, settings, GPS, etc.), use `victron_read_category` with the service name.');

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );
}
