import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { errorResult, READ_ONLY_ANNOTATIONS, DISCOVERY_ANNOTATIONS } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface DocFile {
  name: string;
  description: string;
  path: string;
  content?: string;
}

const DOC_FILES: DocFile[] = [
  {
    name: 'register-list',
    description: 'CCGX Modbus TCP Register List (Rev 3.71) — 900+ registers, addresses, types, scale factors',
    path: '../../docs/register-list.md',
  },
  {
    name: 'vrm-api',
    description: 'VRM cloud API OpenAPI 3.1 spec — 47 endpoints for auth, installations, widgets, stats',
    path: '../../docs/vrm-api-openapi.yaml',
  },
];

function loadDoc(doc: DocFile): string {
  if (!doc.content) {
    doc.content = readFileSync(resolve(__dirname, doc.path), 'utf-8');
  }
  return doc.content;
}

function searchInDoc(doc: DocFile, query: string): string[] {
  const content = loadDoc(doc);
  const lines = content.split('\n');
  const queryLower = query.toLowerCase();
  const matches: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(queryLower)) {
      const start = Math.max(0, i - 1);
      const end = Math.min(lines.length, i + 2);
      const context = lines.slice(start, end).join('\n');
      matches.push(context);
    }
  }

  return matches;
}

export function registerDocsTools(server: McpServer): void {
  server.registerTool(
    'victron_search_docs',
    {
      title: 'Search Documentation',
      description: 'Search the local offline Victron documentation: register list (900+ registers with addresses, types, scale factors) and VRM API spec (47 endpoints). Use this BEFORE making online requests — the local docs cover most questions about registers, unit IDs, data types, API endpoints, and device categories.',
      inputSchema: {
        query: z.string().min(1).describe('Search term (e.g. "battery voltage", "SOC", "/auth/login", "temperature", "tank level")'),
        source: z.enum(['all', 'registers', 'vrm-api']).default('all').describe('Which docs to search: "all" (default), "registers" (Modbus register list), "vrm-api" (VRM cloud API)'),
        maxResults: z.number().int().min(1).max(50).default(10).describe('Maximum number of matching sections to return'),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ query, source, maxResults }) => {
      try {
        const results: Array<{ source: string; matches: string[] }> = [];

        const docsToSearch = source === 'all'
          ? DOC_FILES
          : DOC_FILES.filter(d => d.name === source || (source === 'registers' && d.name === 'register-list'));

        for (const doc of docsToSearch) {
          const matches = searchInDoc(doc, query);
          if (matches.length > 0) {
            results.push({ source: doc.name, matches: matches.slice(0, maxResults) });
          }
        }

        if (results.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No results found for "${query}" in local docs. Try victron_check_online for the latest Victron documentation.`,
            }],
          };
        }

        const lines: string[] = [`# Documentation Search: "${query}"\n`];

        for (const result of results) {
          lines.push(`## Source: ${result.source}\n`);
          const shown = result.matches.slice(0, maxResults);
          for (const match of shown) {
            lines.push(match);
            lines.push('---');
          }
          if (result.matches.length > maxResults) {
            lines.push(`_...and ${result.matches.length - maxResults} more matches_\n`);
          }
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'victron_check_online',
    {
      title: 'Check Online Docs',
      description: 'Fetch the latest Victron documentation from online sources. Use this only when victron_search_docs does not have the answer — for example, when checking for newer register list revisions, firmware changes, or VRM API updates. Requires internet access.',
      inputSchema: {
        source: z.enum(['modbus-faq', 'vrm-api-docs', 'venus-os-mqtt']).describe(
          'Which online source to fetch: "modbus-faq" (Victron Modbus TCP FAQ), "vrm-api-docs" (VRM API documentation page), "venus-os-mqtt" (Venus OS MQTT documentation)',
        ),
      },
      annotations: DISCOVERY_ANNOTATIONS,
    },
    async ({ source }) => {
      const urls: Record<string, { url: string; label: string }> = {
        'modbus-faq': {
          url: 'https://www.victronenergy.com/live/ccgx:modbustcp_faq',
          label: 'Victron Modbus TCP FAQ',
        },
        'vrm-api-docs': {
          url: 'https://vrm-api-docs.victronenergy.com/',
          label: 'VRM API Documentation',
        },
        'venus-os-mqtt': {
          url: 'https://github.com/victronenergy/dbus-mqtt',
          label: 'Venus OS MQTT Documentation',
        },
      };

      const target = urls[source];

      return {
        content: [{
          type: 'text',
          text: [
            `# ${target.label}`,
            '',
            `URL: ${target.url}`,
            '',
            'This tool provides the URL for the latest documentation.',
            'The local offline docs bundled with this MCP server may be sufficient for most queries.',
            'Check victron_search_docs first before visiting the online source.',
            '',
            '**Bundled doc versions:**',
            '- Register list: CCGX Modbus TCP Rev 3.71',
            '- VRM API: OpenAPI 3.1, 47 endpoints',
          ].join('\n'),
        }],
      };
    },
  );
}
