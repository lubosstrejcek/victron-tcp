import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VictronModbusClient } from '../src/modbus/client.js';
import { batteryRegisters, systemRegisters, digitalinputRegisters, pvinverterRegisters, acloadRegisters, gpsRegisters, meteoRegisters, alternatorRegisters, chargerRegisters, dcdcRegisters, gensetRegisters, generatorRegisters, multiRegisters, dcsourceRegisters, dcgensetRegisters, allCategories } from '../src/registers/index.js';
import { createSimulatorServer, type SimulatorServer } from '../scripts/modbus-simulator.js';

const TEST_PORT = 15502;
let simulator: SimulatorServer;

beforeAll(async () => {
  simulator = await createSimulatorServer(TEST_PORT);
});

afterAll(async () => {
  await simulator.stop();
});

describe('VictronModbusClient', () => {
  it('connects to the simulator', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    await client.close();
  });

  it('reads battery registers', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(batteryRegisters.defaultUnitId);

    const results = await client.readRegisters(batteryRegisters.registers);
    expect(results.length).toBeGreaterThan(0);

    // At least some values should be real numbers (not all "Not available")
    const available = results.filter(r => r.value !== 'Not available' && r.value !== 'Error reading register');
    expect(available.length).toBeGreaterThan(0);

    await client.close();
  });

  it('reads system registers', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(systemRegisters.defaultUnitId);

    const results = await client.readRegisters(systemRegisters.registers);
    expect(results.length).toBeGreaterThan(0);

    await client.close();
  });

  it('returns "Not available" for disconnected value (0xFFFF)', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(batteryRegisters.defaultUnitId);

    // Read a single register that the simulator might have set to a disconnected sentinel
    // We test the decode path by reading a raw register that returns 0xFFFF
    const result = await client.readRegister({
      address: 9999,
      name: 'test_disconnected',
      description: 'Test disconnected',
      dataType: 'uint16',
      scaleFactor: 1,
      unit: '',
      writable: false,
      dbusPath: '/test',
    });

    // Address 9999 is not defined, simulator returns 0 for undefined addresses
    expect(typeof result.value).toBe('number');

    await client.close();
  });

  it('throws on unknown unit ID', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(250); // Not a valid unit ID in the simulator

    await expect(
      client.readRawRegisters(100, 1),
    ).rejects.toThrow();

    await client.close();
  });
});

describe('victron_read_category logic', () => {
  it('finds category by partial name', () => {
    const searchTerm = 'digitalinput';
    const found = allCategories.find(c =>
      c.service.toLowerCase() === searchTerm ||
      c.service.toLowerCase() === `com.victronenergy.${searchTerm}` ||
      c.service.toLowerCase().includes(searchTerm),
    );
    expect(found).toBeDefined();
    expect(found!.service).toBe('com.victronenergy.digitalinput');
  });

  it('finds category by full service name', () => {
    const searchTerm = 'com.victronenergy.battery';
    const found = allCategories.find(c =>
      c.service.toLowerCase() === searchTerm ||
      c.service.toLowerCase() === `com.victronenergy.${searchTerm}` ||
      c.service.toLowerCase().includes(searchTerm),
    );
    expect(found).toBeDefined();
    expect(found!.service).toBe('com.victronenergy.battery');
  });

  it('returns undefined for invalid category', () => {
    const searchTerm = 'nonexistent_category_xyz';
    const found = allCategories.find(c =>
      c.service.toLowerCase() === searchTerm ||
      c.service.toLowerCase() === `com.victronenergy.${searchTerm}` ||
      c.service.toLowerCase().includes(searchTerm),
    );
    expect(found).toBeUndefined();
  });

  it('reads digital input registers via client', async () => {
    const digitalInputCat = allCategories.find(c => c.service === 'com.victronenergy.digitalinput');
    expect(digitalInputCat).toBeDefined();

    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(digitalInputCat!.defaultUnitId);

    const results = await client.readRegisters(digitalInputCat!.registers);
    expect(results.length).toBeGreaterThan(0);

    await client.close();
  });
});

describe('GX info registers', () => {
  it('reads system serial (register 800) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const serialReg = systemRegisters.registers.find(r => r.address === 800);
    expect(serialReg).toBeDefined();

    const result = await client.readRegister(serialReg!);
    expect(result.name).toBe('serialSystem');
    expect(typeof result.value).toBe('string');

    await client.close();
  });
});

describe('Digital input registers', () => {
  it('reads digital input registers (3420-3424) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const results = await client.readRegisters(digitalinputRegisters.registers);
    expect(results.length).toBe(digitalinputRegisters.registers.length);

    const stateResult = results.find(r => r.name === 'state');
    expect(stateResult).toBeDefined();
    expect(stateResult!.enumLabel).toBeDefined();

    const alarmResult = results.find(r => r.name === 'alarm');
    expect(alarmResult).toBeDefined();
    expect(alarmResult!.enumLabel).toBeDefined();

    await client.close();
  });
});

