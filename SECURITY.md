# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to the repository maintainer.

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include:
- Type of issue (e.g. buffer overflow, SQL injection, XSS)
- Full paths of source file(s) related to the issue  
- Location of affected source code (tag/branch/commit)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

## Security Features

- Row Level Security (RLS) in Supabase
- JWT authentication with auto-refresh
- HTTPS-only in production
- Input sanitization
- Secure password hashing (Supabase Auth)
- CORS protection

## Security Best Practices

- Never commit credentials or API keys
- Use environment variables for sensitive config
- Always validate and sanitize user input
- Keep dependencies up to date
- Follow OWASP security guidelines

Thank you for helping keep Trakr secure!
