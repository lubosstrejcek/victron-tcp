#!/usr/bin/env npx tsx
/**
 * Modbus TCP simulator for testing the Victron MCP server.
 *
 * Loads register definitions from data/*.json and serves realistic
 * dummy values on port 502 (or PORT env). Supports all unit IDs
 * defined in the register files.
 *
 * Usage:
 *   npx tsx scripts/modbus-simulator.ts
 *   PORT=5020 npx tsx scripts/modbus-simulator.ts
 */

import { createRequire } from 'node:module';
import net from 'node:net';

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

// ── Load register definitions ───────────────────────────────────────

const ccgx: JsonFile = require('../data/ccgx-registers.json');
const evcs: JsonFile = require('../data/evcs-registers.json');

const allCategories = [...ccgx.categories, ...evcs.categories];

// ── Build holding register buffer per unit ID ───────────────────────

// Map<unitId, Map<address, uint16[]>>
type UnitRegisters = Map<number, Map<number, number[]>>;

function getWordCount(reg: JsonRegister): number {
  if (reg.words) return reg.words;
  switch (reg.dataType) {
    case 'uint16':
    case 'int16':
      return 1;
    case 'uint32':
    case 'int32':
      return 2;
    case 'uint64':
      return 4;
    case 'string':
      return 6;
    default:
      return 1;
  }
}

function encodeValue(reg: JsonRegister): number[] {
  const words = getWordCount(reg);
  const sf = reg.scaleFactor || 1;

  // String registers — return a dummy serial / identifier
  if (reg.dataType === 'string') {
    const str = 'SIM001'.padEnd(words * 2, '\0');
    const result: number[] = [];
    for (let i = 0; i < words; i++) {
      result.push((str.charCodeAt(i * 2) << 8) | str.charCodeAt(i * 2 + 1));
    }
    return result;
  }

  // Enum registers — pick first enum value (key 0, or lowest key)
  if (reg.enumValues) {
    const keys = Object.keys(reg.enumValues).map(Number).sort((a, b) => a - b);
    const enumVal = keys.length > 0 ? keys[0] : 0;
    if (words === 1) return [enumVal & 0xFFFF];
    if (words === 2) return [(enumVal >> 16) & 0xFFFF, enumVal & 0xFFFF];
    return Array(words).fill(0);
  }

  // Numeric registers — generate realistic dummy values
  const raw = generateDummyRaw(reg, sf);
  return encodeRaw(raw, reg.dataType, words);
}

function generateDummyRaw(reg: JsonRegister, sf: number): number {
  const desc = reg.description.toLowerCase();
  const unit = reg.unit.toLowerCase();
  const path = reg.dbusPath.toLowerCase();

  // Voltage
  if (unit === 'v' || path.includes('voltage')) {
    if (desc.includes('cell')) return 3.3 * sf;
    if (desc.includes('battery') || path.includes('/dc/')) return 52.4 * sf;
    if (desc.includes('ac') || path.includes('/ac/')) return 230 * sf;
    return 48 * sf;
  }

  // Current
  if (unit === 'a' || unit === 'a dc' || path.includes('current')) {
    return 12.5 * sf;
  }

  // Power
  if (unit === 'w' || path.includes('power') || path.includes('/p')) {
    if (desc.includes('pv') || desc.includes('solar')) return 3500 * sf;
    if (desc.includes('consumption')) return 1200 * sf;
    return 2500 * sf;
  }

  // Energy (kWh)
  if (unit === 'kwh' || path.includes('energy')) {
    return 1234 * sf;
  }

  // SOC
  if (path.includes('soc') || desc.includes('state of charge')) {
    return 85 * sf;
  }

  // Temperature
  if (unit === 'degrees celsius' || unit === 'deg c' || unit === 'c' || path.includes('temperature') || path.includes('temp')) {
    return 25 * sf;
  }

  // Frequency
  if (unit === 'hz' || path.includes('frequency')) {
    return 50 * sf;
  }

  // Percentage
  if (unit === '%') {
    return 75 * sf;
  }

  // Time / seconds
  if (unit === 's' || unit === 'seconds') {
    return 3600 * sf;
  }

  // Default: small positive value
  return 1 * sf;
}

function encodeRaw(value: number, dataType: string, words: number): number[] {
  const intVal = Math.round(value);

  switch (dataType) {
    case 'uint16':
      return [intVal & 0xFFFF];
    case 'int16': {
      const v = intVal < 0 ? intVal + 0x10000 : intVal;
      return [v & 0xFFFF];
    }
    case 'uint32':
      return [(intVal >> 16) & 0xFFFF, intVal & 0xFFFF];
    case 'int32': {
      const v = intVal < 0 ? intVal + 0x100000000 : intVal;
      return [(v >> 16) & 0xFFFF, v & 0xFFFF];
    }
    case 'uint64':
      return [0, 0, (intVal >> 16) & 0xFFFF, intVal & 0xFFFF];
    default:
      return Array(words).fill(intVal & 0xFFFF);
  }
}

