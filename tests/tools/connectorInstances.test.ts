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
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { registerConnectorInstanceTools } from '../../src/tools/connectorInstances.js';
import { McpServerConfig } from '../../src/types/index.js';
import { MCP_TOOLS } from '../../src/utils/constants.js';
import { AuthManager } from '../../src/modules/auth/manager.js';
import { Logger } from '../../src/utils/logger.js';

vi.mock('../../src/modules/auth/clients/connectorInstances.js', () => {
  const mockListConnectorInstances = vi.fn();
  const mockGetConnectorInstance = vi.fn();
  return {
    ConnectorInstancesClient: class {
      listConnectorInstances = mockListConnectorInstances;
      getConnectorInstance = mockGetConnectorInstance;
    },
  };
});

import { ConnectorInstancesClient } from '../../src/modules/auth/clients/connectorInstances.js';

const mockAuth = {
  clientId: 'test-client-id',
  environmentId: 'test-env-id',
  rootDomain: 'pingidentity.com',
};

describe('registerConnectorInstanceTools', () => {
  let server: McpServer;
  let client: Client;
  let mockAuthManager: AuthManager;
  let logger: Logger;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let mockConnectorInstancesClient: {
    listConnectorInstances: ReturnType<typeof vi.fn>;
    getConnectorInstance: ReturnType<typeof vi.fn>;
  };

  async function setupServerAndClient(config: McpServerConfig) {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerConnectorInstanceTools(server, config, mockAuthManager, logger);

    // Grab the mock instance created during registerConnectorInstanceTools
    mockConnectorInstancesClient = new ConnectorInstancesClient(
      mockAuthManager,
    ) as unknown as typeof mockConnectorInstancesClient;

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

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // --- Registration ---

  it('should register both tools when no filters are set', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME);
  });

  it('should register only list_connector_instances when describe_connector_instance is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME);
    expect(names).not.toContain(MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME);
  });

  it('should register only describe_connector_instance when list_connector_instances is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain(MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME);
  });

  it('should register no tools when both are excluded', () => {
    const registerToolSpy = vi.fn();
    server = new McpServer({ name: 'test', version: '0.0.1' });
    server.registerTool = registerToolSpy;
    registerConnectorInstanceTools(
      server,
      {
        auth: mockAuth,
        excludeTools: [
          MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME,
          MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME,
        ],
      },
      mockAuthManager,
      logger,
    );

    expect(registerToolSpy).not.toHaveBeenCalled();
  });

  // --- list_connector_instances tool ---

  it('should return connector instances from list_connector_instances', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockData = [
      { id: 'instance-1', name: 'Http', connector: { id: 'httpConnector' } },
      { id: 'instance-2', name: 'Functions', connector: { id: 'functionsConnector' } },
    ];
    mockConnectorInstancesClient.listConnectorInstances.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME,
      arguments: {},
    });

    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockData) }]);
  });

  it('should throw McpError when list_connector_instances fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockConnectorInstancesClient.listConnectorInstances.mockRejectedValue(
      new Error('Network error'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME,
      arguments: {},
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from list_connector_instances as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockConnectorInstancesClient.listConnectorInstances.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_CONNECTOR_INSTANCES.NAME,
      arguments: {},
    });

    expect(result.isError).toBe(true);
  });

  // --- describe_connector_instance tool ---

  it('should return connector instance details from describe_connector_instance', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockInstance = {
      id: 'abc123',
      name: 'Functions',
      connector: { id: 'functionsConnector' },
      createdAt: '2023-07-23T09:01:42.113Z',
    };
    mockConnectorInstancesClient.getConnectorInstance.mockResolvedValue(mockInstance);

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME,
      arguments: { instanceId: 'abc123' },
    });

    expect(mockConnectorInstancesClient.getConnectorInstance).toHaveBeenCalledWith('abc123');
    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify(mockInstance) },
    ]);
  });

  it('should throw McpError when describe_connector_instance fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockConnectorInstancesClient.getConnectorInstance.mockRejectedValue(new Error('Not found'));

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME,
      arguments: { instanceId: 'invalid-id' },
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from describe_connector_instance as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockConnectorInstancesClient.getConnectorInstance.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_CONNECTOR_INSTANCE.NAME,
      arguments: { instanceId: 'abc123' },
    });

    expect(result.isError).toBe(true);
  });
});
