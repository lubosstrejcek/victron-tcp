export type Transport = 'modbus' | 'mqtt';

export interface Config {
  transport: Transport;
  host?: string;
  modbusPort: number;
  mqttPort: number;
  portalId?: string;
  unitId?: number;
}

export function loadConfig(): Config {
  const transport = (process.env['VICTRON_TRANSPORT'] ?? 'modbus') as Transport;
  if (transport !== 'modbus' && transport !== 'mqtt') {
    throw new Error(`Invalid VICTRON_TRANSPORT: "${transport}" — must be "modbus" or "mqtt"`);
  }

  return {
    transport,
    host: process.env['VICTRON_HOST'],
    modbusPort: parseInt(process.env['VICTRON_MODBUS_PORT'] ?? '502', 10),
    mqttPort: parseInt(process.env['VICTRON_MQTT_PORT'] ?? '1883', 10),
    portalId: process.env['VICTRON_PORTAL_ID'],
    unitId: process.env['VICTRON_UNIT_ID'] ? parseInt(process.env['VICTRON_UNIT_ID'], 10) : undefined,
  };
}

export const config = loadConfig();
