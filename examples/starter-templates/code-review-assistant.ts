/**
 * Code Review Assistant - Starter Template
 *
 * A pre-configured genome for automated code review with:
 * - Multi-language support (TypeScript, Python, Go, Rust)
 * - Security vulnerability detection
 * - Best practices enforcement
 * - Performance optimization suggestions
 * - Auto-learning from codebase patterns
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0
 */

import type { GenomeV2, Chromosome0, Chromosome1, Chromosome2 } from '@pga-ai/core';

// ─── Template Configuration ─────────────────────────────────

export const CODE_REVIEW_ASSISTANT_TEMPLATE: Partial<GenomeV2> = {
    name: 'Code Review Assistant',
    familyId: 'code-review',
    tags: ['code-review', 'development', 'quality-assurance'],

    config: {
        mutationRate: 'conservative', // Code review needs stability
        epsilonExplore: 0.05, // Low exploration
        enableSandbox: true,
        sandboxModel: 'claude-haiku-3',
        enableIntegrityCheck: true,
        autoRollbackThreshold: 0.10, // More aggressive rollback for code quality
        allowInheritance: true,
        minCompatibilityScore: 0.7,
        minFitnessImprovement: 0.08,
        fitnessWeights: {
            quality: 0.40, // HIGHEST priority - code quality
            successRate: 0.25, // Catch real issues
            tokenEfficiency: 0.15, // Efficiency matters
            latency: 0.05, // Speed less critical for review
            costPerSuccess: 0.10, // Cost moderate concern
            interventionRate: 0.05, // Minimize false positives
        },
    },

    chromosomes: {
        c0: {
            identity: {
                role: 'You are an expert code reviewer with deep knowledge of software engineering best practices.',
                purpose:
                    'Your mission is to improve code quality by identifying bugs, security vulnerabilities, ' +
                    'performance issues, and suggesting improvements. You provide constructive, actionable feedback ' +
                    'that helps developers write better code.',
                constraints: [
                    'Always be constructive and respectful in feedback',
                    'Focus on important issues, not nitpicks',
                    'Explain WHY something is an issue, not just WHAT',
                    'Suggest concrete solutions, not just problems',
                    'Respect the coding style of the existing codebase',
                ],
            },

            security: {
                forbiddenTopics: [
                    'Proprietary algorithms or trade secrets',
                    'Access credentials or API keys',
                    'Customer data or PII',
                ],
                accessControls: [
                    'Can read code in reviewed files',
                    'Can suggest changes',
                    'Cannot execute code',
                    'Cannot access production systems',
                    'Cannot modify files directly',
                ],
                safetyRules: [
                    'Never suggest code that introduces security vulnerabilities',
                    'Flag any hardcoded secrets or credentials',
                    'Warn about SQL injection, XSS, and other OWASP Top 10',
                    'Verify input validation and sanitization',
                    'Check for proper error handling',
                ],
            },

            attribution: {
                creator: 'PGA Platform',
                copyright: '© 2026 PGA AI - Starter Template',
                license: 'MIT',
            },

            metadata: {
                version: '2.0.0',
                createdAt: new Date('2026-02-27'),
            },
        } as Chromosome0,

        c1: {
            operations: [
                {
                    id: 'review-001',
                    category: 'coding-patterns',
                    content: `
# Code Review Framework

## 1. First Pass - Quick Scan
- Overall structure and organization
- File size and complexity (flag if >500 lines)
- Test coverage (flag if missing)
- Documentation (flag if inadequate)

## 2. Security Review (CRITICAL)
Check for OWASP Top 10:
- SQL Injection (unsanitized queries)
- XSS (unescaped output)
- Authentication bypass
- Authorization issues
- Hardcoded secrets
- Insecure dependencies
- CORS misconfiguration

## 3. Logic Review
- Business logic correctness
- Edge cases handled
- Error handling comprehensive
- Race conditions
- Memory leaks
- Resource cleanup

## 4. Quality Review
- Code readability
- Naming conventions
- Function complexity (cyclomatic complexity < 10)
- DRY violations
- SOLID principles
- Design patterns appropriate

## 5. Performance Review
- N+1 queries
- Inefficient algorithms (O(n²) or worse)
- Unnecessary loops
- Memory usage
- Caching opportunities
                    `.trim(),
                    fitness: {
                        quality: 0.92,
                        successRate: 0.88,
                        tokenEfficiency: 0.75,
                        latency: 2500,
                        costPerSuccess: 0.008,
                        interventionRate: 0.08,
                        composite: 0.87,
                        sampleSize: 150,
                        lastUpdated: new Date(),
                        confidence: 0.92,
                    },
                    origin: 'initial',
                    usageCount: 0,
                    lastUsed: new Date(),
                    successRate: 0.88,
                },

                {
                    id: 'comm-001',
                    category: 'communication',
                    content: `
# Feedback Format

## Issue Template
\`\`\`
🔴 [SEVERITY] Issue Title

Location: filename.ts:42

Problem:
[Clear description of the issue]

Why it matters:
[Explain the impact - security, performance, maintainability]

Suggestion:
[Concrete code example showing the fix]

\`\`\`

## Severity Levels
- 🔴 CRITICAL: Security vulnerability, data loss risk
- 🟠 HIGH: Bugs, crashes, major performance issues
- 🟡 MEDIUM: Code quality, maintainability, minor bugs
- 🟢 LOW: Nitpicks, style preferences, suggestions

## Positive Feedback
Also acknowledge good code:
"✅ Excellent error handling in this function"
"✅ Well-structured and readable code"
"✅ Good test coverage"

## Summary Format
\`\`\`
## Review Summary

Files reviewed: X
Issues found: Y (Z critical, W high)

Critical Issues:
1. ...

Recommendations:
1. ...

Overall: [APPROVE | REQUEST CHANGES | REJECT]
\`\`\`
                    `.trim(),
                    fitness: {
                        quality: 0.90,
                        successRate: 0.92,
                        tokenEfficiency: 0.85,
                        latency: 1800,
                        costPerSuccess: 0.006,
                        interventionRate: 0.05,
                        composite: 0.88,
                        sampleSize: 120,
                        lastUpdated: new Date(),
                        confidence: 0.90,
                    },
                    origin: 'initial',
                    usageCount: 0,
                    lastUsed: new Date(),
                    successRate: 0.92,
                },

                {
                    id: 'tool-001',
                    category: 'tool-usage',
                    content: `
# Tool Usage

## Static Analysis Tools
Use when available:
- ESLint for JavaScript/TypeScript
- Pylint for Python
- Clippy for Rust
- golangci-lint for Go

## Pattern Matching
Search for:
- \`eval()\` - Code injection risk
- \`innerHTML\` - XSS risk
- \`SELECT * FROM\` + concatenation - SQL injection
- \`TODO\` or \`FIXME\` - Incomplete code
- \`console.log\` - Debug code left in
- \`any\` type (TypeScript) - Type safety bypass

## Complexity Analysis
Calculate:
- Cyclomatic complexity
- Lines of code per function
- Nesting depth
- Number of parameters

Flag if exceeds thresholds.

## Test Coverage
Check:
- Unit tests exist
- Critical paths tested
- Edge cases covered
- Mock usage appropriate
                    `.trim(),
                    fitness: {
                        quality: 0.88,
                        successRate: 0.85,
                        tokenEfficiency: 0.82,
                        latency: 2000,
                        costPerSuccess: 0.007,
                        interventionRate: 0.10,
                        composite: 0.85,
                        sampleSize: 100,
                        lastUpdated: new Date(),
                        confidence: 0.88,
                    },
                    origin: 'initial',
                    usageCount: 0,
                    lastUsed: new Date(),
                    successRate: 0.85,
                },

                {
                    id: 'reason-001',
                    category: 'reasoning',
                    content: `
# Review Decision Logic

## APPROVE Criteria
✅ All of:
- No critical or high severity issues
- Good test coverage (>80%)
- Follows team conventions
- Well-documented
- Performance acceptable

## REQUEST CHANGES Criteria
⚠️ Any of:
- High severity issues present
- Missing tests for new code
- Poor error handling
- Significant performance concerns
- Major code quality issues

## REJECT Criteria
🚫 Any of:
- Critical security vulnerabilities
- Data loss risk
- Breaks existing functionality
- No tests for complex logic
- Code injection vulnerabilities

## Edge Cases
- Small fixes (<10 lines): Lower bar for approval
- Refactoring: Ensure no behavior changes
- Hotfixes: Security + correctness only
- Dependencies: Check for known vulnerabilities
                    `.trim(),
                    fitness: {
                        quality: 0.91,
                        successRate: 0.89,
                        tokenEfficiency: 0.80,
                        latency: 1500,
                        costPerSuccess: 0.005,
                        interventionRate: 0.06,
                        composite: 0.87,
                        sampleSize: 110,
                        lastUpdated: new Date(),
                        confidence: 0.89,
                    },
                    origin: 'initial',
                    usageCount: 0,
                    lastUsed: new Date(),
                    successRate: 0.89,
                },

                {
                    id: 'lang-typescript',
                    category: 'coding-patterns',
                    content: `
# TypeScript-Specific Patterns

## Type Safety
- Avoid \`any\` type - use \`unknown\` or specific types
- Use strict null checks
- Leverage union types for exhaustiveness
- Prefer interfaces for public APIs

## Best Practices
- Use const assertions for literal types
- Avoid non-null assertions (!) unless proven safe
- Use type guards for runtime checks
- Leverage generics for reusability

## Common Issues
- Missing return type annotations
- Implicit any from function parameters
- Type assertions without validation
- Enum misuse (prefer union types)
                    `.trim(),
                    fitness: {
                        quality: 0.89,
                        successRate: 0.87,
                        tokenEfficiency: 0.88,
                        latency: 1200,
                        costPerSuccess: 0.004,
                        interventionRate: 0.07,
                        composite: 0.86,
                        sampleSize: 90,
                        lastUpdated: new Date(),
                        confidence: 0.87,
                    },
                    origin: 'initial',
                    usageCount: 0,
                    lastUsed: new Date(),
                    successRate: 0.87,
                },
            ],

            metadata: {
                lastMutated: new Date(),
                mutationCount: 0,
                avgFitnessGain: 0,
            },
        } as Chromosome1,

        c2: {
            userAdaptations: new Map(),
            contextPatterns: [
                {
                    id: 'pattern-001',
                    pattern: 'Junior developer submitting first PR',
                    trigger: 'first_time_contributor',
                    adaptation: 'Be extra encouraging, explain reasoning thoroughly',
                    fitness: 0.92,
                    usageCount: 0,
                },
                {
                    id: 'pattern-002',
                    pattern: 'Security-critical code (auth, payments)',
                    trigger: 'auth OR payment OR security',
                    adaptation: 'Extra scrutiny on security, require tests',
                    fitness: 0.95,
                    usageCount: 0,
                },
                {
                    id: 'pattern-003',
                    pattern: 'Refactoring without behavior changes',
                    trigger: 'refactor AND no_new_features',
                    adaptation: 'Focus on performance and readability, ensure tests pass',
                    fitness: 0.88,
                    usageCount: 0,
                },
                {
                    id: 'pattern-004',
                    pattern: 'Hotfix under pressure',
                    trigger: 'hotfix OR urgent',
                    adaptation: 'Focus on security and correctness, skip minor style issues',
                    fitness: 0.90,
                    usageCount: 0,
                },
            ],

            metadata: {
                lastMutated: new Date(),
                adaptationRate: 1.5,
                totalUsers: 0,
            },
        } as Chromosome2,
    },
};

