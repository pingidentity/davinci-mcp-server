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
import { VariablesClient } from '../modules/auth/clients/variables.js';
import { AuthManager } from '../modules/auth/manager.js';
import { Logger } from '../utils/logger.js';
import { requiredId } from '../utils/schemas.js';

/**
 * Registers variable-related MCP tools.
 *
 * @param server - The {@link McpServer} instance.
 * @param config - Server configuration for filtering.
 * @param authManager - Authentication manager for API calls.
 * @param logger - Logger instance for status updates.
 */
export function registerVariableTools(
  server: McpServer,
  config: McpServerConfig,
  authManager: AuthManager,
  logger: Logger,
) {
  const isToolIncluded = createToolFilter(config);
  const client = new VariablesClient(authManager);

  if (isToolIncluded(MCP_TOOLS.LIST_VARIABLES.NAME)) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.LIST_VARIABLES.NAME}`);
    server.registerTool(
      MCP_TOOLS.LIST_VARIABLES.NAME,
      {
        description: MCP_TOOLS.LIST_VARIABLES.DESCRIPTION,
      },
      async () => {
        try {
          const variables = await client.listVariables();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(variables),
              },
            ],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.LIST_VARIABLES.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to list variables: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }

  if (isToolIncluded(MCP_TOOLS.DESCRIBE_VARIABLE.NAME)) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_VARIABLE.NAME}`);
    server.registerTool(
      MCP_TOOLS.DESCRIBE_VARIABLE.NAME,
      {
        description: MCP_TOOLS.DESCRIBE_VARIABLE.DESCRIPTION,
        inputSchema: z.object({
          variableId: requiredId('variableId'),
        }),
      },
      async ({ variableId }) => {
        try {
          const variable = await client.describeVariable(variableId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(variable),
              },
            ],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.DESCRIBE_VARIABLE.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to describe variable: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }
}