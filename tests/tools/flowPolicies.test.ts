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
import { registerFlowPoliciesTools } from '../../src/tools/flowPolicies.js';
import { McpServerConfig } from '../../src/types/index.js';
import { MCP_TOOLS } from '../../src/utils/constants.js';
import { AuthManager } from '../../src/modules/auth/manager.js';
import { Logger } from '../../src/utils/logger.js';

vi.mock('../../src/modules/auth/clients/flowPolicies.js', () => {
  const mockListFlowPolicies = vi.fn();
  const mockDescribeFlowPolicy = vi.fn();
  return {
    FlowPoliciesClient: class {
      listFlowPolicies = mockListFlowPolicies;
      describeFlowPolicy = mockDescribeFlowPolicy;
    },
  };
});

import { FlowPoliciesClient } from '../../src/modules/auth/clients/flowPolicies.js';

const mockAuth = {
  clientId: 'test-client-id',
  environmentId: 'test-env-id',
  rootDomain: 'pingidentity.com',
};

describe('registerFlowPoliciesTools', () => {
  let server: McpServer;
  let client: Client;
  let mockAuthManager: AuthManager;
  let logger: Logger;
  let mockFlowPoliciesClient: {
    listFlowPolicies: ReturnType<typeof vi.fn>;
    describeFlowPolicy: ReturnType<typeof vi.fn>;
  };
  let consoleSpy: ReturnType<typeof vi.fn>;

  async function setupServerAndClient(config: McpServerConfig) {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerFlowPoliciesTools(server, config, mockAuthManager, logger);

    mockFlowPoliciesClient = new FlowPoliciesClient(
      mockAuthManager,
    ) as unknown as typeof mockFlowPoliciesClient;

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

    expect(names).toContain(MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME);
  });

  it('should register only list_application_flow_policies when describe_application_flow_policy is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME);
    expect(names).not.toContain(MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME);
  });

  it('should register only describe_application_flow_policy when list_application_flow_policies is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain(MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME);
  });

  it('should register no tools when both are excluded', () => {
    const registerToolSpy = vi.fn();
    server = new McpServer({ name: 'test', version: '0.0.1' });
    server.registerTool = registerToolSpy;
    registerFlowPoliciesTools(
      server,
      {
        auth: mockAuth,
        excludeTools: [
          MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME,
          MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME,
        ],
      },
      mockAuthManager,
      logger,
    );

    expect(registerToolSpy).not.toHaveBeenCalled();
  });

  // --- list_application_flow_policies tool ---

  it('should return flow policies from list_application_flow_policies', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockData = [{ id: 'fp-1' }, { id: 'fp-2' }];
    mockFlowPoliciesClient.listFlowPolicies.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME,
      arguments: { applicationId: 'app-123' },
    });

    expect(mockFlowPoliciesClient.listFlowPolicies).toHaveBeenCalledWith('app-123');
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockData) }]);
  });

  it('should return an error when list_application_flow_policies fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowPoliciesClient.listFlowPolicies.mockRejectedValue(new Error('Network error'));

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME,
      arguments: { applicationId: 'app-123' },
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from list_application_flow_policies as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowPoliciesClient.listFlowPolicies.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME,
      arguments: { applicationId: 'app-123' },
    });

    expect(result.isError).toBe(true);
  });

  // --- describe_application_flow_policy tool ---

  it('should return flow policy details from describe_application_flow_policy', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockFlowPolicy = { id: 'fp-123', name: 'Test Flow Policy' };
    mockFlowPoliciesClient.describeFlowPolicy.mockResolvedValue(mockFlowPolicy);

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME,
      arguments: { applicationId: 'app-123', flowPolicyId: 'fp-123' },
    });

    expect(mockFlowPoliciesClient.describeFlowPolicy).toHaveBeenCalledWith('app-123', 'fp-123');
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockFlowPolicy) }]);
  });

  it('should return an error when describe_application_flow_policy fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowPoliciesClient.describeFlowPolicy.mockRejectedValue(new Error('Not found'));

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME,
      arguments: { applicationId: 'app-123', flowPolicyId: 'invalid-fp' },
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from describe_application_flow_policy as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFlowPoliciesClient.describeFlowPolicy.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME,
      arguments: { applicationId: 'app-123', flowPolicyId: 'fp-123' },
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
    registerFlowPoliciesTools(server, { auth: mockAuth }, mockAuthManager, verboseLogger);

    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.LIST_APPLICATION_FLOW_POLICIES.NAME}`,
    );
    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_APPLICATION_FLOW_POLICY.NAME}`,
    );
  });
});
