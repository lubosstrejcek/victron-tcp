export type DataType = 'uint16' | 'int16' | 'uint32' | 'int32' | 'uint64' | 'string';

export interface RegisterDefinition {
  address: number;
  name: string;
  description: string;
  dataType: DataType;
  scaleFactor: number;
  unit: string;
  writable: boolean;
  dbusPath: string;
  words?: number;
  enumValues?: Record<number, string>;
}

export interface RegisterCategory {
  service: string;
  description: string;
  defaultUnitId: number;
  registers: RegisterDefinition[];
}

export interface RegisterReadResult {
  name: string;
  description: string;
  rawValue: number | number[];
  value: number | string;
  unit: string;
  enumLabel?: string;
}

export function getRegisterWordCount(reg: RegisterDefinition): number {
  if (reg.words) {
    return reg.words;
  }

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
  }
}

export const MODBUS_ERROR_CODES: Record<number, string> = {
  1: 'Illegal Function — the register exists but does not support this function code',
  2: 'Illegal Data Address — the register address does not exist for this unit ID. Check victron_list_registers for valid addresses',
  3: 'Illegal Data Value — the write value is out of range for this register',
  4: 'Server Device Failure — internal error on the GX device',
  5: 'Acknowledge — request accepted but processing not complete',
  6: 'Server Device Busy — the GX device is busy, retry later',
  10: 'Gateway Path Unavailable — the unit ID is defined in the GX but the underlying device was not found on the mapped port. The device may be disconnected',
  11: 'Gateway Target Device Failed to Respond — the unit ID does not match any device. Run victron_discover to find valid unit IDs',
};
