import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('returns default values when no env vars set', () => {
    const originalTransport = process.env['VICTRON_TRANSPORT'];
    const originalPort = process.env['VICTRON_MODBUS_PORT'];
    const originalMqttPort = process.env['VICTRON_MQTT_PORT'];

    delete process.env['VICTRON_TRANSPORT'];
    delete process.env['VICTRON_MODBUS_PORT'];
    delete process.env['VICTRON_MQTT_PORT'];
    delete process.env['VICTRON_UNIT_ID'];

    try {
      const config = loadConfig();
      expect(config.transport).toBe('modbus');
      expect(config.modbusPort).toBe(502);
      expect(config.mqttPort).toBe(1883);
      expect(config.unitId).toBeUndefined();
    } finally {
      if (originalTransport) process.env['VICTRON_TRANSPORT'] = originalTransport;
      if (originalPort) process.env['VICTRON_MODBUS_PORT'] = originalPort;
      if (originalMqttPort) process.env['VICTRON_MQTT_PORT'] = originalMqttPort;
    }
  });

  it('parses VICTRON_TRANSPORT=mqtt', () => {
    const original = process.env['VICTRON_TRANSPORT'];
    process.env['VICTRON_TRANSPORT'] = 'mqtt';

    try {
      const config = loadConfig();
      expect(config.transport).toBe('mqtt');
    } finally {
      if (original) {
        process.env['VICTRON_TRANSPORT'] = original;
      } else {
        delete process.env['VICTRON_TRANSPORT'];
      }
    }
  });

  it('throws on invalid transport', () => {
    const original = process.env['VICTRON_TRANSPORT'];
    process.env['VICTRON_TRANSPORT'] = 'invalid';

    try {
      expect(() => loadConfig()).toThrow('Invalid VICTRON_TRANSPORT');
    } finally {
      if (original) {
        process.env['VICTRON_TRANSPORT'] = original;
      } else {
        delete process.env['VICTRON_TRANSPORT'];
      }
    }
  });

  it('throws on invalid port', () => {
    const original = process.env['VICTRON_MODBUS_PORT'];
    process.env['VICTRON_MODBUS_PORT'] = 'abc';

    try {
      expect(() => loadConfig()).toThrow('Invalid VICTRON_MODBUS_PORT');
    } finally {
      if (original) {
        process.env['VICTRON_MODBUS_PORT'] = original;
      } else {
        delete process.env['VICTRON_MODBUS_PORT'];
      }
    }
  });

  it('parses VICTRON_UNIT_ID', () => {
    const original = process.env['VICTRON_UNIT_ID'];
    process.env['VICTRON_UNIT_ID'] = '247';

    try {
      const config = loadConfig();
      expect(config.unitId).toBe(247);
    } finally {
      if (original) {
        process.env['VICTRON_UNIT_ID'] = original;
      } else {
        delete process.env['VICTRON_UNIT_ID'];
      }
    }
  });
});
