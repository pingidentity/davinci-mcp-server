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

export const MCP_SERVER_NAME = 'davinci-mcp-server';
export const MCP_SERVER_VERSION = '0.1.0';

/**
 * CLI argument option keys.
 *
 * Maps logical option names to their kebab-case CLI flag equivalents
 * (e.g. `INCLUDE_COLLECTIONS` → `"include-collections"`).
 */
export const CLI_ARG_OPTIONS = {
  INCLUDE_COLLECTIONS: 'include-collections',
  EXCLUDE_COLLECTIONS: 'exclude-collections',
  INCLUDE_TOOLS: 'include-tools',
  EXCLUDE_TOOLS: 'exclude-tools',
  VERBOSE: 'verbose',
  LOGOUT: 'logout',
} as const;

/**
 * Available tool collection identifiers.
 *
 * Collections group related tools so they can be included or excluded
 * as a unit via `--include-collections` / `--exclude-collections`.
 */
export const COLLECTION_NAMES = {
  DAVINCI_ADMIN: 'davinci_admin',
} as const;

const DAVINCI_ADMIN_COLLECTIONS = [COLLECTION_NAMES.DAVINCI_ADMIN] as const;

/**
 * Registry of all MCP tools exposed by the DaVinci server.
 *
 * Each entry defines:
 * - `NAME` — The tool identifier used in MCP `tools/call` requests.
 * - `DESCRIPTION` — A human-readable summary shown to clients.
 * - `COLLECTION_NAMES` — The collections this tool belongs to, used for filtering.
 */
export const MCP_TOOLS = {
  HELLO_WORLD_TOOL: {
    NAME: 'hello_world',
    DESCRIPTION: 'A sample tool to print a hello world message',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
} as const;

/**
 * Derived map of tool keys to their runtime `NAME` values.
 *
 * Provides a convenient typed accessor, e.g. `TOOL_NAMES.LIST_FLOWS` → `"list_flows"`.
 */
export const TOOL_NAMES = Object.fromEntries(
  Object.entries(MCP_TOOLS).map(([key, { NAME }]) => [key, NAME]),
) as { [K in keyof typeof MCP_TOOLS]: (typeof MCP_TOOLS)[K]['NAME'] };

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];