function buildUnitRegisters(): UnitRegisters {
  const unitRegisters: UnitRegisters = new Map();

  for (const cat of allCategories) {
    if (!unitRegisters.has(cat.defaultUnitId)) {
      unitRegisters.set(cat.defaultUnitId, new Map());
    }
    const regs = unitRegisters.get(cat.defaultUnitId)!;

    for (const reg of cat.registers) {
      const encoded = encodeValue(reg);
      for (let i = 0; i < encoded.length; i++) {
        regs.set(reg.address + i, [encoded[i]]);
      }
    }
  }

  return unitRegisters;
}

// ── Modbus TCP server (raw TCP, function code 0x03) ─────────────────

function handleReadHoldingRegisters(
  unitRegisters: UnitRegisters,
  unitId: number,
  startAddr: number,
  quantity: number,
): Buffer | null {
  const regs = unitRegisters.get(unitId);
  if (!regs) return null;

  const data = Buffer.alloc(quantity * 2);
  for (let i = 0; i < quantity; i++) {
    const wordEntry = regs.get(startAddr + i);
    const value = wordEntry ? wordEntry[0] : 0;
    data.writeUInt16BE(value, i * 2);
  }
  return data;
}

function buildModbusResponse(
  transactionId: number,
  unitId: number,
  functionCode: number,
  data: Buffer,
): Buffer {
  const mbap = Buffer.alloc(7);
  mbap.writeUInt16BE(transactionId, 0);
  mbap.writeUInt16BE(0, 2);
  mbap.writeUInt16BE(data.length + 2, 4);
  mbap.writeUInt8(unitId, 6);

  const pdu = Buffer.alloc(1 + data.length);
  pdu.writeUInt8(functionCode, 0);
  Buffer.from(data).copy(pdu, 1);

  return Buffer.concat([mbap, pdu]);
}

function buildModbusException(
  transactionId: number,
  unitId: number,
  functionCode: number,
  exceptionCode: number,
): Buffer {
  const mbap = Buffer.alloc(7);
  mbap.writeUInt16BE(transactionId, 0);
  mbap.writeUInt16BE(0, 2);
  mbap.writeUInt16BE(3, 4);
  mbap.writeUInt8(unitId, 6);

  const pdu = Buffer.alloc(2);
  pdu.writeUInt8(functionCode | 0x80, 0);
  pdu.writeUInt8(exceptionCode, 1);

  return Buffer.concat([mbap, pdu]);
}

export interface SimulatorServer {
  server: net.Server;
  stop: () => Promise<void>;
}

export function createSimulatorServer(port: number): Promise<SimulatorServer> {
  const unitRegisters = buildUnitRegisters();

  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 7) {
        const length = buffer.readUInt16BE(4);
        const totalLength = 6 + length;

        if (buffer.length < totalLength) break;

        const frame = buffer.subarray(0, totalLength);
        buffer = buffer.subarray(totalLength);

        const transactionId = frame.readUInt16BE(0);
        const unitId = frame.readUInt8(6);
        const functionCode = frame.readUInt8(7);

        if (functionCode === 0x03) {
          const startAddr = frame.readUInt16BE(8);
          const quantity = frame.readUInt16BE(10);

          if (!unitRegisters.has(unitId)) {
            socket.write(buildModbusException(transactionId, unitId, functionCode, 0x0B));
            continue;
          }

          const data = handleReadHoldingRegisters(unitRegisters, unitId, startAddr, quantity);
          if (!data) {
            socket.write(buildModbusException(transactionId, unitId, functionCode, 0x02));
            continue;
          }

          const response = Buffer.alloc(1 + data.length);
          response.writeUInt8(quantity * 2, 0);
          data.copy(response, 1);

          socket.write(buildModbusResponse(transactionId, unitId, functionCode, response));
        } else if (functionCode === 0x06 || functionCode === 0x10) {
          const pdu = frame.subarray(7, totalLength);
          socket.write(buildModbusResponse(transactionId, unitId, functionCode, pdu.subarray(1)));
        } else {
          socket.write(buildModbusException(transactionId, unitId, functionCode, 0x01));
        }
      }
    });

    socket.on('error', () => {});
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '0.0.0.0', () => {
      resolve({
        server,
        stop: () => new Promise<void>((res, rej) => {
          server.close((err) => {
            if (err) {
              rej(err);
              return;
            }
            res();
          });
        }),
      });
    });
  });
}

// ── CLI entry point ─────────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith('modbus-simulator.ts') ||
  process.argv[1]?.endsWith('modbus-simulator.js');

if (isMain) {
  const PORT = parseInt(process.env.PORT ?? '5020', 10);

  createSimulatorServer(PORT).then(({ server }) => {
    const unitRegisters = buildUnitRegisters();
    const unitIds = [...unitRegisters.keys()].sort((a, b) => a - b);
    let totalRegs = 0;
    for (const cat of allCategories) {
      totalRegs += cat.registers.length;
    }

    console.log(`Victron Modbus TCP Simulator`);
    console.log(`Listening on port ${PORT}`);
    console.log(`Serving ${allCategories.length} categories, ${totalRegs} registers`);
    console.log(`Unit IDs: ${unitIds.join(', ')}`);
    console.log(`\nCategories:`);
    for (const cat of allCategories) {
      console.log(`  Unit ${cat.defaultUnitId}: ${cat.service} (${cat.registers.length} regs)`);
    }
    console.log(`\nReady for connections.`);
  }).catch((err) => {
    console.error('Failed to start simulator:', err);
    process.exit(1);
  });
}
