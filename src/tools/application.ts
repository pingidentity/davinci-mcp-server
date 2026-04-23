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

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { McpServerConfig } from '../types/index.js';
import { MCP_TOOLS, TOOL_NAMES } from '../utils/constants.js';
import { createToolFilter } from '../configs/settings.js';
import { ApplicationsClient } from '../modules/auth/clients/application.js';
import { AuthManager } from '../modules/auth/manager.js';
import { Logger } from '../utils/logger.js';
import { requiredId } from '../utils/schemas.js';


/**
 * Registers application-related MCP tools.
 *
 * @param server - The {@link McpServer} instance.
 * @param config - Server configuration for filtering.
 * @param authManager - Authentication manager for API calls.
 * @param logger - Logger instance for status updates.
 */
export function registerApplicationTools(
  server: McpServer,
  config: McpServerConfig,
  authManager: AuthManager,
  logger: Logger,
) {
  const isToolIncluded = createToolFilter(config);
  const client = new ApplicationsClient(authManager);

  if (isToolIncluded(TOOL_NAMES.LIST_APPLICATIONS)) {
    logger.debug(`[Tools] Registering tool: ${TOOL_NAMES.LIST_APPLICATIONS}`);
    server.registerTool(
      TOOL_NAMES.LIST_APPLICATIONS,
      {
        description: MCP_TOOLS.LIST_APPLICATIONS.DESCRIPTION,
      },
      async () => {
        try {
          const applications = await client.listApplications();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(applications),
              },
            ],
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

  if (isToolIncluded(TOOL_NAMES.DESCRIBE_APPLICATION)) {
    logger.debug(`[Tools] Registering tool: ${TOOL_NAMES.DESCRIBE_APPLICATION}`);
    server.registerTool(
      TOOL_NAMES.DESCRIBE_APPLICATION,
      {
        description: MCP_TOOLS.DESCRIBE_APPLICATION.DESCRIPTION,
        inputSchema: z.object({
          applicationId: requiredId('applicationId'),
        }),
      },
      async ({ applicationId }) => {
        try {
          const application = await client.describeApplication(applicationId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(application),
              },
            ],
          };
        } catch (error) {
          logger.error(`Error in tool ${TOOL_NAMES.DESCRIBE_APPLICATION}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to describe application: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }
}
