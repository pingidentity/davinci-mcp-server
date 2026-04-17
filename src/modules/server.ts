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
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { registerAllTools } from '../tools/index.js';
import { McpServerConfig } from '../types/index.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../utils/constants.js';

/**
 * High-level wrapper around the MCP SDK's {@link McpServer}.
 *
 * Manages the server lifecycle — tool registration, transport connection,
 * and graceful shutdown — for the DaVinci MCP server.
 */
export class DavinciMcpServer {
  private server: McpServer;
  private verbose: boolean;

  /**
   * Creates a new DaVinci MCP server instance.
   *
   * Initializes the underlying {@link McpServer} with the server name and version,
   * then registers all configured tools based on the provided filter options.
   *
   * @param config - Optional server configuration controlling tool filtering and logging.
   *                 Defaults to `{}` (all tools enabled, verbose off).
   */
  constructor(config: McpServerConfig = {}) {
    this.verbose = !!config.verbose;
    this.server = new McpServer({
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    });

    registerAllTools(this.server, config);
  }

  /**
   * Connects the server to a stdio transport and begins listening for requests.
   *
   * Creates a new {@link StdioServerTransport}, binds it to the server,
   * and logs a startup message when verbose mode is enabled.
   */
  async connect() {
    const transport = new StdioServerTransport();
    await this.connectWithTransport(transport);
  }

  /**
   * Connects the server to the given transport and begins listening for requests.
   *
   * @param transport - The transport to bind the server to.
   */
  async connectWithTransport(transport: Transport) {
    await this.server.connect(transport);
    if (this.verbose) console.error('DaVinci MCP server running on stdio');
  }

  /**
   * Gracefully shuts down the MCP server, closing the transport and releasing resources.
   *
   * Logs a shutdown confirmation message when verbose mode is enabled.
   */
  async close() {
    await this.server.close();
    if (this.verbose) console.error('DaVinci MCP server shutdown complete');
  }
}
