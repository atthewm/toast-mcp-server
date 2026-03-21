# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly. **Do not open a public GitHub issue.**

### How to Report

Send an email to **security@matthewmckenzie.dev** with the following information:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: You will receive an acknowledgment within 48 hours
- **Assessment**: The issue will be assessed for severity and impact within 5 business days
- **Resolution**: A fix will be developed and tested before any public disclosure
- **Credit**: You will be credited in the release notes unless you prefer to remain anonymous

### Scope

The following are in scope for security reports:

- Authentication credential exposure or leakage
- Unauthorized access to Toast API data
- Write operations executing without proper safety gates
- Sensitive data appearing in logs or error messages
- Dependency vulnerabilities that affect this project
- Configuration issues that could lead to data exposure

### Out of Scope

- Issues in the Toast API itself (report those to Toast directly)
- Issues that require physical access to the host machine
- Social engineering attacks
- Denial of service without a practical attack vector

## Security Design

This project includes several security measures by design:

- **Write gating**: Write operations require three layers of explicit opt in (environment variable, dry run flag, per call confirmation)
- **Credential redaction**: The logger automatically redacts known sensitive fields (client secrets, access tokens, passwords, webhook secrets)
- **Environment isolation**: Credentials are loaded from environment variables, not stored in code
- **.env files**: The `.gitignore` excludes `.env` and related files from version control
- **Token management**: OAuth tokens are cached in memory only and automatically expire
- **No credential logging**: The auth flow never logs credential values
- **Minimal permissions**: The server requests only the API scopes it needs

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

Security fixes will be applied to the latest release.
