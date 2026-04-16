#!/usr/bin/env node

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

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

/**
 * Initialize the MCP server for DaVinci.
 * Using the modern McpServer class which provides a high-level API.
 */
export const server = new McpServer({
  name: 'davinci-mcp-server',
  version: '0.1.0',
});

/**
 * Example tool registration using the recommended registerTool method.
 * This will be expanded with actual DaVinci orchestration tools.
 */
server.registerTool(
  'echo',
  {
    description: 'A simple echo tool to verify server connectivity',
    inputSchema: {
      message: z.string().describe('The message to echo back'),
    },
  },
  async ({ message }) => ({
    content: [{ type: 'text', text: `Echo: ${message}` }],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('DaVinci MCP server running on stdio');
}

// Only run main if this file is executed directly
if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
  });
}
