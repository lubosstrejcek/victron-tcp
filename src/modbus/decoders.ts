import {
  type RegisterDefinition,
  getRegisterWordCount,
  MODBUS_ERROR_CODES,
} from './types.js';

export function decodeNumeric(raw: number[], dataType: string): number {
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

export function decodeString(raw: number[]): string {
  const bytes: number[] = [];
  for (const word of raw) {
    bytes.push((word >> 8) & 0xFF);
    bytes.push(word & 0xFF);
  }
  return String.fromCharCode(...bytes.filter(b => b !== 0)).trim();
}

export function isDisconnected(value: number, dataType: string): boolean {
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

export function decodeValue(raw: number[], reg: RegisterDefinition): number | string {
  if (reg.dataType === 'string') {
    return decodeString(raw);
  }

  const numericValue = decodeNumeric(raw, reg.dataType);

  if (isDisconnected(numericValue, reg.dataType)) {
    return 'Not available';
  }

  if (reg.scaleFactor === 1 || reg.scaleFactor === 0) {
    return numericValue;
  }

  return numericValue / reg.scaleFactor;
}

export function groupIntoBatches(sorted: RegisterDefinition[]): RegisterDefinition[][] {
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

export function wrapModbusError(error: unknown, address: number): Error {
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
