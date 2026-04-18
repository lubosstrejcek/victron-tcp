import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let registerListCache: string | undefined;

function loadFile(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf-8');
}

function loadRegisterList(): string {
  if (!registerListCache) {
    registerListCache = loadFile('../docs/register-list.md');
  }
  return registerListCache;
}

export function registerAllResources(server: McpServer): void {
  server.registerResource(
    'register-list',
    'victron://register-list',
    {
      title: 'CCGX Modbus TCP Register List (Rev 3.71)',
      description: 'Complete Victron Energy Modbus TCP register reference — 900+ registers across 33 device categories with addresses, data types, scale factors, ranges, and dbus paths. Source: official CCGX register list.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [{
        uri: 'victron://register-list',
        mimeType: 'text/markdown',
        text: loadRegisterList(),
      }],
    }),
  );

  server.registerResource(
    'unit-id-mapping',
    'victron://unit-id-mapping',
    {
      title: 'Victron Modbus Unit ID Mapping',
      description: 'Mapping of Victron device types to their default Modbus unit IDs. Note: since Venus OS 2.60, unit IDs are assigned dynamically — use victron_discover to find actual unit IDs.',
      mimeType: 'text/markdown',
    },
    async () => {
      const full = loadRegisterList();
      const unitIdSection = full.substring(full.indexOf('# Unit ID Mapping'));
      return {
        contents: [{
          uri: 'victron://unit-id-mapping',
          mimeType: 'text/markdown',
          text: unitIdSection,
        }],
      };
    },
  );

}
