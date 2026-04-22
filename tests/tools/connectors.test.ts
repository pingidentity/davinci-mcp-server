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
import { registerConnectorTools } from '../../src/tools/connectors.js';
import { McpServerConfig } from '../../src/types/index.js';
import { MCP_TOOLS } from '../../src/utils/constants.js';
import { AuthManager } from '../../src/modules/auth/manager.js';
import { Logger } from '../../src/utils/logger.js';

vi.mock('../../src/modules/auth/clients/connectors.js', () => {
  const mockListConnectors = vi.fn();
  const mockGetConnector = vi.fn();
  const mockGetConnectorDetails = vi.fn();
  return {
    ConnectorsClient: class {
      listConnectors = mockListConnectors;
      getConnector = mockGetConnector;
      getConnectorDetails = mockGetConnectorDetails;
    },
  };
});

import { ConnectorsClient } from '../../src/modules/auth/clients/connectors.js';

const mockAuth = {
  clientId: 'test-client-id',
  environmentId: 'test-env-id',
  rootDomain: 'pingidentity.com',
};

describe('registerConnectorTools', () => {
  let server: McpServer;
  let client: Client;
  let mockAuthManager: AuthManager;
  let logger: Logger;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let mockConnectorsClient: {
    listConnectors: ReturnType<typeof vi.fn>;
    getConnector: ReturnType<typeof vi.fn>;
    getConnectorDetails: ReturnType<typeof vi.fn>;
  };

  async function setupServerAndClient(config: McpServerConfig) {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerConnectorTools(server, config, mockAuthManager, logger);

    // Grab the mock instance created during registerConnectorTools
    mockConnectorsClient = new ConnectorsClient(
      mockAuthManager,
    ) as unknown as typeof mockConnectorsClient;

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

    expect(names).toContain(MCP_TOOLS.LIST_CONNECTORS.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_CONNECTOR.NAME);
  });

  it('should register only list_connectors when describe_connector is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.DESCRIBE_CONNECTOR.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_CONNECTORS.NAME);
    expect(names).not.toContain(MCP_TOOLS.DESCRIBE_CONNECTOR.NAME);
  });

  it('should register only describe_connector when list_connectors is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.LIST_CONNECTORS.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain(MCP_TOOLS.LIST_CONNECTORS.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_CONNECTOR.NAME);
  });

  it('should register no tools when both are excluded', () => {
    const registerToolSpy = vi.fn();
    server = new McpServer({ name: 'test', version: '0.0.1' });
    server.registerTool = registerToolSpy;
    registerConnectorTools(
      server,
      {
        auth: mockAuth,
        excludeTools: [MCP_TOOLS.LIST_CONNECTORS.NAME, MCP_TOOLS.DESCRIBE_CONNECTOR.NAME],
      },
      mockAuthManager,
      logger,
    );

    expect(registerToolSpy).not.toHaveBeenCalled();
  });

  // --- list_connectors tool ---

  it('should return connectors from list_connectors', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockData = [
      { id: 'httpConnector', name: 'HTTP' },
      { id: 'functionsConnector', name: 'Functions' },
    ];
    mockConnectorsClient.listConnectors.mockResolvedValue(mockData);

    const result = await client.callTool({ name: MCP_TOOLS.LIST_CONNECTORS.NAME, arguments: {} });

    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockData) }]);
  });

  it('should throw McpError when list_connectors fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockConnectorsClient.listConnectors.mockRejectedValue(new Error('Network error'));

    const result = await client.callTool({ name: MCP_TOOLS.LIST_CONNECTORS.NAME, arguments: {} });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from list_connectors as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockConnectorsClient.listConnectors.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({ name: MCP_TOOLS.LIST_CONNECTORS.NAME, arguments: {} });

    expect(result.isError).toBe(true);
  });

  // --- describe_connector tool ---

  it('should return combined connector and details from describe_connector', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockConnector = { id: 'httpConnector', name: 'HTTP', version: '1.0.73' };
    const mockDetails = { capabilities: { makeRestApiCall: { title: 'Make REST API Call' } } };
    mockConnectorsClient.getConnector.mockResolvedValue(mockConnector);
    mockConnectorsClient.getConnectorDetails.mockResolvedValue(mockDetails);

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_CONNECTOR.NAME,
      arguments: { connectorId: 'httpConnector' },
    });

    expect(mockConnectorsClient.getConnector).toHaveBeenCalledWith('httpConnector');
    expect(mockConnectorsClient.getConnectorDetails).toHaveBeenCalledWith('httpConnector');
    const expected = { ...mockConnector, ...mockDetails };
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(expected) }]);
  });

  it('should throw McpError when describe_connector fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockConnectorsClient.getConnector.mockRejectedValue(new Error('Not found'));

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_CONNECTOR.NAME,
      arguments: { connectorId: 'invalid-id' },
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from describe_connector as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockConnectorsClient.getConnector.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_CONNECTOR.NAME,
      arguments: { connectorId: 'httpConnector' },
    });

    expect(result.isError).toBe(true);
  });
});
