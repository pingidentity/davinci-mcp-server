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
import { z } from 'zod';
import { MCP_TOOLS, TOOL_NAMES } from '../utils/constants.js';
import { createToolFilter } from '../configs/settings.js';
import { McpServerConfig } from '../types/index.js';

const { NAME, DESCRIPTION } = MCP_TOOLS.HELLO_WORLD_TOOL;

/**
 * Registers the `hello_world` tool with the MCP server.
 *
 * This is a sample/template tool that echoes a user-provided message back
 * prefixed with `"Message: "`. It demonstrates the standard pattern for
 * registering a DaVinci MCP tool:
 *
 * 1. Check whether the tool passes the configured include/exclude filters.
 * 2. Register the tool with its name, description, Zod input schema, and async handler.
 *
 * **Input schema:**
 * - `message` (`string`) — The message to display in the greeting.
 *
 * **Output:**
 * - A single text content block containing `"Message: <message>"`.
 *
 * @param server - The {@link McpServer} instance to register the tool on.
 * @param config - Optional server configuration for tool filtering. Defaults to `{}`.
 */
export function registerHelloWorldTool(server: McpServer, config: McpServerConfig = {}) {
  const isToolIncluded = createToolFilter(config);
  if (!isToolIncluded(TOOL_NAMES.HELLO_WORLD_TOOL)) return;

  server.registerTool(
    NAME,
    {
      description: DESCRIPTION,
      inputSchema: {
        message: z.string().describe('The message to display in the hello world greeting'),
      },
    },
    async ({ message }) => ({
      content: [{ type: 'text', text: `Message: ${message}` }],
    }),
  );
}
