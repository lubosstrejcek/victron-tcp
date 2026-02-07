import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSystemTools } from './system.js';
import { registerBatteryTools } from './battery.js';
import { registerSolarTools } from './solar.js';
import { registerGridTools } from './grid.js';
import { registerVebusTools } from './vebus.js';
import { registerTankTools } from './tanks.js';
import { registerTemperatureTools } from './temperature.js';
import { registerInverterTools } from './inverter.js';
import { registerEvcsTools } from './evcs.js';
import { registerDiscoverTools } from './discover.js';
import { registerRawTools } from './raw.js';

export function registerAllTools(server: McpServer): void {
  registerSystemTools(server);
  registerBatteryTools(server);
  registerSolarTools(server);
  registerGridTools(server);
  registerVebusTools(server);
  registerTankTools(server);
  registerTemperatureTools(server);
  registerInverterTools(server);
  registerEvcsTools(server);
  registerDiscoverTools(server);
  registerRawTools(server);
}