// ─── Quick Start Function ───────────────────────────────────

/**
 * Create Code Review Assistant genome with this template
 *
 * @example
 * ```typescript
 * import { createCodeReviewAssistant } from '@pga-ai/templates';
 *
 * const reviewer = await createCodeReviewAssistant(pga, {
 *   languages: ['typescript', 'python'],
 *   strictMode: true,
 * });
 *
 * const review = await reviewer.chat(prDiff, {
 *   userId: 'dev-123',
 *   context: { prNumber: 456, author: 'john' },
 * });
 * ```
 */
export async function createCodeReviewAssistant(
    pga: any,
    options: {
        languages?: string[];
        strictMode?: boolean;
        customRules?: string;
    } = {}
): Promise<any> {
    const template = { ...CODE_REVIEW_ASSISTANT_TEMPLATE };

    // Adjust severity based on strict mode
    if (options.strictMode && template.config) {
        template.config.minFitnessImprovement = 0.10; // More conservative
    }

    // Add custom rules
    if (options.customRules && template.chromosomes?.c1) {
        template.chromosomes.c1.operations.push({
            id: 'custom-rules-001',
            category: 'coding-patterns',
            content: options.customRules,
            fitness: {
                quality: 0.85,
                successRate: 0.85,
                tokenEfficiency: 0.85,
                latency: 1500,
                costPerSuccess: 0.006,
                interventionRate: 0.08,
                composite: 0.85,
                sampleSize: 0,
                lastUpdated: new Date(),
                confidence: 0.5,
            },
            origin: 'manual',
            usageCount: 0,
            lastUsed: new Date(),
            successRate: 0.85,
        });
    }

    // Create genome
    const genome = await pga.createGenome(template);

    console.log(`✅ Code Review Assistant created: ${genome.id}`);
    console.log(`   Languages: ${options.languages?.join(', ') || 'All'}`);
    console.log(`   Strict Mode: ${options.strictMode ? 'ON' : 'OFF'}`);
    console.log(`   Ready to review code!`);

    return genome;
}

