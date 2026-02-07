import { createRequire } from 'node:module';
import {
  type RegisterDefinition,
  type RegisterReadResult,
  getRegisterWordCount,
  MODBUS_ERROR_CODES,
} from './types.js';

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
      throw this.wrapModbusError(error, address);
    }
  }

  async readRegister(reg: RegisterDefinition): Promise<RegisterReadResult> {
    const wordCount = getRegisterWordCount(reg);
    const raw = await this.readRawRegisters(reg.address, wordCount);

    const value = this.decodeValue(raw, reg);
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
    const batches = this.groupIntoBatches(sorted);

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
          const value = this.decodeValue(regData, reg);

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

  private groupIntoBatches(sorted: RegisterDefinition[]): RegisterDefinition[][] {
    // maxGap must be 0: Victron FAQ explicitly warns that reading non-existent
    // registers in a batch causes the entire request to fail. Only truly
    // consecutive registers (no gaps) can be batched safely.
    const maxGap = 0;
    const maxBatchSize = 100;
    const batches: RegisterDefinition[][] = [];
    let current: RegisterDefinition[] = [];

    for (const reg of sorted) {
      if (current.length === 0) {
        current.push(reg);
        continue;
      }

      const lastReg = current[current.length - 1];
      const lastEnd = lastReg.address + getRegisterWordCount(lastReg);
      const gap = reg.address - lastEnd;
      const batchEnd = reg.address + getRegisterWordCount(reg);
      const batchSize = batchEnd - current[0].address;

      if (gap <= maxGap && batchSize <= maxBatchSize) {
        current.push(reg);
        continue;
      }

      batches.push(current);
      current = [reg];
    }

    if (current.length > 0) {
      batches.push(current);
    }

    return batches;
  }

  private decodeValue(raw: number[], reg: RegisterDefinition): number | string {
    if (reg.dataType === 'string') {
      return this.decodeString(raw);
    }

    const numericValue = this.decodeNumeric(raw, reg.dataType);

    if (this.isDisconnected(numericValue, reg.dataType)) {
      return 'Not available';
    }

    if (reg.scaleFactor === 1 || reg.scaleFactor === 0) {
      return numericValue;
    }

    return numericValue / reg.scaleFactor;
  }

  private decodeNumeric(raw: number[], dataType: string): number {
    switch (dataType) {
      case 'uint16':
        return raw[0];
      case 'int16': {
        const val = raw[0];
        return val >= 0x8000 ? val - 0x10000 : val;
      }
      case 'uint32':
        return (raw[0] << 16) + raw[1];
      case 'int32': {
        const val = (raw[0] << 16) + raw[1];
        return val >= 0x80000000 ? val - 0x100000000 : val;
      }
      case 'uint64':
        return (raw[0] * 0x1000000000000) + (raw[1] * 0x100000000) + (raw[2] * 0x10000) + raw[3];
      default:
        return raw[0];
    }
  }

  private decodeString(raw: number[]): string {
    const bytes: number[] = [];
    for (const word of raw) {
      bytes.push((word >> 8) & 0xFF);
      bytes.push(word & 0xFF);
    }
    return String.fromCharCode(...bytes.filter(b => b !== 0)).trim();
  }

  private isDisconnected(value: number, dataType: string): boolean {
    switch (dataType) {
      case 'uint16':
        return value === 0xFFFF;
      case 'int16':
        return value === 0x7FFF || value === -32768 + 0x7FFF;
      case 'uint32':
        return value === 0xFFFFFFFF;
      case 'int32':
        return value === 0x7FFFFFFF;
      default:
        return false;
    }
  }

  private wrapModbusError(error: unknown, address: number): Error {
    if (error instanceof Error) {
      const match = error.message.match(/Modbus exception (\d+)/);
      if (match) {
        const code = parseInt(match[1], 10);
        const desc = MODBUS_ERROR_CODES[code] ?? 'Unknown error';
        return new Error(`Modbus error at address ${address}: ${desc} (code ${code})`);
      }
      return new Error(`Modbus read error at address ${address}: ${error.message}`);
    }
    return new Error(`Modbus read error at address ${address}: Unknown error`);
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
