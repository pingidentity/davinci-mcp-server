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
import { MCP_TOOLS, QUERY_PARAM_DESCRIPTIONS, FLOW_EXPAND_VALUES } from '../utils/constants.js';
import { optionalString, pickDefined, requiredId, optionalInt } from '../utils/schemas.js';
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

  if (
    !includeListFlows &&
    !includeDescribeFlow &&
    !includeValidateFlow &&
    !includeFlowExecutions &&
    !includeFlowExecutionEvents
  ) {
    return;
  }

  const flowsClient = new FlowsClient(authManager);

  if (includeListFlows) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.LIST_FLOWS.NAME}`);
    server.registerTool(
      MCP_TOOLS.LIST_FLOWS.NAME,
      {
        description: MCP_TOOLS.LIST_FLOWS.DESCRIPTION,
        inputSchema: z.object({
          attributes: optionalString(QUERY_PARAM_DESCRIPTIONS.FLOWS_ATTRIBUTES),
        }),
      },
      async ({ attributes }) => {
        try {
          const flows = await flowsClient.listFlows(pickDefined({ attributes }));
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
          attributes: optionalString(QUERY_PARAM_DESCRIPTIONS.FLOWS_ATTRIBUTES),
          expand: optionalString(QUERY_PARAM_DESCRIPTIONS.FLOWS_EXPAND),
        }),
      },
      async ({ flowId, attributes, expand }) => {
        try {
          const flow = await flowsClient.getFlow(flowId, pickDefined({ attributes, expand }));
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
          const flow = await flowsClient.getFlow(flowId, {
            expand: FLOW_EXPAND_VALUES.DVLINTER_DETAILS,
          });
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
          cursor: optionalString(QUERY_PARAM_DESCRIPTIONS.FLOW_EXECUTIONS_CURSOR),
          filter: optionalString(QUERY_PARAM_DESCRIPTIONS.FLOW_EXECUTIONS_FILTER),
          limit: optionalInt({
            min: 1,
            max: 500,
            description: QUERY_PARAM_DESCRIPTIONS.FLOW_EXECUTIONS_LIMIT,
          }),
        }),
      },
      async ({ flowId, limit, cursor, filter }) => {
        try {
          const params = pickDefined({
            limit: limit ?? 500,
            filter,
            cursor,
          });

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
          cursor: optionalString(QUERY_PARAM_DESCRIPTIONS.FLOW_EXECUTION_EVENTS_CURSOR),
          filter: optionalString(QUERY_PARAM_DESCRIPTIONS.FLOW_EXECUTION_EVENTS_FILTER),
          limit: optionalInt({
            min: 1,
            max: 500,
            description: QUERY_PARAM_DESCRIPTIONS.FLOW_EXECUTION_EVENTS_LIMIT,
          }),
        }),
      },
      async ({ flowId, interactionId, limit, cursor, filter }) => {
        try {
          const params = pickDefined({
            limit: limit ?? 500,
            filter,
            cursor,
          });

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
