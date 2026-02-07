/**
 * Convert Victron Modbus TCP register list Excel files to JSON.
 *
 * Usage:
 *   npx tsx scripts/convert-excel.ts <ccgx-excel-path> [evcs-excel-path]
 *
 * The CCGX Excel "Field list" sheet is parsed to produce data/ccgx-registers.json.
 * If an EVCS Excel path is provided, it produces data/evcs-registers.json.
 * Enum overrides from data/enum-overrides.json are merged on top of auto-parsed enums.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

// Default unit IDs by dbus service name
const DEFAULT_UNIT_IDS: Record<string, number> = {
  'com.victronenergy.system': 100,
  'com.victronenergy.battery': 247,
  'com.victronenergy.solarcharger': 226,
  'com.victronenergy.vebus': 227,
  'com.victronenergy.grid': 30,
  'com.victronenergy.tank': 20,
  'com.victronenergy.temperature': 24,
  'com.victronenergy.inverter': 232,
  'com.victronenergy.pvinverter': 31,
  'com.victronenergy.genset': 23,
  'com.victronenergy.settings': 100,
  'com.victronenergy.motordrive': 100,
  'com.victronenergy.charger': 100,
  'com.victronenergy.hub4': 100,
  'com.victronenergy.gps': 100,
  'com.victronenergy.pulsemeter': 100,
  'com.victronenergy.digitalinput': 100,
  'com.victronenergy.generator': 100,
  'com.victronenergy.meteo': 100,
  'com.victronenergy.evcharger': 100,
  'com.victronenergy.acload': 100,
  'com.victronenergy.fuelcell': 100,
  'com.victronenergy.alternator': 100,
  'com.victronenergy.dcsource': 100,
  'com.victronenergy.dcload': 100,
  'com.victronenergy.dcsystem': 100,
  'com.victronenergy.multi': 100,
  'com.victronenergy.pump': 100,
  'com.victronenergy.dcdc': 100,
  'com.victronenergy.acsystem': 100,
  'com.victronenergy.dcgenset': 100,
  'com.victronenergy.heatpump': 100,
};

const DATA_TYPE_MAP: Record<string, string> = {
  'uint16': 'uint16',
  'int16': 'int16',
  'uint32': 'uint32',
  'int32': 'int32',
  'uint64': 'uint64',
  'string[6]': 'string',
  'string[7]': 'string',
  'string[8]': 'string',
  'string[4]': 'string',
  'string[16]': 'string',
};

function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      if (i === 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

function parseStringWords(typeStr: string): number | undefined {
  const match = typeStr.match(/string\[(\d+)\]/);
  if (match) return parseInt(match[1], 10);
  return undefined;
}

function parseEnumFromRange(range: string): Record<string, string> | undefined {
  if (!range || typeof range !== 'string') return undefined;

  // Patterns like "0=Off;1=On" or "0=Off; 1=On"
  const entries = range.split(/[;\n]/).map(s => s.trim()).filter(Boolean);
  const result: Record<string, string> = {};
  let found = false;

  for (const entry of entries) {
    const match = entry.match(/^(\d+)\s*=\s*(.+)$/);
    if (match) {
      result[match[1]] = match[2].trim();
      found = true;
    }
  }

  return found ? result : undefined;
}

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

function loadEnumOverrides(): Record<string, Record<string, string>> {
  const path = join(dataDir, 'enum-overrides.json');
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8'));
}

function processExcel(excelPath: string, sheetName: string): JsonCategory[] {
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    const available = workbook.SheetNames.join(', ');
    throw new Error(`Sheet "${sheetName}" not found. Available: ${available}`);
  }

  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
  const categories = new Map<string, JsonCategory>();
  const enumOverrides = loadEnumOverrides();

  for (const row of rows) {
    const service = String(row['dbus-service-name'] ?? row['Service'] ?? '').trim();
    if (!service) continue;

    const addressStr = String(row['Address'] ?? row['address'] ?? '');
    const address = parseInt(addressStr, 10);
    if (isNaN(address)) continue;

    const description = String(row['Description'] ?? row['description'] ?? '').trim();
    const typeStr = String(row['Type'] ?? row['type'] ?? 'uint16').trim().toLowerCase();
    const scaleStr = String(row['Scalefactor'] ?? row['Scale factor'] ?? row['scalefactor'] ?? '1');
    const unitStr = String(row['Unit'] ?? row['unit'] ?? '').trim();
    const writableStr = String(row['Writable'] ?? row['writable'] ?? 'no').toLowerCase();
    const dbusPath = String(row['dbus-obj-path'] ?? row['DBus path'] ?? row['dbusPath'] ?? '').trim();
    const rangeStr = String(row['Range'] ?? row['range'] ?? '');

    const dataType = DATA_TYPE_MAP[typeStr] ?? typeStr;
    const scaleFactor = parseFloat(scaleStr) || 1;
    const writable = writableStr === 'yes' || writableStr === 'true' || writableStr === '1';
    const words = parseStringWords(typeStr);
    const name = toCamelCase(description) || `register${address}`;

    if (!categories.has(service)) {
      categories.set(service, {
        service,
        description: service.split('.').pop() ?? service,
        defaultUnitId: DEFAULT_UNIT_IDS[service] ?? 100,
        registers: [],
      });
    }

    const reg: JsonRegister = {
      address,
      name,
      description,
      dataType,
      scaleFactor,
      unit: unitStr,
      writable,
      dbusPath,
    };

    if (words) {
      reg.words = words;
    }

    // Auto-parse enums from Range column
    const autoEnums = parseEnumFromRange(rangeStr);

    // Check for overrides
    const overrideKey = `${service}:${address}`;
    const overrideEnums = enumOverrides[overrideKey];

    if (overrideEnums) {
      reg.enumValues = overrideEnums;
    } else if (autoEnums) {
      reg.enumValues = autoEnums;
    }

    categories.get(service)!.registers.push(reg);
  }

  return Array.from(categories.values());
}

function extractVersion(filename: string): string {
  const match = filename.match(/(\d+\.\d+)/);
  return match ? match[1] : '1.0';
}

// --- Main ---
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npx tsx scripts/convert-excel.ts <ccgx-excel> [evcs-excel]');
  console.error('');
  console.error('Example:');
  console.error('  npx tsx scripts/convert-excel.ts CCGX-Modbus-TCP-register-list-3.60.xlsx');
  process.exit(1);
}

const ccgxPath = args[0];
const evcsPath = args[1];

// Process CCGX Excel
console.log(`Processing CCGX: ${ccgxPath}`);
const ccgxCategories = processExcel(ccgxPath, 'Field list');

const ccgxJson: JsonFile = {
  source: basename(ccgxPath),
  version: extractVersion(basename(ccgxPath)),
  categories: ccgxCategories,
};

writeFileSync(
  join(dataDir, 'ccgx-registers.json'),
  JSON.stringify(ccgxJson, null, 2) + '\n',
);

let totalRegs = 0;
for (const cat of ccgxCategories) {
  totalRegs += cat.registers.length;
}
console.log(`  → ${ccgxCategories.length} categories, ${totalRegs} registers`);

// Process EVCS Excel (if provided)
if (evcsPath) {
  console.log(`Processing EVCS: ${evcsPath}`);
  const evcsCategories = processExcel(evcsPath, 'Field list');

  const evcsJson: JsonFile = {
    source: basename(evcsPath),
    version: extractVersion(basename(evcsPath)),
    categories: evcsCategories,
  };

  writeFileSync(
    join(dataDir, 'evcs-registers.json'),
    JSON.stringify(evcsJson, null, 2) + '\n',
  );

  let evcsRegs = 0;
  for (const cat of evcsCategories) {
    evcsRegs += cat.registers.length;
  }
  console.log(`  → ${evcsCategories.length} categories, ${evcsRegs} registers`);
}

console.log('Done.');
