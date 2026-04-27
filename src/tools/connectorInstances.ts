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
import { requiredId } from '../utils/schemas.js';
import { createToolFilter } from '../configs/settings.js';
import { ConnectorInstancesClient } from '../modules/auth/clients/connectorInstances.js';
import { AuthManager } from '../modules/auth/manager.js';
import { Logger } from '../utils/logger.js';
import { z } from 'zod';

/**
 * Registers connector-instance-related MCP tools.
 *
 * @param server - The {@link McpServer} instance.
 * @param config - Server configuration for filtering.
 * @param authManager - Authentication manager for API calls.
 * @param logger - Logger instance for status updates.
 */
export function registerConnectorInstanceTools(
  server: McpServer,
  config: McpServerConfig,
  authManager: AuthManager,
  logger: Logger,
) {
  const isIncluded = createToolFilter(config);
  const includeListConnectorInstances = isIncluded(MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME);
  const includeDescribeConnectorInstance = isIncluded(MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME);

  if (!includeListConnectorInstances && !includeDescribeConnectorInstance) return;

  const connectorInstancesClient = new ConnectorInstancesClient(authManager);

  if (includeListConnectorInstances) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME}`);
    server.registerTool(
      MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME,
      {
        description: MCP_TOOLS.LIST_CONNECTOR_INSTANCES.DESCRIPTION,
      },
      async () => {
        try {
          const instances = await connectorInstancesClient.listConnectorInstances();
          return {
            content: [{ type: 'text', text: JSON.stringify(instances) }],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to list connector instances: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }

  if (includeDescribeConnectorInstance) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME}`);
    server.registerTool(
      MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME,
      {
        description: MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.DESCRIPTION,
        inputSchema: z.object({
          instanceId: requiredId('instanceId'),
        }),
      },
      async ({ instanceId }) => {
        try {
          const instance = await connectorInstancesClient.getConnectorInstance(instanceId);
          return {
            content: [{ type: 'text', text: JSON.stringify(instance) }],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to describe connector instance: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }
}
