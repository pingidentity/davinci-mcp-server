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

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { getCliConfig, createToolFilter } from '../../src/configs/settings.js';
import { TOOL_NAMES, COLLECTION_NAMES } from '../../src/utils/constants.js';
import type { ToolName } from '../../src/utils/constants.js';

describe('createToolFilter', () => {
  it('should include all tools when no filters are set', () => {
    const filter = createToolFilter({});
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(true);
  });

  it('should include all tools when config is undefined', () => {
    const filter = createToolFilter();
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(true);
  });

  // --- includeTools ---

  it('should include only tools listed in includeTools', () => {
    const filter = createToolFilter({
      includeTools: ['list_flows'],
    });
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(true);
    expect(filter('nonexistent_tool' as ToolName)).toBe(false);
  });

  it('should exclude tool not in includeTools', () => {
    const filter = createToolFilter({
      includeTools: ['describe_flow'],
    });
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(false);
  });

  // --- excludeTools ---

  it('should exclude only tools listed in excludeTools', () => {
    const filter = createToolFilter({
      excludeTools: ['list_flows'],
    });
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(false);
  });

  it('should include tools not in excludeTools', () => {
    const filter = createToolFilter({
      excludeTools: ['describe_flow'],
    });
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(true);
  });

  // --- excludeTools takes precedence over includeTools ---

  it('should give excludeTools precedence over includeTools', () => {
    const filter = createToolFilter({
      includeTools: ['list_flows'],
      excludeTools: ['list_flows'],
    });
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(false);
  });

  // --- includeCollections ---

  it('should include tools belonging to included collections', () => {
    const filter = createToolFilter({
      includeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
    });
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(true);
  });

  it('should exclude tools not in included collections', () => {
    const filter = createToolFilter({
      includeCollections: ['nonexistent_collection'],
    });
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(false);
  });

  // --- excludeCollections ---

  it('should exclude tools belonging to excluded collections', () => {
    const filter = createToolFilter({
      excludeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
    });
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(false);
  });

  // --- excludeCollections takes precedence over includeCollections ---

  it('should give excludeCollections precedence over includeCollections', () => {
    const filter = createToolFilter({
      includeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
      excludeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
    });
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(false);
  });

  // --- Combined: collection + tool filters ---

  it('should apply both collection and tool filters together', () => {
    const filter = createToolFilter({
      includeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
      includeTools: ['list_flows'],
    });
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(true);
    expect(filter('nonexistent_tool' as ToolName)).toBe(false);
  });

  it('should reject tool that passes collection filter but fails tool filter', () => {
    const filter = createToolFilter({
      includeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
      excludeTools: ['list_flows'],
    });
    expect(filter(TOOL_NAMES.LIST_FLOWS)).toBe(false);
  });
});

describe('getCliConfig', () => {
  const savedEnv: Record<string, string | undefined> = {};
  const envKeys = [
    'AUTHORIZATION_CODE_CLIENT_ID',
    'DAVINCI_MCP_ENVIRONMENT_ID',
    'ROOT_DOMAIN',
    'CUSTOM_DOMAIN',
  ];
  const savedArgv = process.argv;

  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`process.exit: ${code}`);
    }) as unknown as never;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.argv = savedArgv;
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  function setRequiredEnv() {
    process.env.AUTHORIZATION_CODE_CLIENT_ID = 'test-client-id';
    process.env.DAVINCI_MCP_ENVIRONMENT_ID = 'test-env-id';
    process.env.ROOT_DOMAIN = 'pingidentity.com';
  }

  it('should exit with 0 and print help when no arguments are passed', () => {
    process.argv = ['node', 'index.js'];
    expect(() => getCliConfig()).toThrow('process.exit: 0');
    expect(process.exit).toHaveBeenCalledWith(0);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  it('should exit with 0 and print help when --help is passed', () => {
    process.argv = ['node', 'index.js', '--help'];
    expect(() => getCliConfig()).toThrow('process.exit: 0');
    expect(process.exit).toHaveBeenCalledWith(0);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  it('should exit with 0 and print help when "start" and --help are passed together', () => {
    process.argv = ['node', 'index.js', 'start', '--help'];
    expect(() => getCliConfig()).toThrow('process.exit: 0');
    expect(process.exit).toHaveBeenCalledWith(0);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  it('should exit with 1 and print error when an unrecognized command is passed', () => {
    process.argv = ['node', 'index.js', 'invalid-command'];
    expect(() => getCliConfig()).toThrow('process.exit: 1');
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error: Unknown command "invalid-command"'),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Run with --help for more information.'),
    );
  });

  it('should exit with 1 and print error when an unknown flag is passed', () => {
    process.argv = ['node', 'index.js', 'start', '--unknown-flag'];
    expect(() => getCliConfig()).toThrow('process.exit: 1');
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error: Unknown option'));
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Run with --help for more information.'),
    );
  });

  it('should exit with 1 when start is passed but environment variables are missing', () => {
    process.argv = ['node', 'index.js', 'start'];
    for (const key of envKeys) {
      delete process.env[key];
    }
    expect(() => getCliConfig()).toThrow('process.exit: 1');
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error: Missing required environment variables'),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Run with --help for more information.'),
    );
  });

  it('should list all missing variables in the error message', () => {
    process.argv = ['node', 'index.js', 'start'];
    for (const key of envKeys) {
      delete process.env[key];
    }
    expect(() => getCliConfig()).toThrow('process.exit: 1');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringMatching(
        /AUTHORIZATION_CODE_CLIENT_ID.*DAVINCI_MCP_ENVIRONMENT_ID.*ROOT_DOMAIN/,
      ),
    );
  });

  it('should not exit when start command and all required variables are set', () => {
    process.argv = ['node', 'index.js', 'start'];
    setRequiredEnv();
    expect(() => getCliConfig()).not.toThrow();
  });

  it('should populate auth config from environment variables when start is used', () => {
    process.argv = ['node', 'index.js', 'start'];
    setRequiredEnv();
    const config = getCliConfig();
    expect(config.auth).toEqual(
      expect.objectContaining({
        clientId: 'test-client-id',
        environmentId: 'test-env-id',
        rootDomain: 'pingidentity.com',
      }),
    );
  });
});
