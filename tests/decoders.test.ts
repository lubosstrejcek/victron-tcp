import { describe, it, expect } from 'vitest';
import {
  decodeNumeric,
  decodeString,
  isDisconnected,
  decodeValue,
  groupIntoBatches,
} from '../src/modbus/decoders.js';
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
    dbusPath: '/test',
    ...overrides,
  };
}

describe('decodeNumeric', () => {
  it('decodes uint16', () => {
    expect(decodeNumeric([1234], 'uint16')).toBe(1234);
    expect(decodeNumeric([0], 'uint16')).toBe(0);
    expect(decodeNumeric([0xFFFF], 'uint16')).toBe(65535);
  });

  it('decodes int16 positive', () => {
    expect(decodeNumeric([1234], 'int16')).toBe(1234);
    expect(decodeNumeric([0x7FFF], 'int16')).toBe(32767);
  });

  it('decodes int16 negative', () => {
    expect(decodeNumeric([0x8000], 'int16')).toBe(-32768);
    expect(decodeNumeric([0xFFFF], 'int16')).toBe(-1);
    expect(decodeNumeric([0xFFFE], 'int16')).toBe(-2);
  });

  it('decodes uint32', () => {
    expect(decodeNumeric([0, 1], 'uint32')).toBe(1);
    expect(decodeNumeric([1, 0], 'uint32')).toBe(65536);
    expect(decodeNumeric([0x0001, 0x0000], 'uint32')).toBe(65536);
  });

  it('decodes int32 positive', () => {
    expect(decodeNumeric([0, 100], 'int32')).toBe(100);
    expect(decodeNumeric([0x7FFF, 0xFFFF], 'int32')).toBe(2147483647);
  });

  it('decodes int32 negative', () => {
    expect(decodeNumeric([0xFFFF, 0xFFFF], 'int32')).toBe(-1);
    expect(decodeNumeric([0xFFFF, 0xFFFE], 'int32')).toBe(-2);
    expect(decodeNumeric([0x8000, 0x0000], 'int32')).toBe(-2147483648);
  });

  it('decodes uint64', () => {
    expect(decodeNumeric([0, 0, 0, 1], 'uint64')).toBe(1);
    expect(decodeNumeric([0, 0, 1, 0], 'uint64')).toBe(65536);
    expect(decodeNumeric([0, 1, 0, 0], 'uint64')).toBe(0x100000000);
  });

  it('falls back to raw[0] for unknown type', () => {
    expect(decodeNumeric([42], 'unknown')).toBe(42);
  });
});

describe('decodeString', () => {
  it('decodes normal ASCII string', () => {
    // "Hi" = 0x4869
    expect(decodeString([0x4869])).toBe('Hi');
  });

  it('decodes multi-word string', () => {
    // "SIM001" = S(0x53) I(0x49) M(0x4D) 0(0x30) 0(0x30) 1(0x31)
    expect(decodeString([0x5349, 0x4D30, 0x3031])).toBe('SIM001');
  });

  it('strips null padding', () => {
    expect(decodeString([0x4100, 0x0000])).toBe('A');
  });

  it('returns empty for all nulls', () => {
    expect(decodeString([0x0000, 0x0000])).toBe('');
  });
});

describe('isDisconnected', () => {
  it('detects uint16 disconnected (0xFFFF)', () => {
    expect(isDisconnected(0xFFFF, 'uint16')).toBe(true);
    expect(isDisconnected(0xFFFE, 'uint16')).toBe(false);
    expect(isDisconnected(0, 'uint16')).toBe(false);
  });

  it('detects int16 disconnected (0x7FFF)', () => {
    expect(isDisconnected(0x7FFF, 'int16')).toBe(true);
    expect(isDisconnected(100, 'int16')).toBe(false);
  });

  it('detects uint32 disconnected (0xFFFFFFFF)', () => {
    expect(isDisconnected(0xFFFFFFFF, 'uint32')).toBe(true);
    expect(isDisconnected(0xFFFFFFFE, 'uint32')).toBe(false);
  });

  it('detects int32 disconnected (0x7FFFFFFF)', () => {
    expect(isDisconnected(0x7FFFFFFF, 'int32')).toBe(true);
    expect(isDisconnected(100, 'int32')).toBe(false);
  });

  it('returns false for unknown types', () => {
    expect(isDisconnected(0xFFFF, 'uint64')).toBe(false);
    expect(isDisconnected(0xFFFF, 'string')).toBe(false);
  });
});

