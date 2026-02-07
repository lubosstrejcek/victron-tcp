import { describe, it, expect } from 'vitest';
import { getRegisterWordCount } from '../src/modbus/types.js';
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

describe('getRegisterWordCount', () => {
  it('returns 1 for uint16', () => {
    expect(getRegisterWordCount(makeReg({ dataType: 'uint16' }))).toBe(1);
  });

  it('returns 1 for int16', () => {
    expect(getRegisterWordCount(makeReg({ dataType: 'int16' }))).toBe(1);
  });

  it('returns 2 for uint32', () => {
    expect(getRegisterWordCount(makeReg({ dataType: 'uint32' }))).toBe(2);
  });

  it('returns 2 for int32', () => {
    expect(getRegisterWordCount(makeReg({ dataType: 'int32' }))).toBe(2);
  });

  it('returns 4 for uint64', () => {
    expect(getRegisterWordCount(makeReg({ dataType: 'uint64' }))).toBe(4);
  });

  it('returns 6 for string', () => {
    expect(getRegisterWordCount(makeReg({ dataType: 'string' }))).toBe(6);
  });

  it('uses explicit words field when provided', () => {
    expect(getRegisterWordCount(makeReg({ dataType: 'string', words: 12 }))).toBe(12);
    expect(getRegisterWordCount(makeReg({ dataType: 'uint16', words: 3 }))).toBe(3);
  });
});
