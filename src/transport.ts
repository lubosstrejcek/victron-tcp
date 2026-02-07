import type { RegisterDefinition, RegisterReadResult } from './modbus/types.js';
import { withModbusClient } from './modbus/client.js';
import { withMqttClient } from './mqtt/client.js';

export interface ModbusParams {
  transport: 'modbus';
  host: string;
  port: number;
  unitId: number;
}

export interface MqttParams {
  transport: 'mqtt';
  host: string;
  port: number;
  portalId: string;
  deviceInstance?: string | number;
}

export type ConnectionParams = ModbusParams | MqttParams;

export async function readDeviceRegisters(
  params: ConnectionParams,
  service: string,
  registers: RegisterDefinition[],
): Promise<RegisterReadResult[]> {
  if (params.transport === 'modbus') {
    return withModbusClient(params.host, params.port, params.unitId, async (client) => {
      return client.readRegisters(registers);
    });
  }

  return withMqttClient(params.host, params.port, params.portalId, async (client) => {
    if (params.deviceInstance !== undefined) {
      return client.readRegisters(service, params.deviceInstance, registers);
    }
    return client.readRegistersWildcard(service, registers);
  });
}
