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

import { parseArgs } from 'node:util';
import { McpServerConfig } from '../types/index.js';
import { CLI_ARG_OPTIONS, HELP_TEXT, MCP_TOOLS, type ToolName } from '../utils/constants.js';

const TOOLS_BY_NAME = new Map(Object.values(MCP_TOOLS).map((tool) => [tool.NAME, tool]));

/**
 * Splits a comma-separated string into an array of trimmed, non-empty values.
 * Returns an empty array if the input is not a string (e.g. `boolean` or `undefined`).
 *
 * @param val - The raw CLI argument value to split.
 * @returns An array of trimmed strings, or an empty array.
 *
 * @example
 * splitAndTrim("foo, bar, baz") // ["foo", "bar", "baz"]
 * splitAndTrim(undefined)        // []
 */
const splitAndTrim = (val: string | boolean | undefined): string[] =>
  typeof val === 'string'
    ? val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

/**
 * Parses command-line arguments and returns the MCP server configuration.
 *
 * If the --help flag is provided or no command is specified, the help message
 * is printed and the process exits with code 0.
 *
 * If an unknown command is provided, an error message is printed and the
 * process exits with code 1.
 *
 * If required environment variables are missing when starting the server,
 * an error message is printed and the process exits with code 1.
 *
 * Supported CLI flags:
 * - `--include-collections <list>` — Comma-separated collection names to include.
 * - `--exclude-collections <list>` — Comma-separated collection names to exclude.
 * - `--include-tools <list>` — Comma-separated tool names to include.
 * - `--exclude-tools <list>` — Comma-separated tool names to exclude.
 * - `--verbose` — Enable verbose logging to stderr.
 * - `--logout` — Trigger logout flow on startup.
 * - `--help` — Show help message.
 *
 * @returns A {@link McpServerConfig} object populated from CLI arguments.
 */
export const getCliConfig = (): McpServerConfig => {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        [CLI_ARG_OPTIONS.INCLUDE_COLLECTIONS]: { type: 'string' },
        [CLI_ARG_OPTIONS.EXCLUDE_COLLECTIONS]: { type: 'string' },
        [CLI_ARG_OPTIONS.INCLUDE_TOOLS]: { type: 'string' },
        [CLI_ARG_OPTIONS.EXCLUDE_TOOLS]: { type: 'string' },
        [CLI_ARG_OPTIONS.VERBOSE]: { type: 'boolean' },
        [CLI_ARG_OPTIONS.LOGOUT]: { type: 'boolean' },
        [CLI_ARG_OPTIONS.HELP]: { type: 'boolean' },
      } as const,
      strict: true,
      allowPositionals: true,
    });
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Run with --help for more information.');
    process.exit(1);
  }

  const { values, positionals } = parsed;
  const isHelpRequested = !!values[CLI_ARG_OPTIONS.HELP];
  const command = positionals[0];

  if (isHelpRequested || !command) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (command !== 'start') {
    console.error(`Error: Unknown command "${command}"`);
    console.error('Run with --help for more information.');
    process.exit(1);
  }

  const verbose = !!values[CLI_ARG_OPTIONS.VERBOSE];

  const clientId = process.env.AUTHORIZATION_CODE_CLIENT_ID;
  const environmentId = process.env.DAVINCI_MCP_ENVIRONMENT_ID;
  const rootDomain = process.env.ROOT_DOMAIN;

  const missingVars: string[] = [];
  if (!clientId) missingVars.push('AUTHORIZATION_CODE_CLIENT_ID');
  if (!environmentId) missingVars.push('DAVINCI_MCP_ENVIRONMENT_ID');
  if (!rootDomain) missingVars.push('ROOT_DOMAIN');

  if (missingVars.length > 0) {
    console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Run with --help for more information.');
    process.exit(1);
  }

  return {
    includeCollections: splitAndTrim(values[CLI_ARG_OPTIONS.INCLUDE_COLLECTIONS]),
    excludeCollections: splitAndTrim(values[CLI_ARG_OPTIONS.EXCLUDE_COLLECTIONS]),
    includeTools: splitAndTrim(values[CLI_ARG_OPTIONS.INCLUDE_TOOLS]),
    excludeTools: splitAndTrim(values[CLI_ARG_OPTIONS.EXCLUDE_TOOLS]),
    verbose,
    logout: !!values[CLI_ARG_OPTIONS.LOGOUT],
    auth: {
      clientId: clientId!,
      environmentId: environmentId!,
      rootDomain: rootDomain!,
      customDomain: process.env.CUSTOM_DOMAIN,
    },
  };
};

/**
 * Creates a tool filter function based on the provided server configuration.
 *
 * The returned function determines whether a given tool should be registered,
 * based on collection-level and tool-level include/exclude rules.
 *
 * **Filtering precedence:**
 * 1. If `excludeCollections` is set, tools belonging to those collections are rejected.
 *    Otherwise, if `includeCollections` is set, only tools in those collections pass.
 * 2. If `excludeTools` is set, listed tool names are rejected.
 *    Otherwise, if `includeTools` is set, only explicitly listed tool names pass.
 * 3. If no filters are active, a no-op function returning `true` is returned for
 *    optimal performance (avoids per-tool checks entirely).
 *
 * Filter arrays are converted to `Set`s internally for O(1) lookups.
 *
 * @param config - The server configuration containing filter lists. Defaults to `{}`.
 * @returns A predicate function `(toolName: ToolName) => boolean` that returns
 *          `true` if the tool should be included, `false` otherwise.
 *
 * @example
 * const isIncluded = createToolFilter({ includeTools: ["list_flows", "describe_flow"] });
 * isIncluded("list_flows");    // true
 * isIncluded("list_variables"); // false
 */
export const createToolFilter = (
  config: Partial<McpServerConfig> = {},
): ((toolName: ToolName) => boolean) => {
  const includeCollections = new Set(config.includeCollections);
  const excludeCollections = new Set(config.excludeCollections);
  const includeTools = new Set(config.includeTools);
  const excludeTools = new Set(config.excludeTools);

  const hasCollectionFilter = includeCollections.size > 0 || excludeCollections.size > 0;
  const hasToolFilter = includeTools.size > 0 || excludeTools.size > 0;

  // No filters active — every tool is included
  if (!hasCollectionFilter && !hasToolFilter) return () => true;

  return (toolName: ToolName): boolean => {
    const toolCollections = TOOLS_BY_NAME.get(toolName)?.COLLECTION_NAMES ?? [];

    // Collection-based filtering (exclude takes precedence over include)
    if (excludeCollections.size > 0) {
      if (toolCollections.some((c) => excludeCollections.has(c))) return false;
    } else if (includeCollections.size > 0) {
      if (!toolCollections.some((c) => includeCollections.has(c))) return false;
    }

    // Tool-based filtering (exclude takes precedence over include)
    if (excludeTools.size > 0) return !excludeTools.has(toolName);
    if (includeTools.size > 0) return includeTools.has(toolName);
    return true;
  };
};
