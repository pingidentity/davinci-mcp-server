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
import { MCP_TOOLS } from '../utils/constants.js';
import { createToolFilter } from '../configs/settings.js';
import { AuthManager } from '../modules/auth/manager.js';
import { Logger } from '../utils/logger.js';
import { requiredId } from '../utils/schemas.js';
import { FlowPoliciesClient } from '../modules/auth/clients/flowPolicies.js';

/**
 * Registers flowPolicy-related MCP tools.
 *
 * @param server - The {@link McpServer} instance.
 * @param config - Server configuration for filtering.
 * @param authManager - Authentication manager for API calls.
 * @param logger - Logger instance for status updates.
 */
export function registerFlowPoliciesTools(
  server: McpServer,
  config: McpServerConfig,
  authManager: AuthManager,
  logger: Logger,
) {
  const isToolIncluded = createToolFilter(config);
  const client = new FlowPoliciesClient(authManager);

  if (isToolIncluded(MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME)) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME}`);
    server.registerTool(
      MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME,
      {
        description: MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.DESCRIPTION,
        inputSchema: z.object({
          applicationId: requiredId('applicationId'),
        }),
      },
      async ({ applicationId }) => {
        try {
          const flowPolicies = await client.listFlowPolicies(applicationId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(flowPolicies),
              },
            ],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to list application flow policies: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }

  if (isToolIncluded(MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME)) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME}`);
    server.registerTool(
      MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME,
      {
        description: MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.DESCRIPTION,
        inputSchema: z.object({
          applicationId: requiredId('applicationId'),
          flowPolicyId: requiredId('flowPolicyId'),
        }),
      },
      async ({ applicationId, flowPolicyId }) => {
        try {
          const flowPolicy = await client.describeFlowPolicy(applicationId, flowPolicyId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(flowPolicy),
              },
            ],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to describe application flow policy: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }
}
