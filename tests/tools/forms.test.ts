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
import { registerFormTools } from '../../src/tools/forms.js';
import { McpServerConfig } from '../../src/types/index.js';
import { MCP_TOOLS } from '../../src/utils/constants.js';
import { AuthManager } from '../../src/modules/auth/manager.js';
import { Logger } from '../../src/utils/logger.js';

vi.mock('../../src/modules/auth/clients/forms.js', () => {
  const mockListForms = vi.fn();
  const mockDescribeForm = vi.fn();
  return {
    FormsClient: class {
      listForms = mockListForms;
      describeForm = mockDescribeForm;
    },
  };
});

import { FormsClient } from '../../src/modules/auth/clients/forms.js';

const mockAuth = {
  clientId: 'test-client-id',
  environmentId: 'test-env-id',
  rootDomain: 'pingidentity.com',
};

describe('registerFormTools', () => {
  let server: McpServer;
  let client: Client;
  let mockAuthManager: AuthManager;
  let logger: Logger;
  let mockFormsClient: {
    listForms: ReturnType<typeof vi.fn>;
    describeForm: ReturnType<typeof vi.fn>;
  };
  let consoleSpy: ReturnType<typeof vi.fn>;

  async function setupServerAndClient(config: McpServerConfig) {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerFormTools(server, config, mockAuthManager, logger);

    mockFormsClient = new FormsClient(mockAuthManager) as unknown as typeof mockFormsClient;

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

    expect(names).toContain(MCP_TOOLS.LIST_FORMS.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_FORM.NAME);
  });

  it('should register only list_forms when describe_form is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.DESCRIBE_FORM.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain(MCP_TOOLS.LIST_FORMS.NAME);
    expect(names).not.toContain(MCP_TOOLS.DESCRIBE_FORM.NAME);
  });

  it('should register only describe_form when list_forms is excluded', async () => {
    await setupServerAndClient({
      auth: mockAuth,
      excludeTools: [MCP_TOOLS.LIST_FORMS.NAME],
    });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain(MCP_TOOLS.LIST_FORMS.NAME);
    expect(names).toContain(MCP_TOOLS.DESCRIBE_FORM.NAME);
  });

  it('should register no tools when both are excluded', () => {
    const registerToolSpy = vi.fn();
    server = new McpServer({ name: 'test', version: '0.0.1' });
    server.registerTool = registerToolSpy;
    registerFormTools(
      server,
      {
        auth: mockAuth,
        excludeTools: [MCP_TOOLS.LIST_FORMS.NAME, MCP_TOOLS.DESCRIBE_FORM.NAME],
      },
      mockAuthManager,
      logger,
    );

    expect(registerToolSpy).not.toHaveBeenCalled();
  });

  // --- list_forms tool ---

  it('should return forms from list_forms', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockData = [{ id: 'form-1' }, { id: 'form-2' }];
    mockFormsClient.listForms.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_FORMS.NAME,
    });

    expect(mockFormsClient.listForms).toHaveBeenCalled();
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockData) }]);
  });

  it('should return an error when list_forms fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFormsClient.listForms.mockRejectedValue(new Error('Network error'));

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_FORMS.NAME,
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from list_forms as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFormsClient.listForms.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.LIST_FORMS.NAME,
    });

    expect(result.isError).toBe(true);
  });

  // --- describe_form tool ---

  it('should return form details from describe_form', async () => {
    await setupServerAndClient({ auth: mockAuth });
    const mockForm = { id: 'form-123', name: 'Test Form' };
    mockFormsClient.describeForm.mockResolvedValue(mockForm);

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_FORM.NAME,
      arguments: { formId: 'form-123' },
    });

    expect(mockFormsClient.describeForm).toHaveBeenCalledWith('form-123');
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockForm) }]);
  });

  it('should return an error when describe_form fails with generic error', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFormsClient.describeForm.mockRejectedValue(new Error('Not found'));

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_FORM.NAME,
      arguments: { formId: 'invalid-form' },
    });

    expect(result.isError).toBe(true);
  });

  it('should rethrow McpError from describe_form as-is', async () => {
    await setupServerAndClient({ auth: mockAuth });
    mockFormsClient.describeForm.mockRejectedValue(
      new McpError(ErrorCode.InternalError, 'Auth failed'),
    );

    const result = await client.callTool({
      name: MCP_TOOLS.DESCRIBE_FORM.NAME,
      arguments: { formId: 'form-123' },
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
    registerFormTools(server, { auth: mockAuth }, mockAuthManager, verboseLogger);

    expect(debugSpy).toHaveBeenCalledWith(`[Tools] Registering tool: ${MCP_TOOLS.LIST_FORMS.NAME}`);
    expect(debugSpy).toHaveBeenCalledWith(
      `[Tools] Registering tool: ${MCP_TOOLS.DESCRIBE_FORM.NAME}`,
    );
  });
});
