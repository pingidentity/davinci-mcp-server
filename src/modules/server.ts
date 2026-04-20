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
import { Logger } from '../utils/logger.js';
import { AuthManager } from './auth/manager.js';

/**
 * High-level wrapper around the MCP SDK's {@link McpServer}.
 *
 * Manages the server lifecycle — tool registration, transport connection,
 * and graceful shutdown — for the DaVinci MCP server.
 */
export class DavinciMcpServer {
  private server: McpServer;
  private authManager: AuthManager;
  private logger: Logger;
  private logoutPromise?: Promise<void>;

  /**
   * Creates a new DaVinci MCP server instance.
   *
   * Initializes the underlying {@link McpServer} with the server name and version,
   * then registers all configured tools based on the provided filter options.
   *
   * @param config - Server configuration controlling tool filtering, logging, and authentication.
   *                 The `auth` property is required.
   */
  constructor(config: McpServerConfig) {
    this.logger = new Logger(config.verbose);
    this.server = new McpServer({
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    });

    this.authManager = new AuthManager(config.auth, this.logger);

    if (config.logout) {
      this.logoutPromise = this.handleLogout();
    }

    registerAllTools(this.server, config, this.authManager, this.logger);
  }

  /**
   * Gets the logger instance used by this server.
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Performs logout by clearing stored authentication tokens.
   *
   * @returns A promise that resolves when tokens are cleared.
   */
  private async handleLogout(): Promise<void> {
    this.logger.info('Logging out and clearing tokens...');
    await this.authManager.clearTokens();
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
    if (this.logoutPromise) {
      await this.logoutPromise;
    }
    await this.server.connect(transport);
    this.logger.info('DaVinci MCP server running on stdio');
  }

  /**
   * Gracefully shuts down the MCP server, closing the transport and releasing resources.
   *
   * Logs a shutdown confirmation message when verbose mode is enabled.
   */
  async close() {
    await this.server.close();
    this.logger.debug('DaVinci MCP server shutdown complete');
  }
}
