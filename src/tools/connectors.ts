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
import { ConnectorsClient } from '../modules/auth/clients/connectors.js';
import { AuthManager } from '../modules/auth/manager.js';
import { Logger } from '../utils/logger.js';
import { z } from 'zod';

/**
 * Registers connector-related MCP tools.
 *
 * @param server - The {@link McpServer} instance.
 * @param config - Server configuration for filtering.
 * @param authManager - Authentication manager for API calls.
 * @param logger - Logger instance for status updates.
 */
export function registerConnectorTools(
    server: McpServer,
    config: McpServerConfig,
    authManager: AuthManager,
    logger: Logger,
) {
    const isIncluded = createToolFilter(config);
    const includeListConnectors = isIncluded(MCP_TOOLS.LIST_CONNECTORS.NAME);
    const includeDescribeConnector = isIncluded(MCP_TOOLS.DESCRIBE_CONNECTOR.NAME);

    if (!includeListConnectors && !includeDescribeConnector) return;

    const connectorsClient = new ConnectorsClient(authManager);

    if (includeListConnectors) {
        logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.LIST_CONNECTORS.NAME}`);
        server.registerTool(
            MCP_TOOLS.LIST_CONNECTORS.NAME,
            {
                description: MCP_TOOLS.LIST_CONNECTORS.DESCRIPTION,
            },
            async () => {
                try {
                    const connectors = await connectorsClient.listConnectors();
                    return {
                        content: [{ type: 'text', text: JSON.stringify(connectors) }],
                    };
                } catch (error) {
                    logger.error(`Error in tool ${MCP_TOOLS.LIST_CONNECTORS.NAME}:`, error);
                    if (error instanceof McpError) throw error;
                    throw new McpError(
                        ErrorCode.InternalError,
                        `Failed to list connectors: ${error instanceof Error ? error.message : String(error)}`,
                    );
                }
            },
        );
    }

    if (includeDescribeConnector) {
        logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_CONNECTOR.NAME}`);
        server.registerTool(
            MCP_TOOLS.DESCRIBE_CONNECTOR.NAME,
            {
                description: MCP_TOOLS.DESCRIBE_CONNECTOR.DESCRIPTION,
                inputSchema: z.object({
                    connectorId: requiredId('connectorId'),
                }),
            },
            async ({ connectorId }) => {
                try {
                    const connector = await connectorsClient.getConnector(connectorId);
                    const connectorDetails = await connectorsClient.getConnectorDetails(connectorId);
                    const result = { ...connector, ...connectorDetails };
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result) }],
                    };
                } catch (error) {
                    logger.error(`Error in tool ${MCP_TOOLS.DESCRIBE_CONNECTOR.NAME}:`, error);
                    if (error instanceof McpError) throw error;
                    throw new McpError(
                        ErrorCode.InternalError,
                        `Failed to describe connector: ${error instanceof Error ? error.message : String(error)}`,
                    );
                }
            },
        );
    }
}
