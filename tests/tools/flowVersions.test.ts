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
import { registerFlowVersionTools } from '../../src/tools/flowVersions.js';
import { McpServerConfig } from '../../src/types/index.js';
import { MCP_TOOLS } from '../../src/utils/constants.js';
import { AuthManager } from '../../src/modules/auth/manager.js';
import { Logger } from '../../src/utils/logger.js';

vi.mock('../../src/modules/auth/clients/flowVersions.js', () => {
  const mockListFlowVersions = vi.fn();
  const mockGetFlowVersion = vi.fn();
  return {
    FlowVersionsClient: class {
      listFlowVersions = mockListFlowVersions;
      getFlowVersion = mockGetFlowVersion;
    },
  };
});

import { FlowVersionsClient } from '../../src/modules/auth/clients/flowVersions.js';

const mockAuth = {
  clientId: 'test-client-id',
  environmentId: 'test-env-id',
  rootDomain: 'pingidentity.com',
};

describe('registerFlowVersionTools', () => {
  let server: McpServer;
  let client: Client;
  let mockAuthManager: AuthManager;
  let logger: Logger;
  let mockFlowVersionsClient: {
    listFlowVersions: ReturnType<typeof vi.fn>;
    getFlowVersion: ReturnType<typeof vi.fn>;
  };

  async function setupServerAndClient(config: McpServerConfig) {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerFlowVersionTools(server, config, mockAuthManager, logger);

    // Grab the mock instance created during registerFlowVersionTools
    mockFlowVersionsClient = new FlowVersionsClient(
      mockAuthManager,
    ) as unknown as typeof mockFlowVersionsClient;

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '0.0.1' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);
  }

  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(names).toContain(MCP_TOOLS.LIST_FLOW_VERSIONS.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME);
  });

  it('should register only list_flow_versions when describe_flow_version is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_FLOW_VERSIONS.NAME);
    expect(names).not.toContain(MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME);
  });

  it('should register only describe_flow_version when list_flow_versions is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.LIST_FLOW_VERSIONS.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain(MCP_TOOLS.LIST_FLOW_VERSIONS.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME);
  });

  it('should register no tools when both are excluded', () => {
    const registerToolSpy = vi.fn();
    server = new McpServer({ name: 'test', version: '0.0.1' });
    server.registerTool = registerToolSpy;
    registerFlowVersionTools(
      server,
      {
        auth: mockAuth,
        excludeTools: [MCP_TOOLS.LIST_FLOW_VERSIONS.NAME, MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME],
      },
      mockAuthManager,
      logger,
    );

    expect(registerToolSpy).not.toHaveBeenCalled();
  });

  // --- list_flow_versions tool ---

  it('should return flow versions from list_flow_versions', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockData = [{ version: 1 }, { version: 2 }];
    mockFlowVersionsClient.listFlowVersions.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_FLOW_VERSIONS.NAME,
      arguments: { flowId: 'flow-123' },
    });

    expect(mockFlowVersionsClient.listFlowVersions).toHaveBeenCalledWith('flow-123');
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockData) }]);
  });

  it('should throw McpError when list_flow_versions fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowVersionsClient.listFlowVersions.mockRejectedValue(new Error('Network error'));

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_FLOW_VERSIONS.NAME,
      arguments: { flowId: 'flow-123' },
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from list_flow_versions as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowVersionsClient.listFlowVersions.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_FLOW_VERSIONS.NAME,
      arguments: { flowId: 'flow-123' },
    });

    expect(result.isError).toBe(true);
  });

  // --- describe_flow_version tool ---

  it('should return flow version details from describe_flow_version', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockVersion = { version: 3, flow: { id: 'flow-123', name: 'Test Flow' } };
    mockFlowVersionsClient.getFlowVersion.mockResolvedValue(mockVersion);

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME,
      arguments: { flowId: 'flow-123', versionId: '3' },
    });

    expect(mockFlowVersionsClient.getFlowVersion).toHaveBeenCalledWith('flow-123', '3');
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockVersion) }]);
  });

  it('should throw McpError when describe_flow_version fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowVersionsClient.getFlowVersion.mockRejectedValue(new Error('Not found'));

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME,
      arguments: { flowId: 'invalid-id', versionId: '99' },
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from describe_flow_version as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowVersionsClient.getFlowVersion.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME,
      arguments: { flowId: 'flow-123', versionId: '3' },
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
    registerFlowVersionTools(server, { auth: mockAuth }, mockAuthManager, verboseLogger);

    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.LIST_FLOW_VERSIONS.NAME}`,
    );
    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_FLOW_VERSION.NAME}`,
    );
  });
});
