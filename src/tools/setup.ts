import { z } from 'zod';
import * as net from 'node:net';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VictronModbusClient } from '../modbus/client.js';
import { VictronMqttClient, withMqttClient } from '../mqtt/client.js';
import { allCategories } from '../registers/index.js';
import { errorResult, DISCOVERY_ANNOTATIONS } from './helpers.js';

const PROBE_TIMEOUT = 2000;

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

const SERVICE_TO_TOOL: Record<string, string> = {
  battery: 'victron_battery_status',
  vebus: 'victron_vebus_status',
  solarcharger: 'victron_solar_status',
  grid: 'victron_grid_status',
  tank: 'victron_tank_levels',
  temperature: 'victron_temperature',
  inverter: 'victron_inverter_status',
  pvinverter: 'victron_pvinverter_status',
  acload: 'victron_acload_status',
  alternator: 'victron_alternator_status',
  charger: 'victron_charger_status',
  dcdc: 'victron_dcdc_status',
  genset: 'victron_genset_status',
  generator: 'victron_generator_status',
  multi: 'victron_multi_status',
  dcgenset: 'victron_dcgenset_status',
  gps: 'victron_gps_status',
  meteo: 'victron_meteo_status',
  digitalinput: 'victron_digital_inputs',
  system: 'victron_system_overview',
};

function probePort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(PROBE_TIMEOUT);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

interface ModbusDevice {
  unitId: number;
  service: string;
  description: string;
}

