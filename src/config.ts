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

  const modbusPort = parseInt(process.env['VICTRON_MODBUS_PORT'] ?? '502', 10);
  if (isNaN(modbusPort)) {
    throw new Error(`Invalid VICTRON_MODBUS_PORT: "${process.env['VICTRON_MODBUS_PORT']}" — must be a number`);
  }

  const mqttPort = parseInt(process.env['VICTRON_MQTT_PORT'] ?? '1883', 10);
  if (isNaN(mqttPort)) {
    throw new Error(`Invalid VICTRON_MQTT_PORT: "${process.env['VICTRON_MQTT_PORT']}" — must be a number`);
  }

  let unitId: number | undefined;
  if (process.env['VICTRON_UNIT_ID']) {
    unitId = parseInt(process.env['VICTRON_UNIT_ID'], 10);
    if (isNaN(unitId)) {
      throw new Error(`Invalid VICTRON_UNIT_ID: "${process.env['VICTRON_UNIT_ID']}" — must be a number`);
    }
  }

  return {
    transport,
    host: process.env['VICTRON_HOST'],
    modbusPort,
    mqttPort,
    portalId: process.env['VICTRON_PORTAL_ID'],
    unitId,
  };
}

export const config = loadConfig();
