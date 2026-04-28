# DaVinci MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that provides AI assistants with seamless access to PingIdentity's DaVinci identity orchestration platform resources. This server enables AI models to interact with DaVinci flows, applications, connectors, variables, and forms through a standardized interface.

## Overview

DaVinci is PingIdentity's no-code identity orchestration platform that allows organizations to build sophisticated identity and access management workflows. This MCP server acts as a bridge between MCP-compatible AI assistants and the DaVinci API, enabling:

- **Flow Management**: List and inspect identity orchestration flows and their versions.
- **Application Configuration**: Access application settings and flow policies.
- **Connector Management**: View available connectors and their configurations.
- **Variable Management**: Manage flow variables and their values.
- **Form Management**: Access form definitions and configurations.
- **Connector Instances**: Manage connector instance configurations.

## Features

### Available Tools

The server provides the following MCP tools under the `davinci_admin` collection:

#### Application Tools
- `list_applications` - Returns a list of all DaVinci applications.
- `describe_application` - Returns details of a single DaVinci application by ID.
- `list_application_flow_policies` - Returns all flow policies for a DaVinci application.
- `describe_application_flow_policy` - Returns details of a single flow policy for a DaVinci application.

#### Flow Tools
- `list_flows` - Returns a list of all DaVinci flows in the environment.
- `describe_flow` - Returns the complete definition of a DaVinci flow including the full node graph, edges, and settings.
- `list_flow_versions` - Returns all versions of a specific DaVinci flow.
- `describe_flow_version` - Returns the complete definition of a specific DaVinci flow version.

#### Connector Tools
- `list_connectors` - Returns a list of all available DaVinci connector types from the catalog.
- `describe_connector` - Returns the full details of a single DaVinci connector type by ID.
- `list_connector_instances` - Returns a list of all deployed DaVinci connector instances.
- `describe_connector_instance` - Returns details of a single deployed DaVinci connector instance by ID.

#### Variable Tools
- `list_variables` - Returns a list of all DaVinci variables.
- `describe_variable` - Returns details of a single DaVinci variable by ID.

#### Form Tools
- `list_forms` - Returns a list of all DaVinci forms.
- `describe_form` - Returns full configuration of a single DaVinci form.

### Authentication

The server uses OAuth 2.0 Authorization Code flow with PKCE for secure authentication:
- **Automatic Token Management**: Secure token storage using the system keychain (via `keytar`).
- **Interactive Login**: Interactive browser-based authentication flow.
- **Regional Support**: Support for different PingOne regional domains.

## Prerequisites

