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
  const mockValidateFlow = vi.fn();
  const mockGetFlowExecutions = vi.fn();
  const mockGetFlowExecutionEvents = vi.fn();
  return {
    FlowsClient: class {
      listFlows = mockListFlows;
      getFlow = mockGetFlow;
      validateFlow = mockValidateFlow;
      getFlowExecutions = mockGetFlowExecutions;
      getFlowExecutionEvents = mockGetFlowExecutionEvents;
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
  let mockFlowsClient: {
    listFlows: ReturnType<typeof vi.fn>;
    getFlow: ReturnType<typeof vi.fn>;
    validateFlow: ReturnType<typeof vi.fn>;
    getFlowExecutions: ReturnType<typeof vi.fn>;
    getFlowExecutionEvents: ReturnType<typeof vi.fn>;
  };

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

  it('should register all tools when no filters are set', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_FLOWS.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_FLOW.NAME);
    expect(names).toContain(MCP_TOOLS.VALIDATE_FLOW.NAME);
    expect(names).toContain(MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME);
    expect(names).toContain(MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME);
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

  it('should register no tools when all are excluded', () => {
    const registerToolSpy = vi.fn();
    server = new McpServer({ name: 'test', version: '0.0.1' });
    server.registerTool = registerToolSpy;
    registerFlowTools(
      server,
      {
        auth: mockAuth,
        excludeTools: [
          MCP_TOOLS.LIST_FLOWS.NAME,
          MCP_TOOLS.DESCRIBE_FLOW.NAME,
          MCP_TOOLS.VALIDATE_FLOW.NAME,
          MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME,
          MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME,
        ],
      },
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
    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.VALIDATE_FLOW.NAME}`,
    );
  });

  // --- validate_flow tool ---

  it('should register validate_flow tool when not excluded', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.VALIDATE_FLOW.NAME);
  });

  it('should not register validate_flow when excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.VALIDATE_FLOW.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain(MCP_TOOLS.VALIDATE_FLOW.NAME);
  });

  it('should validate flow and return flow with linter details', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockValidationResponse = {
      id: 'flow-123',
      name: 'Test Flow',
      graphData: { nodes: [], edges: [] },
      dvlinterWarningCount: 2,
    };
    const mockFlowWithDetails = {
      id: 'flow-123',
      name: 'Test Flow',
      graphData: {
        nodes: [
          {
            data: {
              id: 'p553hup1ih',
              nodeType: 'CONNECTION',
              connectorId: 'test-connector-id',
              conenctionId: 'test-connection-id',
              properties: {},
              linterError: [
                {
                  code: 'dv-bp-node-001',
                  message: 'Missing node title',
                  type: 'best-practice',
                  recommendation:
                    "The node 'p553hup1ih' is missing a title. For optimal clarity, add a descriptive title.",
                  flowId: 'flow-123',
                  nodeId: 'p553hup1ih',
                },
                {
                  code: 'dv-bp-node-003',
                  message: 'Missing node description',
                  type: 'best-practice',
                  recommendation:
                    "The node 'p553hup1ih' is missing a description. For optimal clarity, add a meaningful description.",
                  flowId: 'flow-123',
                  nodeId: 'p553hup1ih',
                },
              ],
            },
          },
        ],
        edges: [],
      },
      dvlinterWarningCount: 2,
    };

    mockFlowsClient.validateFlow.mockResolvedValue(mockValidationResponse);
    mockFlowsClient.getFlow.mockResolvedValue(mockFlowWithDetails);

    const result = await client.callTool({
      name: MCP_TOOLS.VALIDATE_FLOW.NAME,
      arguments: { flowId: 'flow-123' },
    });

    expect(mockFlowsClient.validateFlow).toHaveBeenCalledWith('flow-123');
    expect(mockFlowsClient.getFlow).toHaveBeenCalledWith('flow-123', { expand: 'dvlinterDetails' });
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockFlowWithDetails) }]);
  });

  it('should throw McpError when validate_flow fails during validation', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowsClient.validateFlow.mockRejectedValue(new Error('Validation service unavailable'));

    const result = await client.callTool({
      name: MCP_TOOLS.VALIDATE_FLOW.NAME,
      arguments: { flowId: 'flow-123' },
    });

    expect(result.isError).toBe(true);
  });

  it('should throw McpError when validate_flow fails during getFlow', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowsClient.validateFlow.mockResolvedValue({ status: 'validated' });
    mockFlowsClient.getFlow.mockRejectedValue(new Error('Flow not found'));

    const result = await client.callTool({
      name: MCP_TOOLS.VALIDATE_FLOW.NAME,
      arguments: { flowId: 'flow-123' },
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from validate_flow as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowsClient.validateFlow.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.VALIDATE_FLOW.NAME,
      arguments: { flowId: 'flow-123' },
    });

    expect(result.isError).toBe(true);
  });

  it('should require flowId parameter for validate_flow', async () => {
    await setupServerAndClient({ auth: mockAuth });

    const result = await client.callTool({
      name: MCP_TOOLS.VALIDATE_FLOW.NAME,
      arguments: {},
    });

    expect(result.isError).toBe(true);
  });

  it('should log debug message when registering validate_flow tool', () => {
    const debugSpy = vi.fn();
    const verboseLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: debugSpy,
    } as unknown as Logger;

    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerFlowTools(server, { auth: mockAuth }, mockAuthManager, verboseLogger);

    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.VALIDATE_FLOW.NAME}`,
    );
  });

  // --- list_flow_executions tool ---

  it('should register list_flow_executions tool when not excluded', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME);
  });

  it('should not register list_flow_executions when excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain(MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME);
  });

  it('should return flow executions from list_flow_executions', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockExecutions = [
      { id: 'exec-1', flowId: 'flow-123', timestamp: '2026-04-30T10:00:00Z' },
      { id: 'exec-2', flowId: 'flow-123', timestamp: '2026-04-30T11:00:00Z' },
    ];
    mockFlowsClient.getFlowExecutions.mockResolvedValue(mockExecutions);

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME,
      arguments: { flowId: 'flow-123' },
    });

    expect(mockFlowsClient.getFlowExecutions).toHaveBeenCalledWith(
      'flow-123',
      expect.objectContaining({
        limit: 500,
        filter: expect.stringContaining('timestamp ge'),
      }),
    );
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockExecutions) }]);
  });

  it('should include transactionId filter when provided to list_flow_executions', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockExecutions = [{ id: 'exec-1', flowId: 'flow-123', transactionId: 'txn-123' }];
    mockFlowsClient.getFlowExecutions.mockResolvedValue(mockExecutions);

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME,
      arguments: { flowId: 'flow-123', transactionId: 'txn-123' },
    });

    expect(mockFlowsClient.getFlowExecutions).toHaveBeenCalledWith(
      'flow-123',
      expect.objectContaining({
        limit: 500,
        filter: expect.stringMatching(/timestamp ge.*and.*transactionId eq "txn-123"/),
      }),
    );
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockExecutions) }]);
  });

  it('should support cursor for pagination in list_flow_executions', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockExecutions = [{ id: 'exec-3', flowId: 'flow-123' }];
    mockFlowsClient.getFlowExecutions.mockResolvedValue(mockExecutions);

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME,
      arguments: { flowId: 'flow-123', cursor: 'next-page' },
    });

    expect(mockFlowsClient.getFlowExecutions).toHaveBeenCalledWith(
      'flow-123',
      expect.objectContaining({
        cursor: 'next-page',
      }),
    );
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockExecutions) }]);
  });

  it('should throw McpError when list_flow_executions fails', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowsClient.getFlowExecutions.mockRejectedValue(new Error('Failed to retrieve executions'));

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME,
      arguments: { flowId: 'flow-123' },
    });

    expect(result.isError).toBe(true);
  });

  it('should require flowId parameter for list_flow_executions', async () => {
    await setupServerAndClient({ auth: mockAuth });

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME,
      arguments: {},
    });

    expect(result.isError).toBe(true);
  });

  // --- summarize_flow_execution tool ---

  it('should register summarize_flow_execution tool when not excluded', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME);
  });

  it('should not register summarize_flow_execution when excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain(MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME);
  });

  it('should return flow execution events from summarize_flow_execution', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockEvents = [
      { id: 'event-1', type: 'start', timestamp: '2026-04-30T10:00:00Z' },
      { id: 'event-2', type: 'end', timestamp: '2026-04-30T10:00:05Z' },
    ];
    mockFlowsClient.getFlowExecutionEvents.mockResolvedValue(mockEvents);

    const result = await client.callTool({
      name: MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME,
      arguments: { flowId: 'flow-123', interactionId: 'interaction-456' },
    });

    expect(mockFlowsClient.getFlowExecutionEvents).toHaveBeenCalledWith(
      'flow-123',
      'interaction-456',
      expect.objectContaining({
        limit: 500,
        filter: expect.stringContaining('timestamp ge'),
      }),
    );
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockEvents) }]);
  });

  it('should support cursor for pagination in summarize_flow_execution', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockEvents = [{ id: 'event-3', type: 'action' }];
    mockFlowsClient.getFlowExecutionEvents.mockResolvedValue(mockEvents);

    const result = await client.callTool({
      name: MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME,
      arguments: { flowId: 'flow-123', interactionId: 'interaction-456', cursor: 'events-cursor' },
    });

    expect(mockFlowsClient.getFlowExecutionEvents).toHaveBeenCalledWith(
      'flow-123',
      'interaction-456',
      expect.objectContaining({
        cursor: 'events-cursor',
      }),
    );
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockEvents) }]);
  });

  it('should throw McpError when summarize_flow_execution fails', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowsClient.getFlowExecutionEvents.mockRejectedValue(
      new Error('Failed to retrieve events'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME,
      arguments: { flowId: 'flow-123', interactionId: 'interaction-456' },
    });

    expect(result.isError).toBe(true);
  });

  it('should require flowId and interactionId parameters for summarize_flow_execution', async () => {
    await setupServerAndClient({ auth: mockAuth });

    const result1 = await client.callTool({
      name: MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME,
      arguments: {},
    });
    expect(result1.isError).toBe(true);

    const result2 = await client.callTool({
      name: MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME,
      arguments: { flowId: 'flow-123' },
    });
    expect(result2.isError).toBe(true);
  });

  it('should rethrow McpError from summarize_flow_execution as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowsClient.getFlowExecutionEvents.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME,
      arguments: { flowId: 'flow-123', interactionId: 'interaction-456' },
    });

    expect(result.isError).toBe(true);
  });

  it('should log debug messages when registering execution tools', () => {
    const debugSpy = vi.fn();
    const verboseLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: debugSpy,
    } as unknown as Logger;

    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerFlowTools(server, { auth: mockAuth }, mockAuthManager, verboseLogger);

    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.LIST_FLOW_EXECUTIONS.NAME}`,
    );
    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.SUMMARIZE_FLOW_EXECUTION.NAME}`,
    );
  });
});
