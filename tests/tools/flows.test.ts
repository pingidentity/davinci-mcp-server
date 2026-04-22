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
import { registerFlowTools } from '../../src/tools/flows.js';
import { McpServerConfig } from '../../src/types/index.js';
import { MCP_TOOLS } from '../../src/utils/constants.js';
import { AuthManager } from '../../src/modules/auth/manager.js';
import { Logger } from '../../src/utils/logger.js';

vi.mock('../../src/modules/auth/clients/flows.js', () => {
  const mockListFlows = vi.fn();
  const mockGetFlow = vi.fn();
  return {
    FlowsClient: class {
      listFlows = mockListFlows;
      getFlow = mockGetFlow;
    },
  };
});

import { FlowsClient } from '../../src/modules/auth/clients/flows.js';

const mockAuth = {
  clientId: 'test-client-id',
  environmentId: 'test-env-id',
  rootDomain: 'pingidentity.com',
};

describe('registerFlowTools', () => {
  let server: McpServer;
  let client: Client;
  let mockAuthManager: AuthManager;
  let logger: Logger;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let mockFlowsClient: { listFlows: ReturnType<typeof vi.fn>; getFlow: ReturnType<typeof vi.fn> };

  async function setupServerAndClient(config: McpServerConfig) {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerFlowTools(server, config, mockAuthManager, logger);

    // Grab the mock instance created during registerFlowTools
    mockFlowsClient = new FlowsClient(mockAuthManager) as unknown as typeof mockFlowsClient;

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

    expect(names).toContain(MCP_TOOLS.LIST_FLOWS.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_FLOW.NAME);
  });

  it('should register only list_flows when describe_flow is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.DESCRIBE_FLOW.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_FLOWS.NAME);
    expect(names).not.toContain(MCP_TOOLS.DESCRIBE_FLOW.NAME);
  });

  it('should register only describe_flow when list_flows is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.LIST_FLOWS.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain(MCP_TOOLS.LIST_FLOWS.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_FLOW.NAME);
  });

  it('should register no tools when both are excluded', () => {
    const registerToolSpy = vi.fn();
    server = new McpServer({ name: 'test', version: '0.0.1' });
    server.registerTool = registerToolSpy;
    registerFlowTools(
      server,
      { auth: mockAuth, excludeTools: [MCP_TOOLS.LIST_FLOWS.NAME, MCP_TOOLS.DESCRIBE_FLOW.NAME] },
      mockAuthManager,
      logger,
    );

    expect(registerToolSpy).not.toHaveBeenCalled();
  });

  // --- list_flows tool ---

  it('should return flows from list_flows', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockData = [{ id: 'flow-1', name: 'Flow 1' }];
    mockFlowsClient.listFlows.mockResolvedValue(mockData);

    const result = await client.callTool({ name: MCP_TOOLS.LIST_FLOWS.NAME, arguments: {} });

    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockData) }]);
  });

  it('should throw McpError when list_flows fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowsClient.listFlows.mockRejectedValue(new Error('Network error'));

    const result = await client.callTool({ name: MCP_TOOLS.LIST_FLOWS.NAME, arguments: {} });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from list_flows as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowsClient.listFlows.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({ name: MCP_TOOLS.LIST_FLOWS.NAME, arguments: {} });

    expect(result.isError).toBe(true);
  });

  // --- describe_flow tool ---

  it('should return flow details from describe_flow', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockFlow = { id: 'flow-123', name: 'Test Flow', enabled: true };
    mockFlowsClient.getFlow.mockResolvedValue(mockFlow);

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_FLOW.NAME,
      arguments: { flowId: 'flow-123' },
    });

    expect(mockFlowsClient.getFlow).toHaveBeenCalledWith('flow-123');
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockFlow) }]);
  });

  it('should throw McpError when describe_flow fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowsClient.getFlow.mockRejectedValue(new Error('Not found'));

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_FLOW.NAME,
      arguments: { flowId: 'invalid-id' },
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from describe_flow as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowsClient.getFlow.mockRejectedValue(new McpError(ErrorCode.InternalError, 'Auth failed'));

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_FLOW.NAME,
      arguments: { flowId: 'flow-123' },
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
    registerFlowTools(server, { auth: mockAuth }, mockAuthManager, verboseLogger);

    expect(debugSpy).toHaveBeenCalledWith(`[Tools] Registering tool: ${MCP_TOOLS.LIST_FLOWS.NAME}`);
    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_FLOW.NAME}`,
    );
  });
});
