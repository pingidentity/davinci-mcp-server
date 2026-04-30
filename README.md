# DaVinci MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that provides AI assistants with seamless access to PingOne's DaVinci identity orchestration platform resources. This server enables AI models to interact with DaVinci flows, applications, connectors, variables, and forms through a standardized interface.

> [!CAUTION]
> **PREVIEW SOFTWARE:** This MCP server is currently in preview. It is provided "AS IS" without warranty of any kind. It is subject to change and is not advised for use in production or mission-critical workloads.

> [!WARNING]
> **SECURITY & LEAST PRIVILEGE:** This server grants an AI model significant access to your DaVinci environment configuration. All data returned from tools may be sent to the LLM provider.
>
> 1.  Use ONLY with trusted MCP clients.
> 2.  Follow the **Principle of Least Privilege**: Ensure the authenticating user is assigned a role with the minimum necessary permissions (e.g., `DaVinci Admin Read Only`).
> 3.  **HUMAN REVIEW REQUIRED**: Always review all AI-generated configurations or insights before applying them to a live environment.

## Overview

DaVinci is PingOne's no-code identity orchestration platform that allows organizations to build sophisticated identity and access management workflows. This MCP server acts as a bridge between MCP-compatible AI assistants and the DaVinci API, enabling:

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

| Tool                              | Description                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `list_applications`               | Returns a list of all DaVinci applications.                                    |
| `describe_application`            | Returns details of a single DaVinci application by ID.                         |
| `list_application_flow_policies`  | Returns all flow policies for a DaVinci application.                           |
| `describe_application_flow_policy` | Returns details of a single flow policy for a DaVinci application.             |

#### Flow Tools

| Tool                    | Description                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `list_flows`            | Returns a list of all DaVinci flows in the environment.                                           |
| `describe_flow`         | Returns the complete definition of a DaVinci flow including the full node graph, edges, and settings. |
| `list_flow_versions`    | Returns all versions of a specific DaVinci flow.                                                  |
| `describe_flow_version` | Returns the complete definition of a specific DaVinci flow version.                                |

#### Connector Tools

| Tool                          | Description                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `list_connectors`             | Returns a list of all available DaVinci connector types from the catalog.             |
| `describe_connector`          | Returns the full details of a single DaVinci connector type by ID.                   |
| `list_connector_instances`    | Returns a list of all deployed DaVinci connector instances.                          |
| `describe_connector_instance` | Returns details of a single deployed DaVinci connector instance by ID.               |

#### Variable Tools

| Tool                | Description                                       |
| ------------------- | ------------------------------------------------- |
| `list_variables`    | Returns a list of all DaVinci variables.          |
| `describe_variable` | Returns details of a single DaVinci variable by ID. |

#### Form Tools

| Tool            | Description                                          |
| --------------- | ---------------------------------------------------- |
| `list_forms`    | Returns a list of all DaVinci forms.                 |
| `describe_form` | Returns full configuration of a single DaVinci form. |

### Authentication

The server uses OAuth 2.0 Authorization Code flow with PKCE for secure authentication:

- **Automatic Token Management**: Secure token storage using the system keychain (via `keytar`).
- **Interactive Login**: Interactive browser-based authentication flow.
- **Regional Support**: Support for different PingOne regional domains.

## Prerequisites