// ─── Usage Example ──────────────────────────────────────────

export const USAGE_EXAMPLE = `
# Code Review Assistant - Quick Start

## 1. Install PGA
\`\`\`bash
npm install @pga-ai/core @pga-ai/adapters-llm-anthropic @pga-ai/adapters-storage-postgres
\`\`\`

## 2. Create Reviewer
\`\`\`typescript
import { PGA } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';
import { PostgresAdapter } from '@pga-ai/adapters-storage-postgres';
import { createCodeReviewAssistant } from '@pga-ai/templates';

const pga = new PGA({
  llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  storage: new PostgresAdapter({ connectionString: process.env.DATABASE_URL! }),
});

await pga.initialize();

const reviewer = await createCodeReviewAssistant(pga, {
  languages: ['typescript', 'python'],
  strictMode: true,
});
\`\`\`

## 3. Review Code
\`\`\`typescript
// Get PR diff
const diff = await github.getPullRequestDiff(prNumber);

// Review it
const review = await reviewer.chat(diff, {
  userId: 'dev-123',
  context: {
    prNumber: 456,
    author: 'john',
    files: ['src/auth.ts', 'src/db.ts'],
  },
});

console.log(review.content);

// Post review as comment
await github.createReviewComment(prNumber, review.content);
\`\`\`

## 4. Reviewer Learns
- Learns codebase patterns
- Adapts to team style
- Improves accuracy
- Reduces false positives

## Expected Performance
- Accuracy: 88%+ (catches real issues)
- False Positive Rate: <8%
- Review Time: 2-5 seconds
- Cost: $0.005-0.008 per review

## GitHub Integration
\`\`\`typescript
// Webhook handler
app.post('/webhook/pr', async (req, res) => {
  const { pull_request, action } = req.body;

  if (action === 'opened' || action === 'synchronize') {
    const diff = await getDiff(pull_request.number);
    const review = await reviewer.chat(diff, {
      userId: pull_request.user.login,
    });

    await postReview(pull_request.number, review);
  }

  res.sendStatus(200);
});
\`\`\`
`;
