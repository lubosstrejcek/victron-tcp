import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { RegisterReadResult } from '../modbus/types.js';
import type { ConnectionParams } from '../transport.js';
import { config } from '../config.js';

export const hostSchema = z.string().min(1).describe('GX device IP address or hostname');
export const portSchema = z.number().int().min(1).max(65535).default(502).describe('Modbus TCP port');
export const unitIdSchema = z.number().int().min(0).max(247).describe('Modbus unit ID');
export const addressSchema = z.number().int().min(0).max(65535).describe('Starting register address');
export const countSchema = z.number().int().min(1).max(125).default(1).describe('Number of registers (words) to read');

export const transportSchema = z.enum(['modbus', 'mqtt']).optional().describe(
  'Transport protocol. Defaults to VICTRON_TRANSPORT env var or "modbus".',
);
export const mqttHostSchema = z.string().optional().describe(
  'MQTT broker host. Defaults to the "host" parameter or VICTRON_HOST env var.',
);
export const mqttPortSchema = z.number().int().min(1).max(65535).optional().describe(
  'MQTT broker port. Defaults to VICTRON_MQTT_PORT env var or 1883.',
);
export const portalIdSchema = z.string().optional().describe(
  'Venus OS portal ID for MQTT topics. Use victron_mqtt_discover to find it. Defaults to VICTRON_PORTAL_ID env var.',
);
export const deviceInstanceSchema = z.union([z.string(), z.number()]).optional().describe(
  'MQTT device instance number. If omitted, uses wildcard subscribe to find the first matching device.',
);

export const transportInputSchema = {
  transport: transportSchema,
  mqttHost: mqttHostSchema,
  mqttPort: mqttPortSchema,
  portalId: portalIdSchema,
  deviceInstance: deviceInstanceSchema,
};

export function buildConnectionParams(input: {
  transport?: string;
  host?: string;
  port?: number;
  unitId?: number;
  mqttHost?: string;
  mqttPort?: number;
  portalId?: string;
  deviceInstance?: string | number;
}): ConnectionParams {
  const transport = input.transport ?? config.transport;

  if (transport === 'mqtt') {
    const host = input.mqttHost ?? input.host ?? config.host;
    if (!host) {
      throw new Error('MQTT host is required. Provide mqttHost, host, or set VICTRON_HOST env var.');
    }

    const portalId = input.portalId ?? config.portalId;
    if (!portalId) {
      throw new Error('Portal ID is required for MQTT. Provide portalId, set VICTRON_PORTAL_ID env var, or run victron_mqtt_discover first.');
    }

    return {
      transport: 'mqtt',
      host,
      port: input.mqttPort ?? config.mqttPort,
      portalId,
      deviceInstance: input.deviceInstance,
    };
  }

  const host = input.host ?? config.host;
  if (!host) {
    throw new Error('Host is required. Provide host or set VICTRON_HOST env var.');
  }

  return {
    transport: 'modbus',
    host,
    port: input.port ?? config.modbusPort,
    unitId: input.unitId ?? config.unitId ?? 100,
  };
}

export function formatResults(title: string, results: RegisterReadResult[]): CallToolResult {
  const lines: string[] = [`# ${title}\n`];

  for (const result of results) {
    if (result.value === 'Not available' || result.value === 'Error reading register') continue;
    const val = result.enumLabel ?? `${result.value}${result.unit ? ' ' + result.unit : ''}`;
    lines.push(`- **${result.description}**: ${val}`);
  }

  if (lines.length === 1) {
    lines.push('No data available. The device may be disconnected or the unit ID may be incorrect.');
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

export function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}

export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export const DISCOVERY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;
