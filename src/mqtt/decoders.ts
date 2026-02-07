import type { RegisterDefinition, RegisterReadResult } from '../modbus/types.js';

export function serviceTypeFromService(service: string): string {
  const parts = service.split('.');
  return parts[parts.length - 1];
}

export function buildMqttTopic(
  portalId: string,
  serviceType: string,
  deviceInstance: string | number,
  dbusPath: string,
): string {
  const path = dbusPath.startsWith('/') ? dbusPath : `/${dbusPath}`;
  return `N/${portalId}/${serviceType}/${deviceInstance}${path}`;
}

export function parseMqttPayload(payload: Buffer | string): unknown {
  try {
    const json = JSON.parse(typeof payload === 'string' ? payload : payload.toString());
    return json.value;
  } catch {
    return undefined;
  }
}

export function mqttValueToResult(reg: RegisterDefinition, mqttValue: unknown): RegisterReadResult {
  if (mqttValue === null || mqttValue === undefined) {
    return {
      name: reg.name,
      description: reg.description,
      rawValue: 0,
      value: 'Not available',
      unit: reg.unit,
    };
  }

  if (typeof mqttValue === 'string') {
    return {
      name: reg.name,
      description: reg.description,
      rawValue: 0,
      value: mqttValue,
      unit: reg.unit,
    };
  }

  if (typeof mqttValue === 'number') {
    const result: RegisterReadResult = {
      name: reg.name,
      description: reg.description,
      rawValue: mqttValue,
      value: mqttValue,
      unit: reg.unit,
    };

    if (reg.enumValues) {
      result.enumLabel = reg.enumValues[mqttValue] ?? `Unknown (${mqttValue})`;
    }

    return result;
  }

  return {
    name: reg.name,
    description: reg.description,
    rawValue: 0,
    value: String(mqttValue),
    unit: reg.unit,
  };
}
