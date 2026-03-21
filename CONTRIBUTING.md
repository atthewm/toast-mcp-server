# Contributing to Toast MCP Server

Thank you for your interest in contributing. This guide covers everything you need to get started.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a branch for your work: `git checkout -b your-feature-name`
5. Make your changes
6. Run the checks: `npm run lint && npm run typecheck && npm test`
7. Push to your fork and open a pull request

## Development Setup

### Prerequisites

- Node.js 18 or later
- npm

### Install and Build

```bash
npm install
npm run build
```

### Run Tests

```bash
npm test              # Single run
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Lint and Type Check

```bash
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto fix
npm run typecheck     # TypeScript type checking
```

### Dev Mode

```bash
npm run dev           # Watch mode with tsx (auto restarts on changes)
```

## Project Structure

```
src/
  config/        Configuration loading and validation
  toast/         Toast API client and authentication
  tools/
    read/        Read only tools (always available)
    write/       Write tools (gated by ALLOW_WRITES)
    registry.ts  Tool registration and dispatch
  events/        Event types and emitter
  bridge/        Notification bridges (Teams)
  models/        TypeScript interfaces for Toast data
  utils/         Logger, error classes, helpers
  mcp/           MCP server setup and transport
  index.ts       Entry point
tests/
  unit/          Unit tests
  fixtures/      Test data and API response fixtures
docs/            Documentation
examples/        Example configurations
```

## Guidelines

### Code Style

- TypeScript strict mode is enabled
- ESLint rules are configured; run `npm run lint` to check
- Use meaningful variable names; avoid single letter names except in loops
- Add JSDoc comments to exported functions and classes
- Keep files focused on a single concern

### Adding a New Tool

1. Decide if it is a read tool or a write tool
2. Create a new file in the appropriate directory (`src/tools/read/` or `src/tools/write/`)
3. Follow the pattern of existing tools: export a `ToolDefinition` with name, description, Zod input schema, and execute function
4. For write tools, set `requiresWrite: true` and implement the three layer safety pattern
5. Add the export to the directory's `index.ts`
6. Add the export to `src/tools/index.ts`
7. Register the tool in `src/mcp/server.ts`
8. Add tests in `tests/unit/`
9. Document the tool in `docs/tools.md`

### Commit Messages

Write clear, descriptive commit messages. Use the present tense ("Add feature" not "Added feature"). Keep the first line under 72 characters and add a blank line before any additional details.

### Pull Requests

- Keep pull requests focused on a single change
- Include a clear description of what the change does and why
- Reference any related issues
- Make sure all checks pass before requesting review
- Add or update tests for any new or changed behavior
- Update documentation if the change affects the public API or user facing behavior

## Reporting Issues

Use GitHub Issues to report bugs or request features. Please include:

- A clear description of the issue
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Your environment (Node.js version, OS, Toast API scope if relevant)

## Security

If you discover a security vulnerability, **do not open a public issue**. See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

## Code of Conduct

This project follows the Contributor Covenant Code of Conduct. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
