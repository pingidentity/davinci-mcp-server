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
  LIST_APPLICATIONS: {
    NAME: 'list_applications',
    DESCRIPTION:
      'Returns a list of all DaVinci applications. Use for discovery and finding application IDs. Use list_application_flow_policies for policy details.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_APPLICATION: {
    NAME: 'describe_application',
    DESCRIPTION:
      'Returns details of a single DaVinci application by ID. Use when the application ID is already known. Call list_applications first to find the ID.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_APPLICATION_FLOW_POLICIES: {
    NAME: 'list_application_flow_policies',
    DESCRIPTION:
      'Returns all flow policies for a DaVinci application. Use to see which flows are attached to an application and their status. Call list_applications first to find the application ID.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_APPLICATION_FLOW_POLICY: {
    NAME: 'describe_application_flow_policy',
    DESCRIPTION:
      'Returns details of a single flow policy for a DaVinci application. Call list_applications then list_application_flow_policies first to find the required IDs.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_VARIABLES: {
    NAME: 'list_variables',
    DESCRIPTION:
      'Returns a list of all DaVinci variables. Use for discovery and finding variable IDs. Results are paginated.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_VARIABLE: {
    NAME: 'describe_variable',
    DESCRIPTION:
      'Returns details of a single DaVinci variable by ID. Call list_variables first to find the ID.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_FORMS: {
    NAME: 'list_forms',
    DESCRIPTION:
      'Returns a list of all DaVinci forms. Use for discovery and finding form IDs. Use describe_form for field-level details.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_FORM: {
    NAME: 'describe_form',
    DESCRIPTION:
      'Returns full configuration of a single DaVinci form including fields and layout. Call list_forms first to find the ID.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_CONNECTORS: {
    NAME: 'list_connectors',
    DESCRIPTION:
      'Returns a list of all available DaVinci connector types from the catalog. Use for discovery and finding connector IDs. Use list_connector_instances for deployed instances; use get_connector_details for capabilities and properties.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_CONNECTOR: {
    NAME: 'describe_connector',
    DESCRIPTION:
      'Returns the full details of a single DaVinci connector type by ID, including metadata, capabilities, configurable properties, and required credentials. Call list_connectors first to find the ID.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_CONNECTOR_INSTANCES: {
    NAME: 'list_connector_instances',
    DESCRIPTION:
      'Returns a list of all deployed DaVinci connector instances in the environment. Use for discovery and finding instance IDs. Do not confuse with list_connectors which returns the connector catalog.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_CONNECTOR_INSTANCE: {
    NAME: 'describe_connector_instance',
    DESCRIPTION:
      'Returns details of a single deployed DaVinci connector instance by ID. Call list_connector_instances first to find the ID.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_FLOWS: {
    NAME: 'list_flows',
    DESCRIPTION:
      'Returns a list of all DaVinci flows. Use for discovery, finding flow IDs, and checking deployed vs draft status. Use describe_flow for full node-level graph details.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_FLOW: {
    NAME: 'describe_flow',
    DESCRIPTION:
      "Returns the complete definition of a DaVinci flow including the full node graph, edges, and settings. Use when auditing or understanding a flow's internal logic. Call list_flows first to find the ID.",
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_FLOW_VERSIONS: {
    NAME: 'list_flow_versions',
    DESCRIPTION:
      'Returns all versions of a specific DaVinci flow. Use to browse version history or find a version ID before reverting or exporting. Call list_flows first to find the flow ID.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_FLOW_VERSION: {
    NAME: 'describe_flow_version',
    DESCRIPTION:
      'Returns the complete definition of a specific DaVinci flow version, including the full node graph, edges, settings, and trigger configuration. Use when you need to inspect or compare a historical version of a flow. Call list_flows then list_flow_versions first to find the required IDs.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  VALIDATE_FLOW: {
    NAME: 'validate_flow',
    DESCRIPTION:
      'Validates a DaVinci flow configuration using the DVLinter validation engine. Use this tool to check deployment readiness, identify configuration errors and warnings (best-practice violations), and troubleshoot flow issues. Analyzes nodes (connectors and capabilities), connections (connector instances), node properties, and overall structure. Returns validation results including error counts or warning counts, and specific issue descriptions. Error locations: (1) `linterError` property within each node in graphData.elements.nodes for node specific issues (2) `allLinterErrors` property in graphData for all flow-level errors and warnings. Zero errors indicates deployment-ready status. This is a read-only operation that does not modify the flow. Use list_flows to obtain the flow ID if needed.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_FLOW_EXECUTIONS: {
    NAME: 'list_flow_executions',
    DESCRIPTION:
      'Returns a list of all executions for a specific DaVinci flow over the past 30 days. Use this tool to find execution IDs for troubleshooting, debugging, or monitoring flow runs. Supports filtering by `transactionId` to track specific execution. Use list_flows to obtain the flow ID if needed.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  SUMMARIZE_FLOW_EXECUTION: {
    NAME: 'summarize_flow_execution',
    DESCRIPTION:
      'Returns detailed information about a specific DaVinci flow execution including execution status (success/failure), start and end times, input and output data, error messages and stack traces, and user context. Use this tool to answer why a flow execution failed, summarize flow execution results, debug specific flow runs, verify data transformations, analyze flow execution behavior, and investigate user-specific issues. Use list_flows to obtain the flow ID, then list_flow_executions to find the execution ID, if needed.',
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

export const AUTH_PORT = 7474;
export const REDIRECT_URI = `http://127.0.0.1:${AUTH_PORT}/callback`;
export const AUTH_TIMEOUT_MS = 300_000;
export const AUTH_CODE_MAX_LENGTH = 2048;

export const OS_KEYCHAIN = {
  SERVICE_NAME: 'davinci-mcp-server',
  ACCOUNT_NAME: 'davinci-tokens',
} as const;
