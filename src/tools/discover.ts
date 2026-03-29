import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VictronModbusClient } from '../modbus/client.js';
import { allCategories } from '../registers/index.js';
import { hostSchema, portSchema, unitIdSchema, errorResult, DISCOVERY_ANNOTATIONS } from './helpers.js';

const deviceSchema = z.object({
  unitId: z.number(),
  service: z.string(),
  description: z.string(),
});

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

// Common Victron unit IDs: system=100, vebus=227-246, battery=225-226+247,
// solar=226-240, grid=30-31, tank=20-29, temp=24-29, inverter=20-29+239-246
// Probe these first for fast results, then fill remaining range.
const COMMON_UNIT_IDS = [100, 247, 246, 245, 244, 239, 238, 227, 226, 225, 30, 31, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];

function buildScanOrder(start: number, end: number): number[] {
  const seen = new Set<number>();
  const order: number[] = [];

  for (const id of COMMON_UNIT_IDS) {
    if (id >= start && id <= end && !seen.has(id)) {
      order.push(id);
      seen.add(id);
    }
  }

  for (let id = start; id <= end; id++) {
    if (!seen.has(id)) {
      order.push(id);
    }
  }

  return order;
}

export function registerDiscoverTools(server: McpServer): void {
  server.registerTool(
    'victron_discover',
    {
      title: 'Discover Devices',
      description: 'Discover connected Victron devices via Modbus TCP by probing unit IDs. Scans a range of unit IDs to find active devices and identify their service type. Modbus only — for MQTT discovery use victron_mqtt_discover instead. This is the first tool you should use with Modbus transport to find what devices are available and their unit IDs.',
      inputSchema: {
        host: hostSchema,
        port: portSchema,
        startUnitId: unitIdSchema.default(0).describe('Start of unit ID range to scan (default: 0)'),
        endUnitId: unitIdSchema.default(247).describe('End of unit ID range to scan (default: 247)'),
      },
      outputSchema: {
        devices: z.array(deviceSchema),
      },
      annotations: DISCOVERY_ANNOTATIONS,
    },
    async ({ host, port, startUnitId, endUnitId }) => {
      const client = new VictronModbusClient();
      const found: Array<{ unitId: number; service: string; description: string }> = [];

      try {
        await client.connect(host, port);

        const scanOrder = buildScanOrder(startUnitId, endUnitId);

        for (const unitId of scanOrder) {
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

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
        structuredContent: { devices: found },
      };
    },
  );
}
