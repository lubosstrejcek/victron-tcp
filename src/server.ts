import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools/index.js';
import { registerAllPrompts } from './prompts.js';
import { registerAllResources } from './resources.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'victron-tcp',
    version,
  });

  registerAllTools(server);
  registerAllPrompts(server);
  registerAllResources(server);

  return server;
}
