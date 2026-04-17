import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCP_TOOLS } from '../../src/utils/constants.js';
import { registerHelloWorldTool } from '../../src/tools/helloworld.js';

describe('registerHelloWorldTool', () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.1' });
  });

  it('should register the hello_world tool when no filters exclude it', () => {
    const spy = vi.spyOn(server, 'registerTool');
    registerHelloWorldTool(server, {});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe(MCP_TOOLS.HELLO_WORLD_TOOL.NAME);
  });

  it('should not register the tool when excluded by excludeTools', () => {
    const spy = vi.spyOn(server, 'registerTool');
    registerHelloWorldTool(server, { excludeTools: ['hello_world'] });
    expect(spy).not.toHaveBeenCalled();
  });

  it('should not register the tool when not in includeTools', () => {
    const spy = vi.spyOn(server, 'registerTool');
    registerHelloWorldTool(server, { includeTools: ['list_flows'] });
    expect(spy).not.toHaveBeenCalled();
  });

  it('should register the tool when it is in includeTools', () => {
    const spy = vi.spyOn(server, 'registerTool');
    registerHelloWorldTool(server, { includeTools: ['hello_world'] });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
