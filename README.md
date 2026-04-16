# DaVinci MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that provides AI assistants with seamless access to PingIdentity's DaVinci identity orchestration platform resources. This server enables AI models to interact with DaVinci flows, applications, connectors, variables, and forms through a standardized interface.

## Overview

DaVinci is PingIdentity's no-code identity orchestration platform that allows organizations to build sophisticated identity and access management workflows. This MCP server acts as a bridge between AI assistants (like Claude, GPT, etc.) and the DaVinci API, enabling:

- **Flow Management**: List and inspect identity orchestration flows
- **Application Configuration**: Access application settings and flow policies  
- **Connector Management**: View available connectors and their configurations
- **Variable Management**: Manage flow variables and their values
- **Form Management**: Access form definitions and configurations
- **Connector Instances**: Manage connector instance configurations

## Features

### Available Tools

The server provides the following MCP tools:

#### Flow Tools
- `list_flows` - List all DaVinci flows in the environment
- `describe_flow` - Get detailed information about a specific flow

#### Application Tools  
- `list_applications` - List all applications in the environment
- `describe_application` - Get detailed application configuration
- `list_application_flow_policies` - List flow policies for an application
- `describe_application_flow_policy` - Get specific flow policy details

#### Connector Tools
- `list_connectors` - List all available connectors
- `describe_connector` - Get connector information
- `describe_connector_details` - Get detailed connector configuration

#### Connector Instance Tools
- `list_connector_instances` - List all connector instances
- `describe_connector_instance` - Get specific connector instance details

#### Variable Tools
- `list_variables` - List all variables in the environment
- `describe_variable` - Get specific variable details

#### Form Tools  
- `list_forms` - List all forms in the environment
- `describe_form` - Get specific form configuration

### Authentication

The server uses OAuth 2.0 Authorization Code flow with PKCE for secure authentication:
- Automatic token management and storage
- Secure token storage using the system keychain (via `keytar`)
- Interactive browser-based authentication flow
- Re-authentication when tokens expire

## Prerequisites

- **Node.js**: Version 22.0.0 or higher
- **PingIdentity Environment**: Access to a PingIdentity environment with DaVinci
- **Application Configuration**: An OAuth application configured with Authorization Code grant type
- **User Permissions**: DaVinci Admin Read Only role (recommended)

## Installation & Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd davinci-mcp-server
npm ci
```

### 2. Build the Project

```bash
npm run build
```

This generates the compiled JavaScript in the `dist/` directory.

### 3. Configure Environment Variables

Set the following environment variables:

```bash
export DAVINCI_MCP_ENVIRONMENT_ID="your-environment-id"
export AUTHORIZATION_CODE_CLIENT_ID="your-client-id" 
export ROOT_DOMAIN="pingone.com"  # or pingone.eu, pingone.asia, etc.
```

#### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DAVINCI_MCP_ENVIRONMENT_ID` | Environment/Company ID where DaVinci resources exist | `a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6` |
| `AUTHORIZATION_CODE_CLIENT_ID` | OAuth application client ID with Authorization Code grant | `client-id-from-pingidentity` |
| `ROOT_DOMAIN` | Regional PingIdentity domain | `pingone.com` (NA), `pingone.eu` (EU), `pingone.asia` (APAC) |

### 4. OAuth Application Setup

Create an OAuth application in your PingIdentity environment:

1. Navigate to **Applications** in your PingIdentity admin console
2. Create a new **Web Application**  
3. Configure **Grant Types**: Select "Authorization Code"
4. Set **Redirect URI**: `http://localhost:7464/callback`
5. Enable **PKCE** (Proof Key for Code Exchange)
6. Note the **Client ID** for the `AUTHORIZATION_CODE_CLIENT_ID` variable

For detailed setup instructions, refer to: [PingOne Worker Application Setup](https://github.com/pingidentity/pingone-mcp-server/blob/main/docs/setup-pingone-worker-application.md)

### 5. User Permissions

Ensure the authenticating user has appropriate permissions:
- **DaVinci Admin Read Only** (recommended)

## Usage

### MCP Client Configuration

#### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "davinci-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/davinci-mcp-server/dist/index.js"
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

#### Generic MCP Client

The server communicates via stdio and can be integrated with any MCP-compatible client:

```bash
node dist/index.js
```

### Development Workflow

#### Local Development

```bash
# Watch mode for development
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting  
npm run format
npm run format:check
```

#### Testing with MCP Inspector

```bash
# Run with inspector for debugging
npm run dev:inspect

# Or for built version
npm run inspect
```

The MCP Inspector provides a web interface for testing tools and debugging the server.

## Configuration

### Regional Domains

Configure `ROOT_DOMAIN` based on your region:
- **North America**: `pingone.com`
- **Europe**: `pingone.eu` 
- **Asia Pacific**: `pingone.asia`
- **Canada**: `pingone.ca`

### Security Considerations

- Tokens are stored securely in the system keychain
- OAuth PKCE provides additional security for the authorization flow
- Automatic token refresh prevents session interruption
- Network requests use HTTPS exclusively

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify environment variables are set correctly
   - Ensure OAuth application is configured with Authorization Code grant
   - Check user has required DaVinci permissions

2. **Build Errors**
   - Run `npm ci` to ensure clean dependency installation
   - Verify Node.js version is 22.0.0 or higher

   - Check TypeScript compilation with `npm run typecheck`

3. **Connection Issues**
   - Verify `ROOT_DOMAIN` matches your PingIdentity region
   - Ensure network connectivity to PingIdentity APIs
   - Check firewall settings for outbound HTTPS connections


## API Reference

The server interacts with PingIdentity DaVinci API endpoints:
- Base URL: `https://api.{ROOT_DOMAIN}/v1/environments/{ENVIRONMENT_ID}`
- Authentication: OAuth 2.0 Bearer tokens
- Response Format: JSON

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable  
5. Run linting and formatting
6. Submit a pull request

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

## Support

For issues related to:
- **DaVinci Platform**: Contact PingIdentity support
- **MCP Server**: Create an issue in this repository
- **MCP Protocol**: Refer to [MCP documentation](https://modelcontextprotocol.io)
