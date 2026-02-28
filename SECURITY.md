# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 0.2.x   | :white_check_mark: | Active development |
| 0.1.x   | :x:                | Deprecated |
| < 0.1   | :x:                | Not supported |

## Reporting a Vulnerability

**⚠️ DO NOT open a public issue for security vulnerabilities.**

We take security seriously. If you discover a security vulnerability, please report it responsibly:

### Preferred Method: GitHub Security Advisories
1. Go to https://github.com/LuisvelMarketer/pga-platform/security/advisories/new
2. Click "Report a vulnerability"
3. Fill out the form with details
4. Submit

### Alternative: Email
Send details to: **security@pga-platform.dev** (or your contact email)

### What to Include in Your Report

1. **Description**: Clear explanation of the vulnerability
2. **Steps to Reproduce**: Detailed reproduction steps
3. **Impact**: Potential consequences if exploited
4. **Affected Versions**: Which versions are vulnerable
5. **Suggested Fix**: If you have one (optional but appreciated)
6. **CVE**: If already assigned (optional)

### Example Report Structure

```markdown
## Vulnerability: [Title]

**Severity**: Critical/High/Medium/Low
**Affected Versions**: 0.2.0 - 0.2.3
**Component**: @pga/core

### Description
[Clear description of the vulnerability]

### Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

### Impact
[What can an attacker do? What data is at risk?]

### Suggested Fix
[If you have a recommendation]
```

## Response Timeline

We are committed to responding promptly:

| Stage | Timeline |
|-------|----------|
| **Initial Response** | 48 hours |
| **Vulnerability Confirmation** | 7 days |
| **Status Update** | Weekly |
| **Fix Development** | Depends on severity |
| **Patch Release** | ASAP for critical, 30 days for others |

### Severity Classifications

- **Critical**: Immediate fix, release within 24-48 hours
- **High**: Fix within 1 week
- **Medium**: Fix within 30 days
- **Low**: Fix in next regular release

## Security Best Practices for Users

When using PGA Platform, follow these guidelines:

### 1. API Keys and Secrets
```typescript
// ❌ DON'T: Hardcode secrets
const pga = new PGA({
  llm: new ClaudeAdapter({ apiKey: 'sk-ant-...' })
});

// ✅ DO: Use environment variables
const pga = new PGA({
  llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY })
});
```

### 2. Input Validation
```typescript
// ✅ Always validate user input before processing
function createGenome(userInput: unknown) {
  if (typeof userInput !== 'string' || userInput.length > 1000) {
    throw new Error('Invalid input');
  }
  // Process safely
}
```

### 3. Database Security
```typescript
// ✅ Use parameterized queries (our adapters do this by default)
// ✅ Enable SSL/TLS for database connections
// ✅ Use least-privilege database users
const storage = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});
```

### 4. Dependency Management
- ✅ Keep dependencies updated (Dependabot enabled)
- ✅ Review security advisories weekly
- ✅ Use `npm audit` before production deployments
- ✅ Pin critical dependencies to specific versions

### 5. Evolution Guardrails
```typescript
// ✅ Use strict guardrails in production
const genome = await pga.createGenome({
  name: 'prod-agent',
  config: {
    evolutionGuardrails: {
      minQualityScore: 0.80,      // High quality bar
      minSandboxScore: 0.90,       // Strong sandbox validation
      maxCostPerTask: 0.05,        // Cost control
      gateMode: 'AND',             // All gates must pass
    },
  },
});
```

## Automated Security Measures

This repository includes:

- ✅ **Dependabot**: Automatic dependency updates
- ✅ **npm audit**: Weekly scans for known vulnerabilities
- ✅ **Trivy**: Container and filesystem security scanning
- ✅ **CodeQL**: Static analysis (planned)
- ✅ **Secret Scanning**: GitHub secret detection (enabled)

## Disclosure Policy

We follow **coordinated disclosure**:

1. **Reporter** notifies us privately
2. **We confirm** the vulnerability
3. **We develop and test** a fix
4. **We release** the patched version
5. **Public disclosure** (after users have time to update)
6. **CVE assignment** (if applicable)

### Disclosure Timeline
- **Critical**: 7 days after patch release
- **High**: 30 days after patch release
- **Medium/Low**: 90 days after patch release

## Security Features in PGA

### Evolution Guardrails
- Multi-gate validation (Quality, Sandbox, Economic, Stability)
- Prevents malicious mutations from being deployed
- Economic gates prevent cost-based attacks

### Sandbox Validation
- All mutations tested in sandbox before production
- Semantic validation via LLM judge
- Safety constraints cannot be weakened

### Canary Deployment
- Gradual rollout (5% → 100%)
- Automatic rollback on degradation
- Limits blast radius of bad mutations

### Audit Trail
- All mutations logged with lineage tracking
- Rollback capability with full history
- Transparent decision-making

## Hall of Fame

We recognize security researchers who help us:

<!-- Security researchers will be listed here -->

*No security issues reported yet*

## Contact

- **Security Email**: security@pga-platform.dev
- **GitHub Security**: https://github.com/LuisvelMarketer/pga-platform/security
- **General Contact**: Luis Alfredo Velasquez Duran

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Last Updated**: 2026-02-27  
**Version**: 1.0
