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
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { McpServerConfig } from '../types/index.js';
import { MCP_TOOLS } from '../utils/constants.js';
import { createToolFilter } from '../configs/settings.js';
import { ApplicationsClient } from '../modules/auth/clients/application.js';
import { AuthManager } from '../modules/auth/manager.js';
import { Logger } from '../utils/logger.js';

/**
 * Registers flow-related MCP tools.
 *
 * @param server - The {@link McpServer} instance.
 * @param config - Server configuration for filtering.
 * @param authManager - Authentication manager for API calls.
 * @param logger - Logger instance for status updates.
 */
export function registerFlowTools(
  server: McpServer,
  config: McpServerConfig,
  authManager: AuthManager,
  logger: Logger,
) {
  const isIncluded = createToolFilter(config);

  if (isIncluded(MCP_TOOLS.LIST_FLOWS.NAME)) {
    const flowsClient = new ApplicationsClient(authManager);
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.LIST_APPLICATIONS.NAME}`);
    server.registerTool(
      MCP_TOOLS.LIST_APPLICATIONS.NAME,
      {
        description: MCP_TOOLS.LIST_APPLICATIONS.DESCRIPTION,
      },
      async () => {
        try {
          const flows = await flowsClient.listApplications();
          return {
            content: [{ type: 'text', text: JSON.stringify(flows, null, 2) }],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.LIST_APPLICATIONS.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to list applications: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }
}