- **Node.js**: Version 22.0.0 or higher. ([Download & Install](https://nodejs.org/en/download/package-manager))
- **PingIdentity Environment**: Access to a PingIdentity environment with DaVinci enabled.
- **PingOne Worker Application**: A PingOne Worker Application configured with the "Authorization Code" grant type.
- **User Permissions**: The authenticating user should have the **DaVinci Admin Read Only** role.

## Setup

### 1. PingOne Worker Application Setup

Create a PingOne Worker Application in your environment:

1. Navigate to **Applications** in your PingOne admin console.
2. Create a new **Worker Application**.
3. Configure **Grant Types**: Select **Authorization Code**.
4. Set **Redirect URI**: `http://127.0.0.1:7474/callback`
5. Enable **PKCE** (Proof Key for Code Exchange).
6. Note the **Client ID** for the `AUTHORIZATION_CODE_CLIENT_ID` variable.

### 2. Configure Environment Variables

The server requires the following environment variables. These should be configured in your MCP client's settings (see [Usage](#usage) below).

| Variable | Description | Example |
|----------|-------------|---------|
| `DAVINCI_MCP_ENVIRONMENT_ID` | The ID of your PingOne environment. | `a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6` |
| `AUTHORIZATION_CODE_CLIENT_ID` | The Client ID of your PingOne Worker Application. | `your-client-id` |
| `ROOT_DOMAIN` | The regional PingOne domain. | `pingone.com` (NA), `pingone.eu` (EU), `pingone.asia` (APAC) |
| `CUSTOM_DOMAIN` | (Optional) Your custom PingOne domain. | `auth.example.com` |

## Usage

### Quick Install

#### VS Code
[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=davinci&inputs=%5B%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22davinci_environment_id%22%2C%22description%22%3A%22The%20ID%20of%20your%20PingOne%20environment%22%2C%22password%22%3Afalse%7D%2C%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22authorization_code_client_id%22%2C%22description%22%3A%22The%20Client%20ID%20of%20your%20PingOne%20Worker%20Application%22%2C%22password%22%3Afalse%7D%2C%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22root_domain%22%2C%22description%22%3A%22The%20regional%20PingOne%20domain%20%28e.g.%2C%20pingone.com%2C%20pingone.eu%2C%20pingone.asia%29%22%2C%22password%22%3Afalse%7D%5D&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40ping-identity%2Fdavinci-mcp-server%22%5D%2C%22env%22%3A%7B%22DAVINCI_MCP_ENVIRONMENT_ID%22%3A%22%24%7Binput%3Adavinci_environment_id%7D%22%2C%22AUTHORIZATION_CODE_CLIENT_ID%22%3A%22%24%7Binput%3Aauthorization_code_client_id%7D%22%2C%22ROOT_DOMAIN%22%3A%22%24%7Binput%3Aroot_domain%7D%22%7D%7D)

#### Cursor
[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en-US/install-mcp?name=davinci&config=eyJlbnYiOnsiREFWSU5DSV9NQ1BfRU5WSVJPTk1FTlRfSUQiOiI8PHBhc3RlIGVudmlyb25tZW50IFVVSUQgaGVyZT4+IiwiQVVUSE9SSVpBVElPTl9DT0RFX0NMSUVOVF9JRCI6Ijw8cGFzdGUgY2xpZW50IElEIFVVSUQgaGVyZT4+IiwiUk9PVF9ET01BSU4iOiI8PHBhc3RlIHJvb3QgZG9tYWluIGhlcmUgKGUuZy4sIHBpbmdvbmUuY29tKT4+In0sImNvbW1hbmQiOiJucHggLXkgQHBpbmctaWRlbnRpdHkvZGF2aW5jaS1tY3Atc2VydmVyIn0%3D)

### MCP Client Configuration

Replace `your-environment-id` and `your-client-id` with your actual PingOne environment ID and OAuth Client ID in the examples below.

<details>
<summary>Claude Desktop</summary>

Add the following to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "davinci": {
      "command": "npx",
      "args": [
        "-y",
        "@ping-identity/davinci-mcp-server"
      ],
      "env": {
        "DAVINCI_MCP_ENVIRONMENT_ID": "your-environment-id",
        "AUTHORIZATION_CODE_CLIENT_ID": "your-client-id",
        "ROOT_DOMAIN": "pingone.com"
      }
    }
  }
}
```
</details>

<details>
<summary>Claude Code (CLI)</summary>

Run the following command in your terminal:

```bash
claude mcp add --transport stdio davinci \
--env DAVINCI_MCP_ENVIRONMENT_ID="your-environment-id" \
--env AUTHORIZATION_CODE_CLIENT_ID="your-client-id" \
--env ROOT_DOMAIN="pingone.com" \
-- npx -y @ping-identity/davinci-mcp-server
```
</details>

<details>
<summary>VS Code (Cline)</summary>

1. Open the Cline sidebar in VS Code.
2. Click the **Settings** (gear) icon.
3. Scroll to **MCP Servers** and click **Add MCP Server**.
4. Use the following configuration:

```json
{
  "davinci": {
    "command": "npx",
    "args": [
      "-y",
      "@ping-identity/davinci-mcp-server"
    ],
    "env": {
      "DAVINCI_MCP_ENVIRONMENT_ID": "your-environment-id",
      "AUTHORIZATION_CODE_CLIENT_ID": "your-client-id",
      "ROOT_DOMAIN": "pingone.com"
    }
  }
}
```
</details>

<details>
<summary>Cursor</summary>

1. Open Cursor **Settings** -> **Features** -> **MCP**.
2. Click **+ Add New MCP Server**.
3. Name: `davinci`
4. Type: `command`
5. Command:
```bash
npx -y @ping-identity/davinci-mcp-server
```
6. Add environment variables:
   - `DAVINCI_MCP_ENVIRONMENT_ID`: `your-environment-id`
   - `AUTHORIZATION_CODE_CLIENT_ID`: `your-client-id`
   - `ROOT_DOMAIN`: `pingone.com`
</details>

<details>
<summary>Gemini CLI</summary>

Add the following to your `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "davinci": {
      "command": "npx",
      "args": [
        "-y",
        "@ping-identity/davinci-mcp-server"
      ],
      "env": {
        "DAVINCI_MCP_ENVIRONMENT_ID": "your-environment-id",
        "AUTHORIZATION_CODE_CLIENT_ID": "your-client-id",
        "ROOT_DOMAIN": "pingone.com"
      }
    }
  }
}
```
</details>

### CLI Flags

The server supports several CLI flags to customize its behavior. These should be added to the `args` array in your MCP client configuration:

- `--include-collections <list>`: Comma-separated list of collection names to include (e.g., `davinci_admin`).
- `--exclude-collections <list>`: Comma-separated list of collection names to exclude.
- `--include-tools <list>`: Comma-separated list of tool names to include.
- `--exclude-tools <list>`: Comma-separated list of tool names to exclude.
- `--verbose`: Enable verbose logging to stderr.
- `--logout`: Trigger a logout flow on startup by clearing stored tokens.

**Example (Claude Desktop Configuration):**

```json
{
  "mcpServers": {
    "davinci": {
      "command": "npx",
      "args": [
        "-y",
        "@ping-identity/davinci-mcp-server",
        "--include-tools",
        "list_flows,describe_flow",
        "--verbose"
      ],
      "env": {
        "DAVINCI_MCP_ENVIRONMENT_ID": "your-environment-id",
        "AUTHORIZATION_CODE_CLIENT_ID": "your-client-id",
        "ROOT_DOMAIN": "pingone.com"
      }
    }
  }
}
```

## Development

### 1. Installation

```bash
git clone https://github.com/pingidentity/davinci-mcp-server.git
cd davinci-mcp-server
npm ci
```

### 2. Available Scripts

- `npm run dev`: Watch mode for development.
- `npm run build`: Build the project.
- `npm run typecheck`: Run TypeScript type checking.
- `npm run lint`: Run ESLint.
- `npm run format`: Format code with Prettier.
- `npm run test`: Run tests using Vitest.
- `npm run inspect`: Run with MCP Inspector for debugging.

## Troubleshooting

- **Port Conflict**: The authentication callback server uses port `7474`. Ensure this port is available.
- **Keychain Access**: On Linux, ensure `libsecret` is installed for `keytar` to function. On macOS/Windows, it uses the native keychain.
- **Authentication Timeout**: The browser login must be completed within 5 minutes.
- **Invalid Tokens**: Use the `--logout` flag to clear corrupted or invalid tokens from the keychain.

## License

This project is licensed under the [Apache-2.0 License](LICENSE).
