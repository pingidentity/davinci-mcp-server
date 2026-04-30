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
  const includeValidateFlow = isIncluded(MCP_TOOLS.VALIDATE_FLOW.NAME);
  const includeFlowExecutions = isIncluded(MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME);
  const includeFlowExecutionEvents = isIncluded(MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME);

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

  if (includeValidateFlow) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.VALIDATE_FLOW.NAME}`);
    server.registerTool(
      MCP_TOOLS.VALIDATE_FLOW.NAME,
      {
        description: MCP_TOOLS.VALIDATE_FLOW.DESCRIPTION,
        inputSchema: z.object({
          flowId: requiredId('flowId'),
        }),
      },
      async ({ flowId }) => {
        try {
          await flowsClient.validateFlow(flowId);
          const flow = await flowsClient.getFlow(flowId, { expand: 'dvlinterDetails' });
          return {
            content: [{ type: 'text', text: JSON.stringify(flow) }],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.VALIDATE_FLOW.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to validate flow: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }

  if (includeFlowExecutions) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME}`);
    server.registerTool(
      MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME,
      {
        description: MCP_TOOLS.LIST_FLOW_EXECUTIONS.DESCRIPTION,
        inputSchema: z.object({
          flowId: requiredId('flowId'),
          transactionId: z
            .string()
            .optional()
            .describe('Optional transaction ID to filter executions'),
          cursor: z.string().optional().describe('Optional cursor for pagination'),
        }),
      },
      async ({ flowId, transactionId, cursor }) => {
        try {
          // By default filter to last 30 days of executions
          const now = new Date();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const timestampFilter = `timestamp ge "${thirtyDaysAgo.toISOString()}" and timestamp le "${now.toISOString()}"`;

          // Build filter to always include 30-day window, optionally filter by transactionId, if provided
          const filters = [timestampFilter];
          if (transactionId) {
            filters.push(`transactionId eq "${transactionId}"`);
          }

          const params = {
            limit: 500,
            filter: filters.join(' and '),
            ...(cursor && { cursor }),
          };

          const executions = await flowsClient.getFlowExecutions(flowId, params);
          return {
            content: [{ type: 'text', text: JSON.stringify(executions) }],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to list flow executions: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }

  if (includeFlowExecutionEvents) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME}`);
    server.registerTool(
      MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME,
      {
        description: MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.DESCRIPTION,
        inputSchema: z.object({
          flowId: requiredId('flowId'),
          interactionId: requiredId('interactionId'),
          cursor: z.string().optional().describe('Optional cursor for pagination'),
        }),
      },
      async ({ flowId, interactionId, cursor }) => {
        try {
          // By default filter to last 30 days of execution events
          const now = new Date();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const timestampFilter = `timestamp ge "${thirtyDaysAgo.toISOString()}" and timestamp le "${now.toISOString()}"`;

          const params = {
            limit: 500,
            filter: timestampFilter,
            ...(cursor && { cursor }),
          };

          const events = await flowsClient.getFlowExecutionEvents(flowId, interactionId, params);
          return {
            content: [{ type: 'text', text: JSON.stringify(events) }],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to get flow execution events: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }
}
