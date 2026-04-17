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
import { CLI_ARG_OPTIONS, MCP_TOOLS, type ToolName } from '../utils/constants.js';

const TOOL_BY_NAME = new Map(Object.values(MCP_TOOLS).map((tool) => [tool.NAME, tool]));

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
 * Supported CLI flags:
 * - `--include-collections <list>` — Comma-separated collection names to include.
 * - `--exclude-collections <list>` — Comma-separated collection names to exclude.
 * - `--include-tools <list>` — Comma-separated tool names to include.
 * - `--exclude-tools <list>` — Comma-separated tool names to exclude.
 * - `--verbose` — Enable verbose logging to stderr.
 * - `--logout` — Trigger logout flow on startup.
 *
 * @returns A {@link McpServerConfig} object populated from CLI arguments.
 */
export const getCliConfig = (): McpServerConfig => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      [CLI_ARG_OPTIONS.INCLUDE_COLLECTIONS]: { type: 'string' },
      [CLI_ARG_OPTIONS.EXCLUDE_COLLECTIONS]: { type: 'string' },
      [CLI_ARG_OPTIONS.INCLUDE_TOOLS]: { type: 'string' },
      [CLI_ARG_OPTIONS.EXCLUDE_TOOLS]: { type: 'string' },
      [CLI_ARG_OPTIONS.VERBOSE]: { type: 'boolean' },
      [CLI_ARG_OPTIONS.LOGOUT]: { type: 'boolean' },
    } as const,
    strict: false,
  });

  return {
    includeCollections: splitAndTrim(values[CLI_ARG_OPTIONS.INCLUDE_COLLECTIONS]),
    excludeCollections: splitAndTrim(values[CLI_ARG_OPTIONS.EXCLUDE_COLLECTIONS]),
    includeTools: splitAndTrim(values[CLI_ARG_OPTIONS.INCLUDE_TOOLS]),
    excludeTools: splitAndTrim(values[CLI_ARG_OPTIONS.EXCLUDE_TOOLS]),
    verbose: !!values[CLI_ARG_OPTIONS.VERBOSE],
    logout: !!values[CLI_ARG_OPTIONS.LOGOUT],
  };
};

/**
 * Creates a tool filter function based on the provided server configuration.
 *
 * The returned function determines whether a given tool should be registered,
 * based on collection-level and tool-level include/exclude rules.
 *
 * **Filtering precedence:**
 * 1. If `includeCollections` is set, only tools belonging to those collections pass.
 *    Otherwise, if `excludeCollections` is set, tools in those collections are rejected.
 * 2. If `includeTools` is set, only explicitly listed tool names pass.
 *    Otherwise, if `excludeTools` is set, listed tool names are rejected.
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
  config: McpServerConfig = {},
): ((toolName: ToolName) => boolean) => {
  const inclCols = new Set(config.includeCollections);
  const exclCols = new Set(config.excludeCollections);
  const inclTools = new Set(config.includeTools);
  const exclTools = new Set(config.excludeTools);

  const hasCollectionFilter = inclCols.size > 0 || exclCols.size > 0;
  const hasToolFilter = inclTools.size > 0 || exclTools.size > 0;

  // No filters active — every tool is included
  if (!hasCollectionFilter && !hasToolFilter) return () => true;

  return (toolName: ToolName): boolean => {
    const toolCollections = TOOL_BY_NAME.get(toolName)?.COLLECTION_NAMES ?? [];

    // Collection-based filtering (include takes precedence over exclude)
    if (inclCols.size > 0) {
      if (!toolCollections.some((c) => inclCols.has(c))) return false;
    } else if (exclCols.size > 0) {
      if (toolCollections.some((c) => exclCols.has(c))) return false;
    }

    // Tool-based filtering (include takes precedence over exclude)
    if (inclTools.size > 0) return inclTools.has(toolName);
    if (exclTools.size > 0) return !exclTools.has(toolName);
    return true;
  };
};
