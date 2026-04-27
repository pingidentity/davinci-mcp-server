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
import { FormsClient } from '../modules/auth/clients/forms.js';
import { AuthManager } from '../modules/auth/manager.js';
import { Logger } from '../utils/logger.js';
import { requiredId } from '../utils/schemas.js';

/**
 * Registers form-related MCP tools.
 *
 * @param server - The {@link McpServer} instance.
 * @param config - Server configuration for filtering.
 * @param authManager - Authentication manager for API calls.
 * @param logger - Logger instance for status updates.
 */
export function registerFormTools(
  server: McpServer,
  config: McpServerConfig,
  authManager: AuthManager,
  logger: Logger,
) {
  const isToolIncluded = createToolFilter(config);
  const client = new FormsClient(authManager);

  if (isToolIncluded(MCP_TOOLS.LIST_FORMS.NAME)) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.LIST_FORMS.NAME}`);
    server.registerTool(
      MCP_TOOLS.LIST_FORMS.NAME,
      {
        description: MCP_TOOLS.LIST_FORMS.DESCRIPTION,
      },
      async () => {
        try {
          const forms = await client.listForms();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(forms),
              },
            ],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.LIST_FORMS.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to list forms: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }

  if (isToolIncluded(MCP_TOOLS.DESCRIBE_FORM.NAME)) {
    logger.debug(`[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_FORM.NAME}`);
    server.registerTool(
      MCP_TOOLS.DESCRIBE_FORM.NAME,
      {
        description: MCP_TOOLS.DESCRIBE_FORM.DESCRIPTION,
        inputSchema: z.object({
          formId: requiredId('formId'),
        }),
      },
      async ({ formId }) => {
        try {
          const form = await client.describeForm(formId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(form),
              },
            ],
          };
        } catch (error) {
          logger.error(`Error in tool ${MCP_TOOLS.DESCRIBE_FORM.NAME}:`, error);
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to describe form: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }
}
