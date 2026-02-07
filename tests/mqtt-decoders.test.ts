import { describe, it, expect } from 'vitest';
import {
  serviceTypeFromService,
  buildMqttTopic,
  parseMqttPayload,
  mqttValueToResult,
} from '../src/mqtt/decoders.js';
import type { RegisterDefinition } from '../src/modbus/types.js';

function makeReg(overrides: Partial<RegisterDefinition> = {}): RegisterDefinition {
  return {
    address: 100,
    name: 'test',
    description: 'Test register',
    dataType: 'uint16',
    scaleFactor: 1,
    unit: '',
    writable: false,
    dbusPath: '/Test',
    ...overrides,
  };
}

describe('serviceTypeFromService', () => {
  it('extracts last component from dotted service name', () => {
    expect(serviceTypeFromService('com.victronenergy.battery')).toBe('battery');
    expect(serviceTypeFromService('com.victronenergy.solarcharger')).toBe('solarcharger');
    expect(serviceTypeFromService('com.victronenergy.system')).toBe('system');
  });

  it('returns the string itself if no dots', () => {
    expect(serviceTypeFromService('battery')).toBe('battery');
  });
});

describe('buildMqttTopic', () => {
  it('builds correct topic with string deviceInstance', () => {
    expect(buildMqttTopic('abc123', 'battery', '256', '/Soc'))
      .toBe('N/abc123/battery/256/Soc');
  });

  it('builds correct topic with numeric deviceInstance', () => {
    expect(buildMqttTopic('abc123', 'solarcharger', 0, '/Yield/Power'))
      .toBe('N/abc123/solarcharger/0/Yield/Power');
  });

  it('handles dbusPath without leading slash', () => {
    expect(buildMqttTopic('abc123', 'battery', '0', 'Soc'))
      .toBe('N/abc123/battery/0/Soc');
  });

  it('handles nested dbusPath', () => {
    expect(buildMqttTopic('abc123', 'system', '0', '/Ac/Grid/L1/Power'))
      .toBe('N/abc123/system/0/Ac/Grid/L1/Power');
  });
});

describe('parseMqttPayload', () => {
  it('extracts value from JSON payload', () => {
    expect(parseMqttPayload(Buffer.from('{"value": 48.2}'))).toBe(48.2);
  });

  it('extracts string value', () => {
    expect(parseMqttPayload(Buffer.from('{"value": "HQ12345"}'))).toBe('HQ12345');
  });

  it('extracts null value', () => {
    expect(parseMqttPayload(Buffer.from('{"value": null}'))).toBeNull();
  });

  it('extracts zero value', () => {
    expect(parseMqttPayload(Buffer.from('{"value": 0}'))).toBe(0);
  });

  it('returns undefined for invalid JSON', () => {
    expect(parseMqttPayload(Buffer.from('not json'))).toBeUndefined();
  });

  it('works with string input', () => {
    expect(parseMqttPayload('{"value": 100}')).toBe(100);
  });
});

describe('mqttValueToResult', () => {
  it('converts numeric value', () => {
    const reg = makeReg({ unit: 'V' });
    const result = mqttValueToResult(reg, 48.2);
    expect(result.value).toBe(48.2);
    expect(result.unit).toBe('V');
    expect(result.name).toBe('test');
  });

  it('converts null to Not available', () => {
    const reg = makeReg();
    const result = mqttValueToResult(reg, null);
    expect(result.value).toBe('Not available');
  });

  it('converts undefined to Not available', () => {
    const reg = makeReg();
    const result = mqttValueToResult(reg, undefined);
    expect(result.value).toBe('Not available');
  });

  it('converts string value', () => {
    const reg = makeReg({ dataType: 'string' });
    const result = mqttValueToResult(reg, 'HQ12345');
    expect(result.value).toBe('HQ12345');
  });

  it('applies enum label for numeric value', () => {
    const reg = makeReg({ enumValues: { 0: 'Off', 1: 'On' } });
    const result = mqttValueToResult(reg, 1);
    expect(result.enumLabel).toBe('On');
    expect(result.value).toBe(1);
  });

  it('handles unknown enum value', () => {
    const reg = makeReg({ enumValues: { 0: 'Off', 1: 'On' } });
    const result = mqttValueToResult(reg, 99);
    expect(result.enumLabel).toBe('Unknown (99)');
  });

  it('does not apply scale factor (MQTT values are pre-scaled)', () => {
    const reg = makeReg({ scaleFactor: 10, unit: 'V' });
    const result = mqttValueToResult(reg, 48.2);
    expect(result.value).toBe(48.2);
  });
});
