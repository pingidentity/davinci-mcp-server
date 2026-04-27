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
import { FlowVersionsClient } from '../modules/auth/clients/flowVersions.js';
import { AuthManager } from '../modules/auth/manager.js';
import { Logger } from '../utils/logger.js';
import { z } from 'zod';

/**
 * Registers flow version-related MCP tools.
 *
 * @param server - The {@link McpServer} instance.
 * @param config - Server configuration for filtering.
 * @param authManager - Authentication manager for API calls.
 * @param logger - Logger instance for status updates.
 */
export function registerFlowVersionTools(
  server: McpServer,
  config: McpServerConfig,
  authManager: AuthManager,
  logger: Logger,
) {
  const isIncluded = createToolFilter(config);
  const includeListVersions = isIncluded(MCP_TOOLS.LIST_FLOW_VERSIONS.NAME);
  const includeDescribeVersion = isIncluded(MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME);

  if (!includeListVersions && !includeDescribeVersion) return;

  const flowVersionsClient = new FlowVersionsClient(authManager);

  if (includeListVersions) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.LIST_FLOW_VERSIONS.NAME}`);
    server.registerTool(
      MCP_TOOLS.LIST_FLOW_VERSIONS.NAME,
      {
        description: MCP_TOOLS.LIST_FLOW_VERSIONS.DESCRIPTION,
        inputSchema: z.object({
          flowId: requiredId('flowId'),
        }),
      },
      async ({ flowId }) => {
        try {
          const flowVersions = await flowVersionsClient.listFlowVersions(flowId);
          return {
            content: [{ type: 'text', text: JSON.stringify(flowVersions) }],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.LIST_FLOW_VERSIONS.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to list flow versions: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }

  if (includeDescribeVersion) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME}`);
    server.registerTool(
      MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME,
      {
        description: MCP_TOOLS.DESCRIBE_FLOW_VERSION.DESCRIPTION,
        inputSchema: z.object({
          flowId: requiredId('flowId'),
          versionId: requiredId('versionId'),
        }),
      },
      async ({ flowId, versionId }) => {
        try {
          const flowVersion = await flowVersionsClient.getFlowVersion(flowId, versionId);
          const flowVersionDetails = await flowVersionsClient.getFlowVersionDetails(
            flowId,
            versionId,
          );
          const result = { ...flowVersion, ...flowVersionDetails };
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to describe flow version: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }
}
