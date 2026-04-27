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
import { registerVariableTools } from '../../src/tools/variables.js';
import { McpServerConfig } from '../../src/types/index.js';
import { MCP_TOOLS } from '../../src/utils/constants.js';
import { AuthManager } from '../../src/modules/auth/manager.js';
import { Logger } from '../../src/utils/logger.js';

vi.mock('../../src/modules/auth/clients/variables.js', () => {
  const mockListVariables = vi.fn();
  const mockDescribeVariable = vi.fn();
  return {
    VariablesClient: class {
      listVariables = mockListVariables;
      describeVariable = mockDescribeVariable;
    },
  };
});

import { VariablesClient } from '../../src/modules/auth/clients/variables.js';

const mockAuth = {
  clientId: 'test-client-id',
  environmentId: 'test-env-id',
  rootDomain: 'pingidentity.com',
};

describe('registerVariableTools', () => {
  let server: McpServer;
  let client: Client;
  let mockAuthManager: AuthManager;
  let logger: Logger;
  let mockVariablesClient: {
    listVariables: ReturnType<typeof vi.fn>;
    describeVariable: ReturnType<typeof vi.fn>;
  };
  let consoleSpy: ReturnType<typeof vi.fn>;

  async function setupServerAndClient(config: McpServerConfig) {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerVariableTools(server, config, mockAuthManager, logger);

    mockVariablesClient = new VariablesClient(
      mockAuthManager,
    ) as unknown as typeof mockVariablesClient;

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

    expect(names).toContain(MCP_TOOLS.LIST_VARIABLES.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_VARIABLE.NAME);
  });

  it('should register only list_variables when describe_variable is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.DESCRIBE_VARIABLE.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_VARIABLES.NAME);
    expect(names).not.toContain(MCP_TOOLS.DESCRIBE_VARIABLE.NAME);
  });

  it('should register only describe_variable when list_variables is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.LIST_VARIABLES.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain(MCP_TOOLS.LIST_VARIABLES.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_VARIABLE.NAME);
  });

  it('should register no tools when both are excluded', () => {
    const registerToolSpy = vi.fn();
    server = new McpServer({ name: 'test', version: '0.0.1' });
    server.registerTool = registerToolSpy;
    registerVariableTools(
      server,
      {
        auth: mockAuth,
        excludeTools: [MCP_TOOLS.LIST_VARIABLES.NAME, MCP_TOOLS.DESCRIBE_VARIABLE.NAME],
      },
      mockAuthManager,
      logger,
    );

    expect(registerToolSpy).not.toHaveBeenCalled();
  });

  // --- list_variables tool ---

  it('should return variables from list_variables', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockData = [{ id: 'var-1' }, { id: 'var-2' }];
    mockVariablesClient.listVariables.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_VARIABLES.NAME,
    });

    expect(mockVariablesClient.listVariables).toHaveBeenCalled();
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockData) }]);
  });

  it('should return an error when list_variables fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockVariablesClient.listVariables.mockRejectedValue(new Error('Network error'));

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_VARIABLES.NAME,
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from list_variables as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockVariablesClient.listVariables.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_VARIABLES.NAME,
    });

    expect(result.isError).toBe(true);
  });

  // --- describe_variable tool ---

  it('should return variable details from describe_variable', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockVariable = { id: 'var-123', name: 'Test Variable' };
    mockVariablesClient.describeVariable.mockResolvedValue(mockVariable);

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_VARIABLE.NAME,
      arguments: { variableId: 'var-123' },
    });

    expect(mockVariablesClient.describeVariable).toHaveBeenCalledWith('var-123');
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockVariable) }]);
  });

  it('should return an error when describe_variable fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockVariablesClient.describeVariable.mockRejectedValue(new Error('Not found'));

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_VARIABLE.NAME,
      arguments: { variableId: 'invalid-var' },
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from describe_variable as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockVariablesClient.describeVariable.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_VARIABLE.NAME,
      arguments: { variableId: 'var-123' },
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
    registerVariableTools(server, { auth: mockAuth }, mockAuthManager, verboseLogger);

    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.LIST_VARIABLES.NAME}`,
    );
    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_VARIABLE.NAME}`,
    );
  });
});