async function discoverModbusDevices(host: string, port: number): Promise<ModbusDevice[]> {
  const client = new VictronModbusClient();
  const found: ModbusDevice[] = [];

  try {
    await client.connect(host, port);

    for (let unitId = 0; unitId <= 247; unitId++) {
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
  } finally {
    await client.close();
  }

  return found;
}

export function registerSetupTools(server: McpServer): void {
  server.registerTool(
    'victron_setup',
    {
      title: 'System Setup',
      description:
        'Complete system setup and discovery for a Victron GX device. Tests both Modbus TCP and MQTT connectivity, discovers all connected devices and services, recommends the best transport, and generates ready-to-use MCP server configuration. Use this as the first step after finding a device with victron_network_scan, or directly if you already know the host IP.',
      inputSchema: {
        host: z.string().min(1).describe('GX device IP address or hostname'),
        modbusPort: z.number().int().min(1).max(65535).default(502).describe('Modbus TCP port (default: 502)'),
        mqttPort: z.number().int().min(1).max(65535).default(1883).describe('MQTT broker port (default: 1883)'),
      },
      annotations: DISCOVERY_ANNOTATIONS,
    },
    async ({ host, modbusPort, mqttPort }) => {
      try {
        const lines: string[] = ['# Victron System Setup\n'];
        lines.push(`**Host:** \`${host}\`\n`);

        // Phase 1: Test transport connectivity
        lines.push('## Transport Availability\n');

        const [modbusAvailable, mqttAvailable] = await Promise.all([
          probePort(host, modbusPort),
          probePort(host, mqttPort),
        ]);

        lines.push(`- **Modbus TCP** (port ${modbusPort}): ${modbusAvailable ? 'Available' : 'Not reachable'}`);
        lines.push(`- **MQTT** (port ${mqttPort}): ${mqttAvailable ? 'Available' : 'Not reachable'}`);
        lines.push('');

        if (!modbusAvailable && !mqttAvailable) {
          lines.push('## Connection Failed\n');
          lines.push('Neither Modbus TCP nor MQTT could be reached on this host.\n');
          lines.push('**Troubleshooting:**');
          lines.push('- Verify the IP address is correct');
          lines.push('- Ensure the GX device is powered on and connected to the network');
          lines.push('- Enable Modbus TCP: Settings → Services → Modbus TCP');
          lines.push('- MQTT is enabled by default on Venus OS');
          lines.push('- Check firewall rules between this machine and the GX device');
          return { content: [{ type: 'text', text: lines.join('\n') }] };
        }

        // Phase 2: MQTT discovery
        let portalId: string | undefined;
        let mqttServices: Array<{ serviceType: string; deviceInstance: string }> = [];

        if (mqttAvailable) {
          lines.push('## MQTT Discovery\n');
          try {
            portalId = await VictronMqttClient.discoverPortalId(host, mqttPort);
            lines.push(`- **Portal ID:** \`${portalId}\``);

            mqttServices = await withMqttClient(host, mqttPort, portalId, async (client) => {
              return client.discoverServices();
            });

            const grouped = new Map<string, string[]>();
            for (const svc of mqttServices) {
              if (!grouped.has(svc.serviceType)) {
                grouped.set(svc.serviceType, []);
              }
              grouped.get(svc.serviceType)!.push(svc.deviceInstance);
            }

            lines.push(`- **Services found:** ${grouped.size}`);
            lines.push('');

            for (const [serviceType, instances] of grouped) {
              const tool = SERVICE_TO_TOOL[serviceType];
              const toolHint = tool ? ` → \`${tool}\`` : ' → `victron_read_category`';
              lines.push(`  - **${serviceType}** [instance ${instances.join(', ')}]${toolHint}`);
            }
            lines.push('');
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            lines.push(`- MQTT discovery failed: ${msg}`);
            lines.push('');
          }
        }

        // Phase 3: Modbus device scan
        let modbusDevices: ModbusDevice[] = [];

        if (modbusAvailable) {
          lines.push('## Modbus Device Scan\n');
          try {
            modbusDevices = await discoverModbusDevices(host, modbusPort);
            lines.push(`Found ${modbusDevices.length} device(s):\n`);
            lines.push('| Unit ID | Service | Description |');
            lines.push('|---------|---------|-------------|');
            for (const d of modbusDevices) {
              lines.push(`| ${d.unitId} | ${d.service} | ${d.description} |`);
            }
            lines.push('');
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            lines.push(`Modbus scan failed: ${msg}\n`);
          }
        }

        // Phase 4: Transport recommendation
        lines.push('## Recommended Transport\n');

        if (mqttAvailable && portalId) {
          lines.push('**MQTT** (recommended)\n');
          lines.push('- Pre-scaled values — no scale factor math needed');
          lines.push('- Auto-discovery of device instances via wildcard subscribe');
          lines.push('- Easier to use: no unit IDs required per tool call');
        } else if (modbusAvailable) {
          lines.push('**Modbus TCP**\n');
          lines.push('- Direct register access with lowest latency');
          lines.push('- Requires a unit ID per device (see table above)');
        }
        lines.push('');

        // Phase 5: Ready-to-use configurations
        lines.push('## MCP Server Configuration\n');
        lines.push('Copy one of the configs below into your MCP client settings (Claude Desktop, etc.).\n');

        if (mqttAvailable && portalId) {
          lines.push('### MQTT (recommended)\n');
          lines.push('```json');
          lines.push(JSON.stringify({
            mcpServers: {
              'victron-tcp': {
                command: 'npx',
                args: ['-y', 'victron-tcp'],
                env: {
                  VICTRON_TRANSPORT: 'mqtt',
                  VICTRON_HOST: host,
                  VICTRON_MQTT_PORT: String(mqttPort),
                  VICTRON_PORTAL_ID: portalId,
                },
              },
            },
          }, null, 2));
          lines.push('```\n');
        }

        if (modbusAvailable) {
          const defaultUnitId = modbusDevices.find(d =>
            d.service === 'com.victronenergy.system',
          )?.unitId ?? 100;

          lines.push('### Modbus TCP\n');
          lines.push('```json');
          lines.push(JSON.stringify({
            mcpServers: {
              'victron-tcp': {
                command: 'npx',
                args: ['-y', 'victron-tcp'],
                env: {
                  VICTRON_TRANSPORT: 'modbus',
                  VICTRON_HOST: host,
                  VICTRON_MODBUS_PORT: String(modbusPort),
                  VICTRON_UNIT_ID: String(defaultUnitId),
                },
              },
            },
          }, null, 2));
          lines.push('```\n');
        }

        // Environment variable export
        lines.push('### Environment Variables\n');
        lines.push('```bash');
        if (mqttAvailable && portalId) {
          lines.push(`export VICTRON_TRANSPORT=mqtt`);
          lines.push(`export VICTRON_HOST=${host}`);
          lines.push(`export VICTRON_MQTT_PORT=${mqttPort}`);
          lines.push(`export VICTRON_PORTAL_ID=${portalId}`);
        } else if (modbusAvailable) {
          const defaultUnitId = modbusDevices.find(d =>
            d.service === 'com.victronenergy.system',
          )?.unitId ?? 100;
          lines.push(`export VICTRON_TRANSPORT=modbus`);
          lines.push(`export VICTRON_HOST=${host}`);
          lines.push(`export VICTRON_MODBUS_PORT=${modbusPort}`);
          lines.push(`export VICTRON_UNIT_ID=${defaultUnitId}`);
        }
        lines.push('```\n');

        lines.push('With this configuration all tools work without extra parameters.');
        lines.push('You can still override per-call with `transport`, `host`, `unitId`, `portalId`, etc.');

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
