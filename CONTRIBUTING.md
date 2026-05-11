# Contributing to DaVinci MCP Server

Contributions are welcome! This guide walks you through everything you need to get started.

## Prerequisites

- **Node.js** 22+ ([Download](https://nodejs.org/en/download/package-manager))
- **Linux only**: `libsecret-1-dev` must be installed before `npm ci` (required by `keytar`):
  ```bash
  sudo apt-get install -y libsecret-1-dev
  ```

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork and install dependencies:
   ```bash
   git clone https://github.com/<your-username>/davinci-mcp-server.git
   cd davinci-mcp-server
   npm ci
   ```
3. Create a feature branch:
   ```bash
   git checkout -b my-feature
   ```

## Project Structure

```
src/
├── index.ts                        # Entry point — CLI arg parsing and server startup
├── modules/
│   ├── server.ts                   # DavinciMcpServer — MCP server wrapper
│   └── auth/
│       ├── manager.ts              # AuthManager — OAuth 2.0 PKCE flow
│       └── clients/
│           ├── davinci.ts          # Base API client (token injection, 401 retry)
│           └── *.ts                # Resource-specific clients (flows, applications, …)
├── tools/
│   ├── index.ts                    # registerAllTools() — wires all tool modules
│   └── *.ts                        # One registration file per resource domain
├── configs/
│   ├── settings.ts                 # CLI arg parsing and tool filter logic
│   └── html.ts                     # OAuth callback HTML page
└── utils/
    ├── constants.ts                # MCP_TOOLS registry (names, descriptions, collections)
    ├── schemas.ts                  # Reusable Zod schema helpers
    └── logger.ts                   # Stderr logger
tests/                              # Mirrors the src/ directory structure
```

## Development Workflow

| Script | Description |
| --- | --- |
| `npm run dev` | TypeScript watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (auto-fix) |
| `npm run format:check` | Prettier (check only, used in CI) |
| `npm test` | Run Vitest test suite |
| `npm run test:watch` | Watch mode for tests |
| `npm run test:coverage` | Coverage report |
| `npm run inspect` | Run with MCP Inspector against built output |
| `npm run dev:inspect` | Run with MCP Inspector against TypeScript source |

## Code Style

The project uses **ESLint** and **Prettier**. Run `npm run format` before committing to avoid CI failures. Key Prettier settings (`.prettierrc`):

- Semicolons: **yes**
- Quotes: **single**
- Tab width: **2 spaces**
- Trailing commas: **all**
- Print width: **100**

## Adding a New Tool

Each tool maps to an API resource. Follow the existing pattern:

1. **Register the tool metadata** in `src/utils/constants.ts` — add an entry to `MCP_TOOLS` with `NAME`, `DESCRIPTION`, and `COLLECTION_NAMES`.

2. **Add an API client method** in the relevant `src/modules/auth/clients/*.ts` file (or create a new one that extends `DaVinciApiClient`).

3. **Register the tool handler** in the relevant `src/tools/*.ts` file (or create a new one):
   - Call `createToolFilter(config)` and skip tools that don't pass the filter.
   - Call `server.registerTool(name, { description, inputSchema }, handler)`.
   - Return `{ content: [{ type: 'text', text: JSON.stringify(data) }] }` from the handler.
   - Re-throw `McpError` as-is; wrap all other errors in `new McpError(ErrorCode.InternalError, message)`.

4. **Wire it up** in `src/tools/index.ts` if you added a new registration file.

5. **Add tests** under `tests/tools/` mirroring the source path (see existing tests for the mocking pattern).

## Writing Tests

- Test files live under `tests/` and mirror the `src/` directory structure.
- Unit tests mock external dependencies (`axios`, `keytar`, `open`, `http.createServer`, `AuthManager`, API clients).
- Integration-style server tests use the SDK's `InMemoryTransport` to run real MCP protocol round-trips against a live `DavinciMcpServer` with mocked clients — see `tests/modules/server.test.ts` for the pattern.

## CI Requirements

All pull requests must pass the following checks (run automatically via GitHub Actions):

```bash
npm run lint          # No ESLint errors
npm run format:check  # No Prettier formatting issues
npm run build         # TypeScript compiles cleanly
npm test              # All tests pass
```

Run these locally before opening a PR to catch issues early.

## Submitting a Pull Request

1. Ensure all CI checks pass locally (see above).
2. Push your branch and open a pull request against `main`.
3. Provide a clear description of what the change does and why.
4. For new tools, include a short example of expected input/output in the PR description.

## Reporting Issues

Please open a GitHub issue with a clear description of the problem, steps to reproduce, and relevant environment details (OS, Node.js version, MCP client).
