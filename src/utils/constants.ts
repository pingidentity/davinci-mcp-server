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
    DESCRIPTION: `Returns all DaVinci applications in the environment. Each entry includes the 
                application ID, name, OAuth configuration (client secret, redirect URIs, logout URIs, 
                scopes, grant types, signed request enforcement, JWKS URLs), API key status and value, 
                and created/updated timestamps. Use when the user wants to discover available applications, 
                audit OAuth settings, check redirect or logout URIs, verify API key status, or find an 
                application ID before calling describe_application. Do NOT use when the user needs flow 
                policy details for an application — use list_application_flow_policies with the 
                application ID instead.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_APPLICATION: {
    NAME: 'describe_application',
    DESCRIPTION: `Returns the full details of a single DaVinci application by ID. The response 
                contains the same fields as list_applications (name, OAuth configuration including client 
                secret, redirect URIs, logout URIs, scopes, grant types, signed request enforcement and 
                JWKS URLs, API key status and value, and timestamps) but scoped to one application. 
                Prefer this over list_applications when the application ID is already known and only one 
                application is relevant. Do NOT use just to look up an application name or ID — 
                use list_applications for discovery. For flow policies attached to this application, 
                use list_application_flow_policies with the application ID.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_APPLICATION_FLOW_POLICIES: {
    NAME: 'list_application_flow_policies',
    DESCRIPTION: `Returns all flow policies for a specific DaVinci application by application ID. 
                Each policy includes its ID, name, status (enabled/disabled), trigger configuration 
                (type, subtype, PWD and MFA session settings), and flow distributions — the list of 
                flows assigned to this policy, each with a specific version pinned, a weight value, 
                success node references, and an IP allowlist per distribution. 
                Use when the user wants to see which flows are attached to an application, check policy 
                status, inspect trigger conditions, or review flow distribution configuration. 
                Requires an application ID — call list_applications first if unknown. For full details 
                of a single policy, use describe_application_flow_policy with both the application ID 
                and policy ID.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_APPLICATION_FLOW_POLICY: {
    NAME: 'describe_application_flow_policy',
    DESCRIPTION: `Returns the full details of a single flow policy for a DaVinci application by 
                  application ID and policy ID. The response contains the same fields as 
                  list_application_flow_policies (policy name, status, trigger configuration including 
                  PWD and MFA session settings, flow distributions with version, weight, success nodes, 
                  and IP allowlist, and timestamps) but scoped to one policy. Prefer this over 
                  list_application_flow_policies when both the application ID and policy ID are already 
                  known and only one policy is relevant. Requires both an application ID and a policy ID — 
                  call list_applications to find the application ID, then list_application_flow_policies 
                  to find the policy ID if unknown.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_VARIABLES: {
    NAME: 'list_variables',
    DESCRIPTION: `Returns all DaVinci variables in the environment. Each variable includes its ID, 
                name, display name, data type (e.g. array, string, number, boolean), context (scope), 
                current value, mutability flag (whether it can be modified at runtime), min/max 
                constraints, and an optional flow ID if the variable is scoped to a specific flow. 
                Results are paginated — the response includes a count, size, and a next link for 
                retrieving additional pages. Use when the user wants to discover variables, audit 
                their types or values, check mutability, find flow-scoped vs environment-scoped 
                variables, or look up a variable name before calling describe_variable. 
                Do NOT use when the user needs full details of a single known variable — 
                use describe_variable with the variable ID instead.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_VARIABLE: {
    NAME: 'describe_variable',
    DESCRIPTION: `Returns the full details of a single DaVinci variable by ID. The response contains 
                the same fields as list_variables (name, display name, data type, context/scope, current 
                value, mutability flag, min/max constraints, optional flow ID if flow-scoped, and 
                timestamps) but scoped to one variable. Prefer this over list_variables when the variable 
                ID is already known and only one variable is relevant. Note that current value is also 
                available in list_variables, so only call this when the ID is known and a single variable 
                is the focus. Requires a variable ID — call list_variables first if unknown.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_FORMS: {
    NAME: 'list_forms',
    DESCRIPTION:
      "Returns a summary list of all DaVinci forms in the environment (names, IDs, status). Use when the user asks what forms exist or wants to browse available forms. Follow up with describe_form to inspect a specific form's fields and configuration.",
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_FORM: {
    NAME: 'describe_form',
    DESCRIPTION:
      'Returns full configuration of a specific DaVinci form, including fields, layout, validation rules, and metadata. Requires a form ID — call list_forms first if unknown.',
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_CONNECTORS: {
    NAME: 'list_connectors',
    DESCRIPTION: `Returns all DaVinci connectors available in the environment from the connector 
                catalog. Each entry includes the connector ID, name, description, version, vendor, and 
                type (e.g. core, custom, partner). Use when the user wants to browse available connector 
                types, filter by vendor, or find a connector ID before calling describe_connector or 
                get_connector_details. Do NOT use for connector instances already configured in the 
                environment — use list_connector_instances instead. Do NOT use when the user needs 
                capabilities, properties, or configuration details of a connector — 
                use get_connector_details with the connector ID instead.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_CONNECTOR: {
    NAME: 'describe_connector',
    DESCRIPTION: `Returns the catalog details of a single DaVinci connector by ID. The response 
                contains the same fields as list_connectors (name, description, version, vendor, type, 
                and timestamps) but scoped to one connector. There are NO capabilities, properties, or 
                configuration details in this response — use get_connector_details for that. Prefer 
                list_connectors for discovery, and only use this when the connector ID is already known 
                and a lightweight confirmation of name, version, or vendor is needed for a single 
                connector. Requires a connector ID — call list_connectors first if unknown.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  GET_CONNECTOR_DETAILS: {
    NAME: 'get_connector_details',
    DESCRIPTION: `Returns the functional details of a specific DaVinci connector by ID, including 
                its full capabilities (the actions the connector can perform), configurable properties, 
                credential fields required for setup (credentialsView), account configuration layout 
                (accountConfigView), and flow section organization. This is the only tool that exposes 
                what a connector can actually do. Use when the user needs to understand a connector's 
                capabilities, required credentials, or configurable properties. Note this response does 
                NOT include basic identity fields like name, version, or vendor — combine with 
                describe_connector or list_connectors if those are also needed. Requires a connector ID 
                — call list_connectors first if unknown.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_CONNECTOR_INSTANCES: {
    NAME: 'list_connector_instances',
    DESCRIPTION: `Returns all configured DaVinci connector instances deployed in the environment. 
                Each instance includes its ID, name, the catalog connector ID it was created from, 
                its configured property values (the actual settings applied to this instance), vendor 
                and type from metadata, and links to related resources including applications, gateways, 
                device authentication policies, and notification policies it is associated with. 
                Use when the user wants to see what integrations are actively configured, inspect 
                instance-level property values, or find which gateway or application a connector 
                instance is tied to. Do NOT confuse with list_connectors which returns the connector 
                catalog — this tool returns deployed instances only. Do NOT use when the user needs 
                the available capabilities or credential schema of a connector type — 
                use get_connector_details instead. Requires a connector instance ID for follow-up — 
                call this first before describe_connector_instance.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_CONNECTOR_INSTANCE: {
    NAME: 'describe_connector_instance',
    DESCRIPTION: `Returns the full details of a single deployed DaVinci connector instance by ID. 
                The response contains the same fields as list_connector_instances (name, catalog 
                connector ID, configured property values, vendor and type from metadata, and links to 
                associated applications, gateways, device authentication policies, and notification 
                policies) but scoped to one instance. Prefer this over list_connector_instances when 
                the instance ID is already known and only one instance is relevant. Note that configured 
                property values are also available in list_connector_instances, so only call this when 
                the ID is known and a single instance is the focus. Requires a connector instance ID — 
                call list_connector_instances first if unknown.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_FLOWS: {
    NAME: 'list_flows',
    DESCRIPTION: `Returns all DaVinci flows in the environment. Each flow entry includes its ID, 
                  name, description, enabled status, current and published version numbers, deployment 
                  timestamp, trigger type and subtype, linked connector IDs, input/output schemas, and 
                  linter error/warning counts. Use when the user wants to browse, audit, or find flows 
                  by name or status. Also useful for checking which flows are deployed vs draft 
                  (compare currentVersion vs publishedVersion), or identifying flows with linter issues. 
                  Do NOT use when the user needs the full node-level logic of a specific flow — 
                  use describe_flow with the flow ID instead.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  DESCRIBE_FLOW: {
    NAME: 'describe_flow',
    DESCRIPTION: `Returns the complete definition of a single DaVinci flow by ID. Includes everything 
                from list_flows (name, enabled status, versions, trigger, input/output schemas, timestamps) 
                PLUS the full flow graph: all nodes with their connector ID, capability name, node type, 
                configured properties (code, HTML, CSS, saved variables, form fields), and per-node linter 
                errors; all edges showing how nodes are connected (source → target routing); aggregated 
                linter errors across the flow; and full settings (timeouts, log level, CSP, 
                sensitive field scrubbing, custom CSS/JS). Use when the user needs to understand or audit 
                a flow's internal logic, node configuration, connector usage, variable handling, or 
                routing structure. Requires a flow ID — call list_flows first if unknown. 
                Do NOT call this just to check status or version — list_flows is sufficient for that.`,
    COLLECTION_NAMES: DAVINCI_ADMIN_COLLECTIONS,
  },
  LIST_FLOW_VERSIONS: {
    NAME: 'list_flow_versions',
    DESCRIPTION: `Returns all versions of a specific DaVinci flow by flow ID. Each version entry 
                includes the version number, alias (human-readable label), the version it was cloned 
                from (revealing version lineage), and created, updated, and deployed timestamps. 
                Use when the user wants to browse a flow's version history, check when a version was 
                deployed, trace how versions were branched from each other via clonedFrom, or find a 
                version ID before reverting or exporting a specific version. 
                Requires a flow ID — call list_flows first if unknown. For the full node-level 
                definition of a specific version, use describe_flow after identifying the target 
                version number.`,
    COLLECTION_NAMES: [COLLECTION_NAMES.DAVINCI_ADMIN],
  },
  DESCRIBE_FLOW_VERSION: {
    NAME: 'describe_flow_version',
    DESCRIPTION: `Returns the metadata of a single specific version of a DaVinci flow by flow ID 
                and version ID. The response contains the same fields as list_flow_versions (version 
                number, alias, clonedFrom for lineage, flow ID and name, and created, updated, and 
                deployed timestamps) but scoped to one version. This response does NOT include the 
                full flow graph or node-level details — for that, use describe_flow which returns the 
                current flow definition. Prefer this over list_flow_versions when both the flow ID and 
                version ID are already known and only one version is relevant. Requires both a flow ID 
                and a version ID — call list_flows to find the flow ID, then list_flow_versions to find 
                the version ID if unknown.`,
    COLLECTION_NAMES: [COLLECTION_NAMES.DAVINCI_ADMIN],
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
