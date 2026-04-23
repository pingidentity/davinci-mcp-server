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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpServerConfig } from '../types/index.js';
import { registerFlowTools } from './flows.js';
import { registerApplicationTools } from './application.js';
import { AuthManager } from '../modules/auth/manager.js';
import { Logger } from '../utils/logger.js';

/**
 * Registers all available MCP tools with the server.
 *
 * Iterates through each tool registration function and invokes it with the
 * shared server instance and configuration. Tools that are excluded by the
 * config's include/exclude filters will skip their own registration internally.
 *
 * New tools should be added here by calling their `register*` function.
 *
 * @param server - The {@link McpServer} instance to register tools on.
 * @param config - Server configuration for tool filtering and logging.
 * @param authManager - Authentication manager for tools requiring API access.
 * @param logger - Logger instance for status messages.
 */
export function registerAllTools(
  server: McpServer,
  config: McpServerConfig,
  authManager: AuthManager,
  logger: Logger,
) {
  registerFlowTools(server, config, authManager, logger);
  registerApplicationTools(server, config, authManager, logger);

  logger.info('[Tools] Tool registration complete.');
}