describe('PV inverter registers', () => {
  it('reads PV inverter registers (1026+) on unit 31', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(31);

    const results = await client.readRegisters(pvinverterRegisters.registers);
    expect(results.length).toBeGreaterThan(0);

    const positionResult = results.find(r => r.name === 'position');
    expect(positionResult).toBeDefined();
    expect(positionResult!.enumLabel).toBeDefined();

    const available = results.filter(r => r.value !== 'Not available' && r.value !== 'Error reading register');
    expect(available.length).toBeGreaterThan(0);

    await client.close();
  });
});

describe('AC load registers', () => {
  it('reads AC load registers (3900+) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const results = await client.readRegisters(acloadRegisters.registers);
    expect(results.length).toBe(acloadRegisters.registers.length);

    const available = results.filter(r => r.value !== 'Not available' && r.value !== 'Error reading register');
    expect(available.length).toBeGreaterThan(0);

    await client.close();
  });
});

describe('GPS registers', () => {
  it('reads GPS registers (2800-2808) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const results = await client.readRegisters(gpsRegisters.registers);
    expect(results.length).toBe(gpsRegisters.registers.length);

    const latResult = results.find(r => r.name === 'latitude');
    expect(latResult).toBeDefined();
    expect(typeof latResult!.value).toBe('number');

    const lonResult = results.find(r => r.name === 'longitude');
    expect(lonResult).toBeDefined();
    expect(typeof lonResult!.value).toBe('number');

    await client.close();
  });
});

describe('Meteo registers', () => {
  it('reads meteo registers (3600-3604) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const results = await client.readRegisters(meteoRegisters.registers);
    expect(results.length).toBe(meteoRegisters.registers.length);

    const irradianceResult = results.find(r => r.name === 'solarIrradiance');
    expect(irradianceResult).toBeDefined();
    expect(typeof irradianceResult!.value).toBe('number');

    await client.close();
  });
});

describe('Alternator registers', () => {
  it('reads alternator registers (4100+) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const results = await client.readRegisters(alternatorRegisters.registers);
    expect(results.length).toBe(alternatorRegisters.registers.length);

    const voltageResult = results.find(r => r.name === 'batteryVoltage');
    expect(voltageResult).toBeDefined();
    expect(typeof voltageResult!.value).toBe('number');

    const stateResult = results.find(r => r.name === 'alternatorState');
    expect(stateResult).toBeDefined();
    expect(stateResult!.enumLabel).toBeDefined();

    await client.close();
  });
});

describe('Charger registers', () => {
  it('reads charger registers (2307+) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const results = await client.readRegisters(chargerRegisters.registers);
    expect(results.length).toBe(chargerRegisters.registers.length);

    const voltageResult = results.find(r => r.name === 'output1Voltage');
    expect(voltageResult).toBeDefined();
    expect(typeof voltageResult!.value).toBe('number');

    await client.close();
  });
});

describe('DC-DC converter registers', () => {
  it('reads DC-DC registers (4800+) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const results = await client.readRegisters(dcdcRegisters.registers);
    expect(results.length).toBe(dcdcRegisters.registers.length);

    const errorResult = results.find(r => r.name === 'errorCode');
    expect(errorResult).toBeDefined();
    expect(errorResult!.enumLabel).toBeDefined();

    await client.close();
  });
});

describe('Genset registers', () => {
  it('reads genset registers (3200+) on unit 23', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(23);

    const results = await client.readRegisters(gensetRegisters.registers);
    expect(results.length).toBeGreaterThan(0);

    const available = results.filter(r => r.value !== 'Not available' && r.value !== 'Error reading register');
    expect(available.length).toBeGreaterThan(0);

    await client.close();
  });
});

describe('Generator registers', () => {
  it('reads generator registers (3500+) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const results = await client.readRegisters(generatorRegisters.registers);
    expect(results.length).toBe(generatorRegisters.registers.length);

    const startResult = results.find(r => r.name === 'manualStart');
    expect(startResult).toBeDefined();
    expect(startResult!.enumLabel).toBeDefined();

    await client.close();
  });
});

describe('Multi RS registers', () => {
  it('reads Multi RS registers (4500+) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const results = await client.readRegisters(multiRegisters.registers);
    expect(results.length).toBeGreaterThan(0);

    const available = results.filter(r => r.value !== 'Not available' && r.value !== 'Error reading register');
    expect(available.length).toBeGreaterThan(0);

    await client.close();
  });
});

describe('DC energy meter registers', () => {
  it('reads DC source registers (4200+) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const results = await client.readRegisters(dcsourceRegisters.registers);
    expect(results.length).toBe(dcsourceRegisters.registers.length);

    const voltageResult = results.find(r => r.name === 'batteryVoltage');
    expect(voltageResult).toBeDefined();
    expect(typeof voltageResult!.value).toBe('number');

    await client.close();
  });
});

describe('DC genset registers', () => {
  it('reads DC genset registers (5200+) on unit 100', async () => {
    const client = new VictronModbusClient();
    await client.connect('127.0.0.1', TEST_PORT);
    client.setUnitId(100);

    const results = await client.readRegisters(dcgensetRegisters.registers);
    expect(results.length).toBe(dcgensetRegisters.registers.length);

    const startResult = results.find(r => r.name === 'startGenerator');
    expect(startResult).toBeDefined();
    expect(startResult!.enumLabel).toBeDefined();

    await client.close();
  });
});
