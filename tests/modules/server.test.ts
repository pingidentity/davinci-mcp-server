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
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { DavinciMcpServer } from '../../src/modules/server.js';
import { AuthConfig } from '../../src/types/auth/manager.js';

const mockAuthConfig: AuthConfig = {
  clientId: 'test-client-id',
  environmentId: 'test-env-id',
  rootDomain: 'pingidentity.com',
};

// Mock AuthManager to avoid actual keychain or network calls
vi.mock('../../src/modules/auth/manager.js', () => {
  return {
    AuthManager: vi.fn().mockImplementation(function () {
      return {
        getTokens: vi
          .fn()
          .mockResolvedValue({ access_token: 'test-token', expires_at: Date.now() + 3600000 }),
        getLogger: vi.fn().mockReturnValue({
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        }),
        getRootDomain: vi.fn().mockReturnValue('pingidentity.com'),
        getEnvironmentId: vi.fn().mockReturnValue('test-env-id'),
        clearTokens: vi.fn().mockResolvedValue(undefined),
        login: vi
          .fn()
          .mockResolvedValue({ access_token: 'new-token', expires_at: Date.now() + 3600000 }),
      };
    }),
  };
});

// Mock FlowsClient
vi.mock('../../src/modules/auth/clients/flows.js', () => {
  return {
    FlowsClient: vi.fn().mockImplementation(function () {
      return {
        listFlows: vi.fn().mockResolvedValue([{ id: 'flow-1', name: 'Test Flow' }]),
      };
    }),
  };
});

describe('DavinciMcpServer', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create a server instance with custom config', () => {
    const server = new DavinciMcpServer({
      verbose: true,
      auth: mockAuthConfig,
    });
    expect(server).toBeDefined();
  });

  it('should connect via InMemoryTransport and list tools', async () => {
    const davinciServer = new DavinciMcpServer({
      auth: mockAuthConfig,
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      davinciServer.connectWithTransport(serverTransport),
    ]);

    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some((t) => t.name === 'list_flows')).toBe(true);

    await client.close();
  });

  it('should execute the list_flows tool and return results', async () => {
    const davinciServer = new DavinciMcpServer({
      auth: mockAuthConfig,
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      davinciServer.connectWithTransport(serverTransport),
    ]);

    const result = await client.callTool({
      name: 'list_flows',
      arguments: {},
    });

    const content = result.content as Array<{ type: 'text'; text: string }>;
    expect(JSON.parse(content[0].text)).toEqual([{ id: 'flow-1', name: 'Test Flow' }]);

    await client.close();
  });

  it('should exclude tools when config filters are set', async () => {
    const davinciServer = new DavinciMcpServer({
      auth: mockAuthConfig,
      includeTools: ['nonexistent_tool'],
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      davinciServer.connectWithTransport(serverTransport),
    ]);

    // list_flows is not in includeTools, so it should not be registered
    // With no tools registered, listTools throws Method not found
    await expect(client.listTools()).rejects.toThrow();

    await client.close();
  });

  it('should log on connect when verbose is enabled', async () => {
    const davinciServer = new DavinciMcpServer({
      verbose: true,
      auth: mockAuthConfig,
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      davinciServer.connectWithTransport(serverTransport),
    ]);

    // info logs are only shown if verbose is true
    expect(consoleSpy).toHaveBeenCalledWith('[INFO] DaVinci MCP server running on stdio');

    await client.close();
  });

  it('should close gracefully', async () => {
    const davinciServer = new DavinciMcpServer({
      auth: mockAuthConfig,
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      davinciServer.connectWithTransport(serverTransport),
    ]);

    await expect(davinciServer.close()).resolves.not.toThrow();
    await client.close();
  });

  it('should await logout before accepting connections when logout is true', async () => {
    const { AuthManager } = await import('../../src/modules/auth/manager.js');
    const davinciServer = new DavinciMcpServer({
      auth: mockAuthConfig,
      logout: true,
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      davinciServer.connectWithTransport(serverTransport),
    ]);

    const authInstance = vi.mocked(AuthManager).mock.results.at(-1)!.value;
    expect(authInstance.clearTokens).toHaveBeenCalled();

    await client.close();
  });
});
