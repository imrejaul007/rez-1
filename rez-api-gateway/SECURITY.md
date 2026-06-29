# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by sending an email to **security@rez.money**.

Please do not open a public GitHub issue for security vulnerabilities.

We aim to respond within 48 hours and will provide an estimated timeline for a fix. We follow responsible disclosure practices and will credit reporters (if desired) once the issue is resolved.

## Security Best Practices

When contributing to this service:

- Never commit secrets, API keys, or credentials to the repository
- Use environment variables for all sensitive configuration
- Validate and sanitize all user input
- Use parameterized queries for database operations
- Apply rate limiting on all public endpoints