- **Node.js**: Version 22.0.0 or higher. ([Download & Install](https://nodejs.org/en/download/package-manager))
- **PingOne Subscription**: A licensed or trial PingOne cloud subscription.
  - If you don't have one, you can [sign up for a free trial](https://www.pingidentity.com/en/try-ping.html).
- **DaVinci Enabled**: Ensure the DaVinci service is added to your environment.
  - In the PingOne Admin Console, navigate to **Environments** > **Your Environment** > **Services** and ensure **DaVinci** is listed and active.
- **Worker Application**: A PingOne Worker Application in the same environment (see [Setup](#setup) for details).
- **User Permissions**: The authenticating user must be created in the environment if not present, and the user must have an appropriate role, such as **DaVinci Admin Read Only**.

## Setup

### 1. PingOne Worker Application Setup

The MCP server requires a Worker Application to authenticate with the PingOne API.

1.  **Access PingOne Admin**: Log in to your [PingOne Admin Console](https://admin.pingone.com).
2.  **Select Environment**: Choose the environment where DaVinci is enabled.
3.  **Navigate to Applications**: Click **Applications** > **Applications** in the left navigation menu.
4.  **Create Application**:
    - Click **+ Add Application** and select **Worker**.
    - **Name**: e.g., `DaVinci MCP Server`.
    - **Description**: Optional.
    - Click **Save**.
    - Enable the Worker application by toggling the button on top right.
5.  **Configure Grant Types**:
    - Select the **Configuration** tab of your new application.
    - Click the **Edit** (pencil) icon.
    - Under **Grant Types**, ensure **Authorization Code** is selected.
    - Under **Response Type** ensure **Code** is selected.
    - **PKCE Enforcement**: Set to **S256_REQUIRED**.
    - **Redirect URIs**: Add `http://127.0.0.1:7474/callback`.
    - **Token Endpoint Authentication Method**: Set to **None** (Public Client).
    - Click **Save**.
6.  **Capture Credentials**:
    - Copy the **Client ID** from the **Configuration** tab. You will need this for the `AUTHORIZATION_CODE_CLIENT_ID` variable.
    - Note your **Environment ID** (found in the URL or the environment settings).

### 2. User Setup & Role Assignment

The authenticating user must have the necessary permissions to access DaVinci resources.

1.  **Navigate to Users**: In the PingOne Admin Console, click **Directory** > **Users**.
2.  **Create/Select User**: Either create a new user (**+ Add User**) or select an existing one that you will use to log in via the MCP server.
3.  **Assign Role**:
    - On the user's profile, navigate to the **Roles** tab.
    - Click **Grant Roles**.
    - Search for and select the **DaVinci Admin Read Only** role.
    - Click **Save**.

### 3. Configure Environment Variables

The server requires the following environment variables. These should be configured in your MCP client's settings (see [Usage](#usage) below).

| Variable                       | Description                                       | Example                                                      |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------ |
| `DAVINCI_MCP_ENVIRONMENT_ID`   | The ID of your PingOne environment.               | `a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6`                       |
| `AUTHORIZATION_CODE_CLIENT_ID` | The Client ID of your PingOne Worker Application. | `your-client-id`                                             |
| `ROOT_DOMAIN`                  | The regional PingOne domain.                      | `pingone.com` (NA), `pingone.eu` (EU), `pingone.asia` (APAC) |
| `CUSTOM_DOMAIN`                | (Optional) Your custom PingOne domain.            | `auth.example.com`                                           |

## Usage

### Quick Install

#### VS Code

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=davinci&inputs=%5B%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22davinci_environment_id%22%2C%22description%22%3A%22The%20ID%20of%20your%20PingOne%20environment%22%2C%22password%22%3Afalse%7D%2C%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22authorization_code_client_id%22%2C%22description%22%3A%22The%20Client%20ID%20of%20your%20PingOne%20Worker%20Application%22%2C%22password%22%3Afalse%7D%2C%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22root_domain%22%2C%22description%22%3A%22The%20regional%20PingOne%20domain%20%28e.g.%2C%20pingone.com%2C%20pingone.eu%2C%20pingone.asia%29%22%2C%22password%22%3Afalse%7D%5D&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40ping-identity%2Fdavinci-mcp-server%22%2C%22start%22%5D%2C%22env%22%3A%7B%22DAVINCI_MCP_ENVIRONMENT_ID%22%3A%22%24%7Binput%3Adavinci_environment_id%7D%22%2C%22AUTHORIZATION_CODE_CLIENT_ID%22%3A%22%24%7Binput%3Aauthorization_code_client_id%7D%22%2C%22ROOT_DOMAIN%22%3A%22%24%7Binput%3Aroot_domain%7D%22%7D%7D)

#### Cursor

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en-US/install-mcp?name=davinci&config=eyJlbnYiOnsiREFWSU5DSV9NQ1BfRU5WSVJPTk1FTlRfSUQiOiI8PHBhc3RlIGVudmlyb25tZW50IFVVSUQgaGVyZT4+IiwiQVVUSE9SSVpBVElPTl9DT0RFX0NMSUVOVF9JRCI6Ijw8cGFzdGUgY2xpZW50IElEIFVVSUQgaGVyZT4+IiwiUk9PVF9ET01BSU4iOiI8PHBhc3RlIHJvb3QgZG9tYWluIGhlcmUgKGUuZy4sIHBpbmdvbmUuY29tKT4+In0sImNvbW1hbmQiOiJucHggLXkgQHBpbmctaWRlbnRpdHkvZGF2aW5jaS1tY3Atc2VydmVyIHN0YXJ0In0%3D)

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
      "args": ["-y", "@ping-identity/davinci-mcp-server", "start"],
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
-- npx -y @ping-identity/davinci-mcp-server start
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
    "args": ["-y", "@ping-identity/davinci-mcp-server", "start"],
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
npx -y @ping-identity/davinci-mcp-server start
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
      "args": ["-y", "@ping-identity/davinci-mcp-server", "start"],
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

### CLI Commands & Flags

The server requires a command to execute and supports several flags to customize its behavior. These should be added to the `args` array in your MCP client configuration:

#### Commands

- `start`: Initiates the MCP server (required for normal operation).

#### Options

- `--include-collections <list>`: Comma-separated list of collection names to include (e.g., `davinci_admin`).
- `--exclude-collections <list>`: Comma-separated list of collection names to exclude.
- `--include-tools <list>`: Comma-separated list of tool names to include.
- `--exclude-tools <list>`: Comma-separated list of tool names to exclude.
- `--verbose`: Enable verbose logging to stderr.
- `--logout`: Trigger a logout flow on startup by clearing stored tokens.
- `--help`: Show the help message.

### MCP Configuration Examples

These examples show how to configure `claude_desktop_config.json` for different scenarios. Change accordingly for other providers

<details>
<summary><b>1. Basic Server Startup</b></summary>
The standard configuration to run the server with all default tools enabled.

```json
{
  "mcpServers": {
    "davinci": {
      "command": "npx",
      "args": ["-y", "@ping-identity/davinci-mcp-server", "start"],
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
<summary><b>2. Filter by Tool Collection</b></summary>
Limit the tools exposed to Claude to only those in the `davinci_admin` collection.

```json
{
  "mcpServers": {
    "davinci": {
      "command": "npx",
      "args": [
        "-y",
        "@ping-identity/davinci-mcp-server",
        "start",
        "--include-collections",
        "davinci_admin"
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
<summary><b>3. Filter by Specific Tools</b></summary>
Expose only a surgical set of tools (e.g., only flows) to the AI assistant.

```json
{
  "mcpServers": {
    "davinci": {
      "command": "npx",
      "args": [
        "-y",
        "@ping-identity/davinci-mcp-server",
        "start",
        "--include-tools",
        "list_flows,describe_flow"
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
<summary><b>4. Exclude Specific Tools</b></summary>
Enable all tools except for those related to variables.

```json
{
  "mcpServers": {
    "davinci": {
      "command": "npx",
      "args": [
        "-y",
        "@ping-identity/davinci-mcp-server",
        "start",
        "--exclude-tools",
        "describe_variable,list_variables"
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
<summary><b>5. Enable Verbose Logging</b></summary>
Enable detailed logging to help debug connection or tool execution issues.

```json
{
  "mcpServers": {
    "davinci": {
      "command": "npx",
      "args": ["-y", "@ping-identity/davinci-mcp-server", "start", "--verbose"],
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

### Maintenance & Utility Commands

These commands are intended to be run manually in your terminal for maintenance or discovery.

<details>
<summary><b>1. Logout & Clear Credentials</b></summary>
Force the server to clear stored tokens from the system keychain. This is useful if you need to switch users or re-authenticate.

```bash
npx -y @ping-identity/davinci-mcp-server start --logout
```

</details>

<details>
<summary><b>2. Display Help</b></summary>
View all available commands, options, and required environment variables directly in your terminal.

```bash
npx -y @ping-identity/davinci-mcp-server --help
```

</details>

**Example (Claude Desktop Configuration):**

```json
{
  "mcpServers": {
    "davinci": {
      "command": "npx",
      "args": [
        "-y",
        "@ping-identity/davinci-mcp-server",
        "start",
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
