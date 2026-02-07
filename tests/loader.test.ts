import { describe, it, expect } from 'vitest';
import { allCategories } from '../src/registers/loader.js';
import type { DataType } from '../src/modbus/types.js';

const VALID_DATA_TYPES: DataType[] = ['uint16', 'int16', 'uint32', 'int32', 'uint64', 'string'];

describe('register loader', () => {
  it('loads all categories', () => {
    expect(allCategories.length).toBe(33);
  });

  it('loads total registers', () => {
    const totalRegs = allCategories.reduce((sum, cat) => sum + cat.registers.length, 0);
    expect(totalRegs).toBeGreaterThanOrEqual(900);
  });

  it('converts enum string keys to numeric keys', () => {
    for (const cat of allCategories) {
      for (const reg of cat.registers) {
        if (!reg.enumValues) continue;
        for (const key of Object.keys(reg.enumValues)) {
          expect(Number.isNaN(Number(key))).toBe(false);
        }
      }
    }
  });

  it('all dataTypes are valid', () => {
    for (const cat of allCategories) {
      for (const reg of cat.registers) {
        expect(VALID_DATA_TYPES).toContain(reg.dataType);
      }
    }
  });

  it('all registers have required fields', () => {
    for (const cat of allCategories) {
      expect(cat.service).toBeTruthy();
      expect(cat.description).toBeTruthy();
      expect(typeof cat.defaultUnitId).toBe('number');

      for (const reg of cat.registers) {
        expect(typeof reg.address).toBe('number');
        expect(reg.name).toBeTruthy();
        expect(reg.description).toBeTruthy();
        expect(typeof reg.scaleFactor).toBe('number');
        expect(typeof reg.writable).toBe('boolean');
        expect(typeof reg.dbusPath).toBe('string');
      }
    }
  });

  it('each category has a unique service name', () => {
    const services = allCategories.map(c => c.service);
    const unique = new Set(services);
    expect(unique.size).toBe(services.length);
  });
});
