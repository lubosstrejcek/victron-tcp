import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildConnectionParams } from '../src/tools/helpers.js';

describe('buildConnectionParams', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env['VICTRON_TRANSPORT'];
    delete process.env['VICTRON_HOST'];
    delete process.env['VICTRON_MODBUS_PORT'];
    delete process.env['VICTRON_MQTT_PORT'];
    delete process.env['VICTRON_PORTAL_ID'];
    delete process.env['VICTRON_UNIT_ID'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('modbus transport', () => {
    it('builds modbus params from tool input', () => {
      const params = buildConnectionParams({ host: '192.168.1.1', port: 502, unitId: 247 });
      expect(params).toEqual({
        transport: 'modbus',
        host: '192.168.1.1',
        port: 502,
        unitId: 247,
      });
    });

    it('defaults to modbus transport', () => {
      const params = buildConnectionParams({ host: '192.168.1.1', unitId: 100 });
      expect(params.transport).toBe('modbus');
    });

    it('uses default port 502', () => {
      const params = buildConnectionParams({ host: '192.168.1.1', unitId: 100 });
      expect(params).toMatchObject({ port: 502 });
    });

    it('falls back to unitId 100 when not provided', () => {
      const params = buildConnectionParams({ host: '192.168.1.1' });
      expect(params).toMatchObject({ unitId: 100 });
    });

    it('throws when host is missing', () => {
      expect(() => buildConnectionParams({})).toThrow('Host is required');
    });
  });

  describe('mqtt transport', () => {
    it('builds mqtt params from tool input', () => {
      const params = buildConnectionParams({
        transport: 'mqtt',
        host: '192.168.1.1',
        portalId: 'abc123',
        deviceInstance: '256',
      });
      expect(params).toEqual({
        transport: 'mqtt',
        host: '192.168.1.1',
        port: 1883,
        portalId: 'abc123',
        deviceInstance: '256',
      });
    });

    it('uses mqttHost when provided', () => {
      const params = buildConnectionParams({
        transport: 'mqtt',
        host: '192.168.1.1',
        mqttHost: '10.0.0.1',
        portalId: 'abc123',
      });
      expect(params).toMatchObject({ host: '10.0.0.1' });
    });

    it('falls back to host when mqttHost not provided', () => {
      const params = buildConnectionParams({
        transport: 'mqtt',
        host: '192.168.1.1',
        portalId: 'abc123',
      });
      expect(params).toMatchObject({ host: '192.168.1.1' });
    });

    it('uses mqttPort when provided', () => {
      const params = buildConnectionParams({
        transport: 'mqtt',
        host: '192.168.1.1',
        mqttPort: 8883,
        portalId: 'abc123',
      });
      expect(params).toMatchObject({ port: 8883 });
    });

    it('throws when portalId is missing', () => {
      expect(() => buildConnectionParams({
        transport: 'mqtt',
        host: '192.168.1.1',
      })).toThrow('Portal ID is required');
    });

    it('throws when host is missing', () => {
      expect(() => buildConnectionParams({
        transport: 'mqtt',
        portalId: 'abc123',
      })).toThrow('MQTT host is required');
    });

    it('allows omitting deviceInstance', () => {
      const params = buildConnectionParams({
        transport: 'mqtt',
        host: '192.168.1.1',
        portalId: 'abc123',
      });
      expect(params).toMatchObject({ deviceInstance: undefined });
    });
  });
});
