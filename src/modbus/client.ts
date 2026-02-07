import { createRequire } from 'node:module';
import {
  type RegisterDefinition,
  type RegisterReadResult,
  getRegisterWordCount,
} from './types.js';
import {
  decodeValue,
  groupIntoBatches,
  wrapModbusError,
} from './decoders.js';

const require = createRequire(import.meta.url);
const ModbusRTU = require('modbus-serial');

const CONNECTION_TIMEOUT = 5000;
const READ_TIMEOUT = 5000;

export class VictronModbusClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;

  constructor() {
    this.client = new ModbusRTU();
  }

  async connect(host: string, port: number = 502): Promise<void> {
    this.client.setTimeout(READ_TIMEOUT);
    await this.client.connectTCP(host, { port });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT);
      const check = (): void => {
        if (this.client.isOpen) {
          clearTimeout(timer);
          resolve();
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }

  setUnitId(unitId: number): void {
    this.client.setID(unitId);
  }

  async readRawRegisters(address: number, count: number): Promise<number[]> {
    try {
      const result = await this.client.readHoldingRegisters(address, count);
      return Array.from(result.data);
    } catch (error) {
      throw wrapModbusError(error, address);
    }
  }

  async readRegister(reg: RegisterDefinition): Promise<RegisterReadResult> {
    const wordCount = getRegisterWordCount(reg);
    const raw = await this.readRawRegisters(reg.address, wordCount);

    const value = decodeValue(raw, reg);
    const result: RegisterReadResult = {
      name: reg.name,
      description: reg.description,
      rawValue: raw.length === 1 ? raw[0] : raw,
      value,
      unit: reg.unit,
    };

    if (reg.enumValues && typeof value === 'number') {
      result.enumLabel = reg.enumValues[value] ?? `Unknown (${value})`;
    }

    return result;
  }

  async readRegisters(registers: RegisterDefinition[]): Promise<RegisterReadResult[]> {
    const results: RegisterReadResult[] = [];

    const sorted = [...registers].sort((a, b) => a.address - b.address);
    const batches = groupIntoBatches(sorted);

    for (const batch of batches) {
      const startAddr = batch[0].address;
      const lastReg = batch[batch.length - 1];
      const endAddr = lastReg.address + getRegisterWordCount(lastReg);
      const totalWords = endAddr - startAddr;

      try {
        const rawData = await this.readRawRegisters(startAddr, totalWords);

        for (const reg of batch) {
          const offset = reg.address - startAddr;
          const wordCount = getRegisterWordCount(reg);
          const regData = rawData.slice(offset, offset + wordCount);
          const value = decodeValue(regData, reg);

          const result: RegisterReadResult = {
            name: reg.name,
            description: reg.description,
            rawValue: regData.length === 1 ? regData[0] : regData,
            value,
            unit: reg.unit,
          };

          if (reg.enumValues && typeof value === 'number') {
            result.enumLabel = reg.enumValues[value] ?? `Unknown (${value})`;
          }

          results.push(result);
        }
      } catch {
        for (const reg of batch) {
          try {
            results.push(await this.readRegister(reg));
          } catch {
            results.push({
              name: reg.name,
              description: reg.description,
              rawValue: 0,
              value: 'Error reading register',
              unit: reg.unit,
            });
          }
        }
      }
    }

    return results;
  }

  async close(): Promise<void> {
    if (this.client.isOpen) {
      this.client.close(() => {});
    }
  }
}

export async function withModbusClient<T>(
  host: string,
  port: number,
  unitId: number,
  fn: (client: VictronModbusClient) => Promise<T>,
): Promise<T> {
  const client = new VictronModbusClient();
  try {
    await client.connect(host, port);
    client.setUnitId(unitId);
    return await fn(client);
  } finally {
    await client.close();
  }
}
