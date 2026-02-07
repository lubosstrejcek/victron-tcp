import { createRequire } from 'node:module';
import type { RegisterDefinition, RegisterReadResult } from '../modbus/types.js';
import { serviceTypeFromService, buildMqttTopic, parseMqttPayload, mqttValueToResult } from './decoders.js';

const require = createRequire(import.meta.url);
const mqtt = require('mqtt');

const CONNECT_TIMEOUT = 5000;
const READ_TIMEOUT = 8000;
const KEEPALIVE_INTERVAL = 3000;

interface MqttMessage {
  topic: string;
  value: unknown;
}

export class VictronMqttClient {
  private client: any;
  private portalId: string;
  private messages: Map<string, unknown> = new Map();

  constructor(portalId: string) {
    this.portalId = portalId;
  }

  async connect(host: string, port: number = 1883): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('MQTT connection timeout')), CONNECT_TIMEOUT);

      this.client = mqtt.connect(`mqtt://${host}:${port}`, {
        connectTimeout: CONNECT_TIMEOUT,
        keepalive: 30,
      });

      this.client.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });

      this.client.on('error', (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  async readRegisters(
    service: string,
    deviceInstance: string | number,
    registers: RegisterDefinition[],
  ): Promise<RegisterReadResult[]> {
    const serviceType = serviceTypeFromService(service);

    const topicToReg = new Map<string, RegisterDefinition>();
    for (const reg of registers) {
      const topic = buildMqttTopic(this.portalId, serviceType, deviceInstance, reg.dbusPath);
      topicToReg.set(topic, reg);
    }

    this.messages.clear();

    return new Promise<RegisterReadResult[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve(buildResults());
      }, READ_TIMEOUT);

      let receivedCount = 0;
      const expectedCount = registers.length;

      const onMessage = (topic: string, payload: Buffer): void => {
        const value = parseMqttPayload(payload);
        this.messages.set(topic, value);

        if (topicToReg.has(topic)) {
          receivedCount++;
          if (receivedCount >= expectedCount) {
            clearTimeout(timer);
            cleanup();
            resolve(buildResults());
          }
        }
      };

      const onError = (err: Error): void => {
        clearTimeout(timer);
        cleanup();
        reject(err);
      };

      const cleanup = (): void => {
        this.client.removeListener('message', onMessage);
        this.client.removeListener('error', onError);
        for (const topic of topicToReg.keys()) {
          this.client.unsubscribe(topic);
        }
      };

      const buildResults = (): RegisterReadResult[] => {
        return registers.map(reg => {
          const topic = buildMqttTopic(this.portalId, serviceType, deviceInstance, reg.dbusPath);
          const value = this.messages.get(topic);
          return mqttValueToResult(reg, value ?? null);
        });
      };

      this.client.on('message', onMessage);
      this.client.on('error', onError);

      for (const topic of topicToReg.keys()) {
        this.client.subscribe(topic);
      }

      this.publishKeepalive();
    });
  }

  async readRegistersWildcard(
    service: string,
    registers: RegisterDefinition[],
  ): Promise<RegisterReadResult[]> {
    const serviceType = serviceTypeFromService(service);
    const topicPattern = `N/${this.portalId}/${serviceType}/+/#`;

    const pathToReg = new Map<string, RegisterDefinition>();
    for (const reg of registers) {
      pathToReg.set(reg.dbusPath, reg);
    }

    this.messages.clear();
    const pathValues = new Map<string, unknown>();

    return new Promise<RegisterReadResult[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve(buildResults());
      }, READ_TIMEOUT);

      const onMessage = (topic: string, payload: Buffer): void => {
        const value = parseMqttPayload(payload);
        const parts = topic.split('/');
        if (parts.length < 4) return;

        const dbusPath = '/' + parts.slice(4).join('/');
        if (pathToReg.has(dbusPath)) {
          pathValues.set(dbusPath, value);
          if (pathValues.size >= pathToReg.size) {
            clearTimeout(timer);
            cleanup();
            resolve(buildResults());
          }
        }
      };

      const onError = (err: Error): void => {
        clearTimeout(timer);
        cleanup();
        reject(err);
      };

      const cleanup = (): void => {
        this.client.removeListener('message', onMessage);
        this.client.removeListener('error', onError);
        this.client.unsubscribe(topicPattern);
      };

      const buildResults = (): RegisterReadResult[] => {
        return registers.map(reg => {
          const value = pathValues.get(reg.dbusPath);
          return mqttValueToResult(reg, value ?? null);
        });
      };

      this.client.on('message', onMessage);
      this.client.on('error', onError);
      this.client.subscribe(topicPattern);
      this.publishKeepalive();
    });
  }

  async discoverServices(): Promise<Array<{ serviceType: string; deviceInstance: string }>> {
    const topicPattern = `N/${this.portalId}/+/+/#`;
    const services = new Map<string, Set<string>>();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve(buildResult());
      }, READ_TIMEOUT);

      const onMessage = (topic: string): void => {
        const parts = topic.split('/');
        if (parts.length < 4) return;

        const serviceType = parts[2];
        const deviceInstance = parts[3];
        if (!services.has(serviceType)) {
          services.set(serviceType, new Set());
        }
        services.get(serviceType)!.add(deviceInstance);
      };

      const onError = (err: Error): void => {
        clearTimeout(timer);
        cleanup();
        reject(err);
      };

      const cleanup = (): void => {
        this.client.removeListener('message', onMessage);
        this.client.removeListener('error', onError);
        this.client.unsubscribe(topicPattern);
      };

      const buildResult = (): Array<{ serviceType: string; deviceInstance: string }> => {
        const result: Array<{ serviceType: string; deviceInstance: string }> = [];
        for (const [serviceType, instances] of services) {
          for (const deviceInstance of instances) {
            result.push({ serviceType, deviceInstance });
          }
        }
        return result.sort((a, b) => a.serviceType.localeCompare(b.serviceType));
      };

      this.client.on('message', onMessage);
      this.client.on('error', onError);
      this.client.subscribe(topicPattern);
      this.publishKeepalive();
    });
  }

  private publishKeepalive(): void {
    this.client.publish(`R/${this.portalId}/keepalive`, '');
  }

  async close(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.client) {
        resolve();
        return;
      }
      this.client.end(false, {}, () => resolve());
    });
  }

  static async discoverPortalId(host: string, port: number = 1883): Promise<string> {
    const client = mqtt.connect(`mqtt://${host}:${port}`, {
      connectTimeout: CONNECT_TIMEOUT,
      keepalive: 30,
    });

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        client.end();
        reject(new Error('Portal ID discovery timeout — no MQTT data received'));
      }, READ_TIMEOUT);

      client.on('connect', () => {
        client.subscribe('N/+/system/+/Serial');
      });

      client.on('message', (topic: string) => {
        clearTimeout(timer);
        const parts = topic.split('/');
        if (parts.length >= 2) {
          const portalId = parts[1];
          client.end();
          resolve(portalId);
        }
      });

      client.on('error', (err: Error) => {
        clearTimeout(timer);
        client.end();
        reject(err);
      });
    });
  }
}

export async function withMqttClient<T>(
  host: string,
  port: number,
  portalId: string,
  fn: (client: VictronMqttClient) => Promise<T>,
): Promise<T> {
  const client = new VictronMqttClient(portalId);
  try {
    await client.connect(host, port);
    return await fn(client);
  } finally {
    await client.close();
  }
}
