import { createRequire } from 'node:module';
import type { RegisterCategory, RegisterDefinition, DataType } from '../modbus/types.js';

const require = createRequire(import.meta.url);

interface JsonRegister {
  address: number;
  name: string;
  description: string;
  dataType: string;
  scaleFactor: number;
  unit: string;
  writable: boolean;
  dbusPath: string;
  words?: number;
  enumValues?: Record<string, string>;
}

interface JsonCategory {
  service: string;
  description: string;
  defaultUnitId: number;
  registers: JsonRegister[];
}

interface JsonFile {
  source: string;
  version: string;
  categories: JsonCategory[];
}

function convertEnumValues(raw: Record<string, string>): Record<number, string> {
  const result: Record<number, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    result[Number(key)] = value;
  }
  return result;
}

function convertRegister(raw: JsonRegister): RegisterDefinition {
  const reg: RegisterDefinition = {
    address: raw.address,
    name: raw.name,
    description: raw.description,
    dataType: raw.dataType as DataType,
    scaleFactor: raw.scaleFactor,
    unit: raw.unit,
    writable: raw.writable,
    dbusPath: raw.dbusPath,
  };

  if (raw.words) {
    reg.words = raw.words;
  }

  if (raw.enumValues) {
    reg.enumValues = convertEnumValues(raw.enumValues);
  }

  return reg;
}

function convertCategory(raw: JsonCategory): RegisterCategory {
  return {
    service: raw.service,
    description: raw.description,
    defaultUnitId: raw.defaultUnitId,
    registers: raw.registers.map(convertRegister),
  };
}

function loadJsonFile(path: string): RegisterCategory[] {
  const data: JsonFile = require(path);
  return data.categories.map(convertCategory);
}

const ccgxCategories = loadJsonFile('../../data/ccgx-registers.json');
const evcsCategories = loadJsonFile('../../data/evcs-registers.json');

export const allCategories: RegisterCategory[] = [...ccgxCategories, ...evcsCategories];
