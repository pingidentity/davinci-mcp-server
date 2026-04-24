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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { registerApplicationTools } from '../../src/tools/application.js';
import { McpServerConfig } from '../../src/types/index.js';
import { MCP_TOOLS } from '../../src/utils/constants.js';
import { AuthManager } from '../../src/modules/auth/manager.js';
import { Logger } from '../../src/utils/logger.js';

vi.mock('../../src/modules/auth/clients/application.js', () => {
  const mockListApplications = vi.fn();
  const mockDescribeApplication = vi.fn();
  return {
    ApplicationsClient: class {
      listApplications = mockListApplications;
      describeApplication = mockDescribeApplication;
    },
  };
});

import { ApplicationsClient } from '../../src/modules/auth/clients/application.js';

const mockAuth = {
  clientId: 'test-client-id',
  environmentId: 'test-env-id',
  rootDomain: 'pingidentity.com',
};

describe('registerApplicationTools', () => {
  let server: McpServer;
  let client: Client;
  let mockAuthManager: AuthManager;
  let logger: Logger;
  let mockApplicationsClient: {
    listApplications: ReturnType<typeof vi.fn>;
    describeApplication: ReturnType<typeof vi.fn>;
  };
  let consoleSpy: ReturnType<typeof vi.fn>;

  async function setupServerAndClient(config: McpServerConfig) {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerApplicationTools(server, config, mockAuthManager, logger);

    mockApplicationsClient = new ApplicationsClient(
      mockAuthManager,
    ) as unknown as typeof mockApplicationsClient;

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '0.0.1' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger = new Logger(false);
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

  // --- Registration ---

  it('should register both tools when no filters are set', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_APPLICATIONS.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_APPLICATION.NAME);
  });

  it('should register only list_applications when describe_application is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.DESCRIBE_APPLICATION.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_APPLICATIONS.NAME);
    expect(names).not.toContain(MCP_TOOLS.DESCRIBE_APPLICATION.NAME);
  });

  it('should register only describe_application when list_applications is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.LIST_APPLICATIONS.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain(MCP_TOOLS.LIST_APPLICATIONS.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_APPLICATION.NAME);
  });

  it('should register no tools when both are excluded', () => {
    const registerToolSpy = vi.fn();
    server = new McpServer({ name: 'test', version: '0.0.1' });
    server.registerTool = registerToolSpy;
    registerApplicationTools(
      server,
      {
        auth: mockAuth,
        excludeTools: [MCP_TOOLS.LIST_APPLICATIONS.NAME, MCP_TOOLS.DESCRIBE_APPLICATION.NAME],
      },
      mockAuthManager,
      logger,
    );

    expect(registerToolSpy).not.toHaveBeenCalled();
  });

  // --- list_applications tool ---

  it('should return applications from list_applications', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockData = [{ id: 'app-1' }, { id: 'app-2' }];
    mockApplicationsClient.listApplications.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_APPLICATIONS.NAME,
    });

    expect(mockApplicationsClient.listApplications).toHaveBeenCalled();
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockData) }]);
  });

  it('should return an error when list_applications fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockApplicationsClient.listApplications.mockRejectedValue(new Error('Network error'));

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_APPLICATIONS.NAME,
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from list_applications as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockApplicationsClient.listApplications.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_APPLICATIONS.NAME,
    });

    expect(result.isError).toBe(true);
  });

  // --- describe_application tool ---

  it('should return application details from describe_application', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockApplication = { id: 'app-123', name: 'Test Application' };
    mockApplicationsClient.describeApplication.mockResolvedValue(mockApplication);

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_APPLICATION.NAME,
      arguments: { applicationId: 'app-123' },
    });

    expect(mockApplicationsClient.describeApplication).toHaveBeenCalledWith('app-123');
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockApplication) }]);
  });

  it('should return an error when describe_application fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockApplicationsClient.describeApplication.mockRejectedValue(new Error('Not found'));

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_APPLICATION.NAME,
      arguments: { applicationId: 'invalid-app' },
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from describe_application as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockApplicationsClient.describeApplication.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_APPLICATION.NAME,
      arguments: { applicationId: 'app-123' },
    });

    expect(result.isError).toBe(true);
  });

  // --- Logging ---

  it('should log debug messages when registering tools', () => {
    const debugSpy = vi.fn();
    const verboseLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: debugSpy,
    } as unknown as Logger;

    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerApplicationTools(server, { auth: mockAuth }, mockAuthManager, verboseLogger);

    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.LIST_APPLICATIONS.NAME}`,
    );
    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_APPLICATION.NAME}`,
    );
  });
});