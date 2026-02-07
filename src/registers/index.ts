import { allCategories } from './loader.js';

export { allCategories };

function find(service: string) {
  return allCategories.find(c => c.service === service)!;
}

// EVCS (direct connection, not via GX)
export const evcsRegisters = find('victron.evcs');

// Primary GX categories
export const systemRegisters = find('com.victronenergy.system');
export const batteryRegisters = find('com.victronenergy.battery');
export const solarRegisters = find('com.victronenergy.solarcharger');
export const vebusRegisters = find('com.victronenergy.vebus');
export const gridRegisters = find('com.victronenergy.grid');
export const tankRegisters = find('com.victronenergy.tank');
export const temperatureRegisters = find('com.victronenergy.temperature');
export const inverterRegisters = find('com.victronenergy.inverter');
export const pvinverterRegisters = find('com.victronenergy.pvinverter');
export const gensetRegisters = find('com.victronenergy.genset');
export const settingsRegisters = find('com.victronenergy.settings');

// Secondary GX categories
export const motordriveRegisters = find('com.victronenergy.motordrive');
export const chargerRegisters = find('com.victronenergy.charger');
export const hub4Registers = find('com.victronenergy.hub4');
export const gpsRegisters = find('com.victronenergy.gps');
export const pulsemeterRegisters = find('com.victronenergy.pulsemeter');
export const digitalinputRegisters = find('com.victronenergy.digitalinput');
export const generatorRegisters = find('com.victronenergy.generator');
export const meteoRegisters = find('com.victronenergy.meteo');
export const evchargerRegisters = find('com.victronenergy.evcharger');
export const acloadRegisters = find('com.victronenergy.acload');
export const fuelcellRegisters = find('com.victronenergy.fuelcell');
export const alternatorRegisters = find('com.victronenergy.alternator');
export const dcsourceRegisters = find('com.victronenergy.dcsource');
export const dcloadRegisters = find('com.victronenergy.dcload');
export const dcsystemRegisters = find('com.victronenergy.dcsystem');
export const multiRegisters = find('com.victronenergy.multi');
export const pumpRegisters = find('com.victronenergy.pump');
export const dcdcRegisters = find('com.victronenergy.dcdc');
export const acsystemRegisters = find('com.victronenergy.acsystem');
export const dcgensetRegisters = find('com.victronenergy.dcgenset');
export const heatpumpRegisters = find('com.victronenergy.heatpump');
