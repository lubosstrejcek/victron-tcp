#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { log } from './logger.js';

async function main(): Promise<void> {
  process.on('uncaughtException', (error) => {
    log.error('uncaught_exception', { message: error instanceof Error ? error.message : String(error) });
  });
  process.on('unhandledRejection', (reason) => {
    log.error('unhandled_rejection', { message: reason instanceof Error ? reason.message : String(reason) });
  });

  const server = createServer();
  const transport = new StdioServerTransport();

  const shutdown = async (): Promise<void> => {
    log.info('shutdown_started');
    await server.close();
    log.info('shutdown_complete');
    process.exit(0);
  };

  process.on('SIGINT', () => { void shutdown(); });
  process.on('SIGTERM', () => { void shutdown(); });

  await server.connect(transport);
  log.info('ready', { transport: 'stdio' });
}

main().catch((error) => {
  log.error('fatal', { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
