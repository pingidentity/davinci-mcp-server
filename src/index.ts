#!/usr/bin/env node

/**
 * Copyright 2026 Ping Identity Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getCliConfig } from './configs/settings.js';
import { DavinciMcpServer } from './modules/server.js';

const config = getCliConfig();

/**
 * Initialize the MCP server for DaVinci.
 * Using the modern McpServer class which provides a high-level API.
 */
export const server = new DavinciMcpServer(config);
const logger = server.getLogger();

/**
 * Performs cleanup tasks before the process exits.
 * Closes the MCP server and releases resources.
 */
async function cleanup() {
  logger.info('Shutting down DaVinci MCP server...');
  try {
    await server.close();
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
  process.exit();
}

process.stdin.on('close', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  void cleanup();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.warn('Unhandled promise rejection at:', promise, 'reason:', reason);
  void cleanup();
});

server.connect().catch((error) => {
  logger.error('Fatal error during startup:', error);
  void cleanup();
});