describe('decodeValue', () => {
  it('dispatches string type to decodeString', () => {
    const reg = makeReg({ dataType: 'string' });
    expect(decodeValue([0x4869, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000], reg)).toBe('Hi');
  });

  it('returns "Not available" for disconnected values', () => {
    const reg = makeReg({ dataType: 'uint16', scaleFactor: 1 });
    expect(decodeValue([0xFFFF], reg)).toBe('Not available');
  });

  it('applies scale factor', () => {
    const reg = makeReg({ dataType: 'uint16', scaleFactor: 10 });
    expect(decodeValue([500], reg)).toBe(50);
  });

  it('applies scale factor of 100', () => {
    const reg = makeReg({ dataType: 'uint16', scaleFactor: 100 });
    expect(decodeValue([2500], reg)).toBe(25);
  });

  it('applies fractional scale factor 0.01', () => {
    const reg = makeReg({ dataType: 'uint16', scaleFactor: 0.01 });
    expect(decodeValue([5], reg)).toBe(500);
  });

  it('passes through with scale factor 1', () => {
    const reg = makeReg({ dataType: 'uint16', scaleFactor: 1 });
    expect(decodeValue([42], reg)).toBe(42);
  });

  it('passes through with scale factor 0', () => {
    const reg = makeReg({ dataType: 'uint16', scaleFactor: 0 });
    expect(decodeValue([42], reg)).toBe(42);
  });

  it('resolves enum values', () => {
    const reg = makeReg({
      dataType: 'uint16',
      scaleFactor: 1,
      enumValues: { 0: 'Off', 1: 'On', 2: 'Charging' },
    });
    // decodeValue itself does not resolve enums — it just returns the number
    // Enum resolution happens in client.readRegister
    expect(decodeValue([1], reg)).toBe(1);
  });
});

describe('groupIntoBatches', () => {
  it('batches consecutive registers', () => {
    const regs = [
      makeReg({ address: 100, dataType: 'uint16' }),
      makeReg({ address: 101, dataType: 'uint16' }),
      makeReg({ address: 102, dataType: 'uint16' }),
    ];
    const batches = groupIntoBatches(regs);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(3);
  });

  it('splits on gap', () => {
    const regs = [
      makeReg({ address: 100, dataType: 'uint16' }),
      makeReg({ address: 101, dataType: 'uint16' }),
      makeReg({ address: 200, dataType: 'uint16' }),
    ];
    const batches = groupIntoBatches(regs);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(2);
    expect(batches[1]).toHaveLength(1);
  });

  it('respects 100-word max batch size', () => {
    const regs: RegisterDefinition[] = [];
    for (let i = 0; i < 110; i++) {
      regs.push(makeReg({ address: i, dataType: 'uint16' }));
    }
    const batches = groupIntoBatches(regs);
    expect(batches.length).toBeGreaterThanOrEqual(2);
    // First batch should be at most 100 words
    const firstBatch = batches[0];
    const lastReg = firstBatch[firstBatch.length - 1];
    expect(lastReg.address - firstBatch[0].address + 1).toBeLessThanOrEqual(100);
  });

  it('handles single register', () => {
    const regs = [makeReg({ address: 500, dataType: 'uint16' })];
    const batches = groupIntoBatches(regs);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
  });

  it('handles empty array', () => {
    const batches = groupIntoBatches([]);
    expect(batches).toHaveLength(0);
  });

  it('accounts for multi-word registers', () => {
    const regs = [
      makeReg({ address: 100, dataType: 'uint32' }), // 2 words: 100-101
      makeReg({ address: 102, dataType: 'uint16' }), // 1 word: 102
    ];
    const batches = groupIntoBatches(regs);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
  });
});
