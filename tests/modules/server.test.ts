import { describe, it, expect, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { DavinciMcpServer } from '../../src/modules/server.js';

describe('DavinciMcpServer', () => {
  it('should create a server instance with default config', () => {
    const server = new DavinciMcpServer();
    expect(server).toBeDefined();
  });

  it('should create a server instance with custom config', () => {
    const server = new DavinciMcpServer({ verbose: true });
    expect(server).toBeDefined();
  });

  it('should connect via InMemoryTransport and list tools', async () => {
    const davinciServer = new DavinciMcpServer({});
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      davinciServer.connectWithTransport(serverTransport),
    ]);

    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some((t) => t.name === 'hello_world')).toBe(true);

    await client.close();
  });

  it('should execute the hello_world tool and return the message', async () => {
    const davinciServer = new DavinciMcpServer({});
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      davinciServer.connectWithTransport(serverTransport),
    ]);

    const result = await client.callTool({
      name: 'hello_world',
      arguments: { message: 'hello Ping' },
    });
    expect(result.content).toEqual([{ type: 'text', text: 'Message: hello Ping' }]);

    await client.close();
  });

  it('should exclude tools when config filters are set', async () => {
    const davinciServer = new DavinciMcpServer({
      includeTools: ['nonexistent_tool'],
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      davinciServer.connectWithTransport(serverTransport),
    ]);

    // hello_world is not in includeTools, so it should not be registered
    // With no tools registered, listTools throws Method not found
    await expect(client.listTools()).rejects.toThrow();

    await client.close();
  });

  it('should log on connect when verbose is enabled', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const davinciServer = new DavinciMcpServer({ verbose: true });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      davinciServer.connectWithTransport(serverTransport),
    ]);

    expect(consoleSpy).toHaveBeenCalledWith('DaVinci MCP server running on stdio');

    await client.close();
    consoleSpy.mockRestore();
  });

  it('should close gracefully', async () => {
    const davinciServer = new DavinciMcpServer({});
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      davinciServer.connectWithTransport(serverTransport),
    ]);

    await expect(davinciServer.close()).resolves.not.toThrow();
    await client.close();
  });
});
