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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from '../../src/tools/index.js';
import { McpServerConfig } from '../../src/types/index.js';
import { AuthManager } from '../../src/modules/auth/manager.js';
import { Logger } from '../../src/utils/logger.js';

const mockAuth = {
  clientId: 'test-client-id',
  environmentId: 'test-env-id',
  rootDomain: 'pingidentity.com',
};

describe('registerAllTools', () => {
  let server: McpServer;
  let mockAuthManager: AuthManager;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    server = new McpServer({ name: 'test', version: '0.0.1' });
    mockAuthManager = {
      getLogger: vi.fn().mockReturnValue({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      }),
      getRootDomain: vi.fn().mockReturnValue('pingidentity.com'),
      getEnvironmentId: vi.fn().mockReturnValue('test-env-id'),
    } as unknown as AuthManager;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should register tools when no filters are set and authManager is provided', () => {
    const logger = new Logger(false);
    const config: McpServerConfig = { auth: mockAuth };
    expect(() => registerAllTools(server, config, mockAuthManager, logger)).not.toThrow();
  });

  it('should log when verbose is enabled', () => {
    const logger = new Logger(true);
    const config: McpServerConfig = { verbose: true, auth: mockAuth };
    registerAllTools(server, config, mockAuthManager, logger);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] [Tools] Tool registration complete.'),
    );
  });

  it('should not log when verbose is disabled', () => {
    const logger = new Logger(false);
    const config: McpServerConfig = { verbose: false, auth: mockAuth };
    registerAllTools(server, config, mockAuthManager, logger);
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[Tools] Tool registration complete.'),
    );
  });
});
