import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from '../../src/tools/index.js';

describe('registerAllTools', () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.1' });
  });

  it('should register tools when no filters are set', () => {
    const spy = vi.spyOn(server, 'registerTool');
    registerAllTools(server, {});
    expect(spy).toHaveBeenCalled();
  });

  it('should log when verbose is enabled', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerAllTools(server, { verbose: true });
    expect(consoleSpy).toHaveBeenCalledWith('[Tools] Tool registration complete.');
    consoleSpy.mockRestore();
  });

  it('should not log when verbose is disabled', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerAllTools(server, {});
    expect(consoleSpy).not.toHaveBeenCalledWith('[Tools] Tool registration complete.');
    consoleSpy.mockRestore();
  });
});
