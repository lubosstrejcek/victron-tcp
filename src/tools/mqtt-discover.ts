import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VictronMqttClient, withMqttClient } from '../mqtt/client.js';
import { errorResult, DISCOVERY_ANNOTATIONS } from './helpers.js';
import { config } from '../config.js';

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

export function registerMqttDiscoverTools(server: McpServer): void {
  server.registerTool(
    'victron_mqtt_discover',
    {
      title: 'MQTT Discovery',
      description: 'Discover Venus OS devices via MQTT. Auto-discovers the portalId, lists all available services, maps them to tools, and outputs a ready-to-use MCP server config. Run this first when setting up MQTT transport.',
      inputSchema: {
        mqttHost: z.string().min(1).describe('MQTT broker host (usually the GX device IP)'),
        mqttPort: z.number().int().min(1).max(65535).default(1883).describe('MQTT broker port'),
      },
      annotations: DISCOVERY_ANNOTATIONS,
    },
    async ({ mqttHost, mqttPort }) => {
      try {
        const host = mqttHost ?? config.host;
        if (!host) {
          return errorResult(new Error('MQTT host is required. Provide mqttHost or set VICTRON_HOST env var.'));
        }

        const portalId = await VictronMqttClient.discoverPortalId(host, mqttPort);

        const services = await withMqttClient(host, mqttPort, portalId, async (client) => {
          return client.discoverServices();
        });

        const lines: string[] = ['# MQTT Discovery\n'];

        lines.push('## Device');
        lines.push(`- **Host**: \`${host}\``);
        lines.push(`- **MQTT Port**: \`${mqttPort}\``);
        lines.push(`- **Portal ID**: \`${portalId}\``);
        lines.push('');

        lines.push('## Available Services\n');

        const grouped = new Map<string, string[]>();
        for (const svc of services) {
          if (!grouped.has(svc.serviceType)) {
            grouped.set(svc.serviceType, []);
          }
          grouped.get(svc.serviceType)!.push(svc.deviceInstance);
        }

        for (const [serviceType, instances] of grouped) {
          const tool = SERVICE_TO_TOOL[serviceType];
          const toolHint = tool ? ` → \`${tool}\`` : '';
          const instanceList = instances.join(', ');
          lines.push(`- **${serviceType}** [${instanceList}]${toolHint}`);
        }

        lines.push('');
        lines.push('## Suggested MCP Server Config\n');
        lines.push('Add this to your Claude Desktop / MCP client config to use MQTT by default:\n');
        lines.push('```json');
        lines.push(JSON.stringify({
          mcpServers: {
            'victron-tcp': {
              command: 'node',
              args: ['dist/index.js'],
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

        lines.push('## Environment Variables\n');
        lines.push('Or export these in your shell:\n');
        lines.push('```bash');
        lines.push(`export VICTRON_TRANSPORT=mqtt`);
        lines.push(`export VICTRON_HOST=${host}`);
        lines.push(`export VICTRON_MQTT_PORT=${mqttPort}`);
        lines.push(`export VICTRON_PORTAL_ID=${portalId}`);
        lines.push('```\n');

        lines.push('With this config, all tools work without extra parameters.');
        lines.push('You can still override per-call with `transport`, `portalId`, `deviceInstance`, etc.');

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
