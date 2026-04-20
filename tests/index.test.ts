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

/// <reference types="node" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockClose = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn().mockResolvedValue(undefined);

let mockConfig = {
  includeCollections: [] as string[],
  excludeCollections: [] as string[],
  includeTools: [] as string[],
  excludeTools: [] as string[],
  verbose: false,
  logout: false,
  auth: {
    clientId: 'test-client-id',
    environmentId: 'test-env-id',
    rootDomain: 'pingidentity.com',
  },
};

vi.mock('../src/modules/server.js', () => ({
  DavinciMcpServer: vi.fn().mockImplementation(function () {
    return {
      close: mockClose,
      connect: mockConnect,
      getLogger: vi.fn().mockReturnValue({
        info: (msg: string, ...args: unknown[]) => {
          if (mockConfig.verbose) console.error(`[INFO] ${msg}`, ...args);
        },
        warn: (msg: string, ...args: unknown[]) => console.error(`[WARN] ${msg}`, ...args),
        error: (msg: string, ...args: unknown[]) => console.error(`[ERROR] ${msg}`, ...args),
        debug: (msg: string, ...args: unknown[]) => {
          if (mockConfig.verbose) console.error(`[DEBUG] ${msg}`, ...args);
        },
      }),
    };
  }),
}));

vi.mock('../src/configs/settings.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/configs/settings.js')>();
  return {
    ...actual,
    getCliConfig: vi.fn(() => mockConfig),
  };
});

describe('davinci-mcp-server', () => {
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  const registeredListeners: { event: string; fn: (...args: unknown[]) => void }[] = [];
  const originalOn = process.on.bind(process);
  const originalStdinOn = process.stdin.on.bind(process.stdin);

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockConfig = {
      includeCollections: [],
      excludeCollections: [],
      includeTools: [],
      excludeTools: [],
      verbose: false,
      logout: false,
      auth: {
        clientId: 'test-client-id',
        environmentId: 'test-env-id',
        rootDomain: 'pingidentity.com',
      },
    };
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Track listeners added by the module so we can clean them up
    vi.spyOn(process, 'on').mockImplementation(
      (event: string | symbol, fn: (...args: unknown[]) => void) => {
        registeredListeners.push({ event: String(event), fn });
        return originalOn(event as string, fn);
      },
    );
    vi.spyOn(process.stdin, 'on').mockImplementation(
      (event: string | symbol, fn: (...args: unknown[]) => void) => {
        registeredListeners.push({ event: `stdin:${String(event)}`, fn });
        return originalStdinOn(event as string, fn);
      },
    );
  });

  afterEach(() => {
    // Remove all listeners added during this test
    for (const { event, fn } of registeredListeners) {
      if (event.startsWith('stdin:')) {
        process.stdin.removeListener(event.slice(6), fn);
      } else {
        process.removeListener(event, fn);
      }
    }
    registeredListeners.length = 0;
    processExitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should export a server instance', async () => {
    const { server } = await import('../src/index.js');
    expect(server).toBeDefined();
    expect(server.connect).toBeDefined();
    expect(server.close).toBeDefined();
  });

  it('should call server.connect() on startup', async () => {
    await import('../src/index.js');
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('should create the server with parsed CLI config', async () => {
    const { DavinciMcpServer } = await import('../src/modules/server.js');
    await import('../src/index.js');
    expect(DavinciMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        verbose: false,
        logout: false,
      }),
    );
  });

  // --- cleanup() tests ---

  it('should call server.close() and process.exit() during cleanup via SIGINT', async () => {
    await import('../src/index.js');
    process.emit('SIGINT');
    await vi.waitFor(() => {
      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(processExitSpy).toHaveBeenCalled();
    });
  });

  it('should call server.close() and process.exit() during cleanup via SIGTERM', async () => {
    await import('../src/index.js');
    process.emit('SIGTERM');
    await vi.waitFor(() => {
      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(processExitSpy).toHaveBeenCalled();
    });
  });

  it('should log shutdown message when verbose is enabled', async () => {
    mockConfig.verbose = true;
    await import('../src/index.js');
    process.emit('SIGINT');
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Shutting down DaVinci MCP server...');
      expect(processExitSpy).toHaveBeenCalled();
    });
  });

  it('should not log shutdown message when verbose is disabled', async () => {
    await import('../src/index.js');
    process.emit('SIGINT');
    await vi.waitFor(() => {
      expect(processExitSpy).toHaveBeenCalled();
    });
    expect(consoleSpy).not.toHaveBeenCalledWith('[INFO] Shutting down DaVinci MCP server...');
  });

  it('should still call process.exit() when server.close() throws', async () => {
    mockClose.mockRejectedValueOnce(new Error('close failed'));
    await import('../src/index.js');
    process.emit('SIGINT');
    await vi.waitFor(() => {
      expect(processExitSpy).toHaveBeenCalled();
    });
  });

  it('should log close error when verbose is enabled and server.close() throws', async () => {
    mockConfig.verbose = true;
    const error = new Error('close failed');
    mockClose.mockRejectedValueOnce(error);
    await import('../src/index.js');
    process.emit('SIGINT');
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Error during shutdown:', error);
      expect(processExitSpy).toHaveBeenCalled();
    });
  });

  // --- server.connect() failure ---

  it('should log fatal error and cleanup when connect() rejects', async () => {
    const connectError = new Error('connection failed');
    mockConnect.mockRejectedValueOnce(connectError);
    await import('../src/index.js');
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Fatal error during startup:', connectError);
      expect(processExitSpy).toHaveBeenCalled();
    });
  });
});
