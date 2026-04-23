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
import { FlowsClient } from '../modules/auth/clients/flows.js';
import { AuthManager } from '../modules/auth/manager.js';
import { Logger } from '../utils/logger.js';
import { z } from 'zod';

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
  const includeListFlows = isIncluded(MCP_TOOLS.LIST_FLOWS.NAME);
  const includeDescribeFlow = isIncluded(MCP_TOOLS.DESCRIBE_FLOW.NAME);

  if (!includeListFlows && !includeDescribeFlow) return;

  const flowsClient = new FlowsClient(authManager);

  if (includeListFlows) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.LIST_FLOWS.NAME}`);
    server.registerTool(
      MCP_TOOLS.LIST_FLOWS.NAME,
      {
        description: MCP_TOOLS.LIST_FLOWS.DESCRIPTION,
      },
      async () => {
        try {
          const flows = await flowsClient.listFlows();
          return {
            content: [{ type: 'text', text: JSON.stringify(flows) }],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.LIST_FLOWS.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to list flows: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }

  if (includeDescribeFlow) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_FLOW.NAME}`);
    server.registerTool(
      MCP_TOOLS.DESCRIBE_FLOW.NAME,
      {
        description: MCP_TOOLS.DESCRIBE_FLOW.DESCRIPTION,
        inputSchema: z.object({
          flowId: requiredId('flowId'),
        }),
      },
      async ({ flowId }) => {
        try {
          const flow = await flowsClient.getFlow(flowId);
          return {
            content: [{ type: 'text', text: JSON.stringify(flow) }],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.DESCRIBE_FLOW.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to describe flow: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }
}
