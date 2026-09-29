# Security Policy

## Supported Versions

Security updates are provided for the latest released version of MUI Icon Preview.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Reporting a Vulnerability

Please do not disclose security vulnerabilities in public GitHub issues.

Report vulnerabilities privately to [igorbezanovic@gmail.com](mailto:igorbezanovic@gmail.com). Include the affected version, reproduction steps, impact, and any suggested mitigation. You can expect an acknowledgement within 72 hours and a status update after the report has been assessed.

Avoid including credentials, access tokens, private source code, or other sensitive data that is not required to reproduce the issue.

## Data and Network Access

MUI Icon Preview reads generated icon source files from the active workspace's local `node_modules/@mui/icons-material` directory. Icon previews are generated locally and cached in memory. The extension does not upload workspace content or require network access for its runtime features.

The documentation link shown in hover content opens `https://mui.com` only when explicitly selected by the user.