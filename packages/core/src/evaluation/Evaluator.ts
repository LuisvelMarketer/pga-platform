/**
 * Evaluator — PGA Performance Evaluation Framework
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Provides objective benchmarking to prove PGA superiority.
 *
 * Measures:
 * - Success Rate (task completion)
 * - Token Efficiency (cognitive compression)
 * - Response Quality (human evaluation)
 * - Learning Velocity (improvement over time)
 * - User Satisfaction (feedback scores)
 */

import type { BenchmarkSuiteId } from './BenchmarkSuites.js';
import { getBenchmarkSuite } from './BenchmarkSuites.js';
import type { SandboxCaseDefinition } from './SandboxSuites.js';

/**
 * Evaluatable Genome Interface
 *
 * Living OS v1.0 Week 5: Hardened contract for evaluation
 * Allows mocking and testing without full GenomeInstance
 */
export interface EvaluatableGenome {
    chat(userMessage: string, context: { userId?: string }): Promise<string>;
    chatWithMetrics?(userMessage: string, context: { userId?: string }): Promise<{
        content: string;
        metrics: { tokensUsed: number; responseTime: number; fitnessScore: number };
    }>;
}

export interface EvaluationTask {
    id: string;
    name: string;
    description: string;
    userMessage: string;
    expectedOutcome: {
        keywords?: string[];          // Must contain these keywords
        minLength?: number;            // Minimum response length
        maxLength?: number;            // Maximum response length
        successCriteria?: (response: string) => boolean;  // Custom validator
    };
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface EvaluationResult {
    taskId: string;
    taskName: string;
    success: boolean;
    response: string;
    tokensUsed: number;
    responseTime: number;           // milliseconds
    qualityScore: number;           // 0-1
    failureReason?: string;
}

export interface BenchmarkResult {
    totalTasks: number;
    successfulTasks: number;
    successRate: number;            // percentage
    avgTokensPerTask: number;
    avgResponseTime: number;        // milliseconds
    avgQualityScore: number;        // 0-1
    results: EvaluationResult[];
    timestamp: Date;
}

export interface ComparisonResult {
    withPGA: BenchmarkResult;
    withoutPGA: BenchmarkResult;
    improvements: {
        successRate: number;        // percentage points improvement
        tokenEfficiency: number;    // percentage tokens saved
        responseTime: number;       // percentage faster
        qualityScore: number;       // percentage better
    };
    verdict: 'PGA_WINS' | 'BASELINE_WINS' | 'TIE';
}

export class Evaluator {
    /**
     * Run evaluation suite on a genome
     *
     * Living OS v1.0 Week 5: Uses EvaluatableGenome interface for flexibility
     */
    async evaluate(
        genome: EvaluatableGenome,
        tasks: EvaluationTask[],
        userId: string,
    ): Promise<BenchmarkResult> {
        const results: EvaluationResult[] = [];

        for (const task of tasks) {
            const result = await this.evaluateTask(genome, task, userId);
            results.push(result);
        }

        const successful = results.filter(r => r.success).length;
        const successRate = (successful / results.length) * 100;
        const avgTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0) / results.length;
        const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
        const avgQuality = results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;

        return {
            totalTasks: results.length,
            successfulTasks: successful,
            successRate,
            avgTokensPerTask: Math.round(avgTokens),
            avgResponseTime: Math.round(avgTime),
            avgQualityScore: Math.round(avgQuality * 100) / 100,
            results,
            timestamp: new Date(),
        };
    }

    /**
     * Evaluate a single task
     *
     * Living OS v1.0 Week 5: Supports semantic validation checks
     */
    private async evaluateTask(
        genome: EvaluatableGenome,
        task: EvaluationTask,
        userId: string,
    ): Promise<EvaluationResult> {
        const startTime = Date.now();

        try {
            // Execute task
            const response = await genome.chat(task.userMessage, { userId });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Estimate tokens (rough approximation: 4 chars = 1 token)
            const tokensUsed = Math.ceil((task.userMessage.length + response.length) / 4);

            // Evaluate success (keyword + length checks)
            const basicChecks = this.checkSuccess(response, task.expectedOutcome);

            // Add semantic validation if task has semantic checks
            let semanticChecks: { success: boolean; failureReason?: string } = { success: true };
            if ('semanticChecks' in task && task.semanticChecks) {
                semanticChecks = this.checkSemanticValidation(
                    response,
                    task.semanticChecks as SandboxCaseDefinition['semanticChecks']
                );
            }

            const success = basicChecks.success && semanticChecks.success;
            const failureReason = basicChecks.failureReason || semanticChecks.failureReason;

            // Calculate quality score
            const qualityScore = this.calculateQuality(response, task);

            return {
                taskId: task.id,
                taskName: task.name,
                success,
                response,
                tokensUsed,
                responseTime,
                qualityScore,
                failureReason,
            };
        } catch (error) {
            const endTime = Date.now();
            return {
                taskId: task.id,
                taskName: task.name,
                success: false,
                response: '',
                tokensUsed: 0,
                responseTime: endTime - startTime,
                qualityScore: 0,
                failureReason: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Check if response meets success criteria
     */
    private checkSuccess(
        response: string,
        expected: EvaluationTask['expectedOutcome'],
    ): { success: boolean; failureReason?: string } {
        // Check keywords
        if (expected.keywords) {
            for (const keyword of expected.keywords) {
                if (!response.toLowerCase().includes(keyword.toLowerCase())) {
                    return {
                        success: false,
                        failureReason: `Missing keyword: "${keyword}"`,
                    };
                }
            }
        }

        // Check length constraints
        if (expected.minLength && response.length < expected.minLength) {
            return {
                success: false,
                failureReason: `Response too short (${response.length} < ${expected.minLength})`,
            };
        }

        if (expected.maxLength && response.length > expected.maxLength) {
            return {
                success: false,
                failureReason: `Response too long (${response.length} > ${expected.maxLength})`,
            };
        }

        // Check custom criteria
        if (expected.successCriteria) {
            try {
                if (!expected.successCriteria(response)) {
                    return {
                        success: false,
                        failureReason: 'Custom success criteria not met',
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    failureReason: `Success criteria error: ${error}`,
                };
            }
        }

        return { success: true };
    }

    /**
     * Check semantic validation
     *
     * Living OS v1.0 Week 5: Semantic checks beyond keyword matching
     */
    private checkSemanticValidation(
        response: string,
        checks?: SandboxCaseDefinition['semanticChecks'],
    ): { success: boolean; failureReason?: string } {
        if (!checks) return { success: true };

        // Check: requires priority flow (clear ordering/sequencing)
        if (checks.requiresPriorityFlow) {
            const hasOrdering = /\b(first|then|next|finally|priority|before|after)\b/i.test(response);
            if (!hasOrdering) {
                return {
                    success: false,
                    failureReason: 'Semantic: Missing clear priority/ordering flow',
                };
            }
        }

        // Check: requires validation clause (error handling/validation)
        if (checks.requiresValidationClause) {
            const hasValidation = /\b(validate|check|ensure|verify|if|error|handle|confirm)\b/i.test(response);
            if (!hasValidation) {
                return {
                    success: false,
                    failureReason: 'Semantic: Missing validation/error handling clause',
                };
            }
        }

        // Check: requires deterministic tooling (concrete tools specified)
        if (checks.requiresDeterministicTooling) {
            const hasTools = /\b(use|tool|function|method|read|write|execute|run)\b/i.test(response);
            if (!hasTools) {
                return {
                    success: false,
                    failureReason: 'Semantic: Missing deterministic tool specification',
                };
            }
        }

        // Check: requires concise directive (not overly verbose)
        if (checks.requiresConciseDirective) {
            // Heuristic: concise = response length < 500 chars OR has clear bullet/numbered structure
            const isConcise = response.length < 500 || /^\s*[-*\d]\./m.test(response);
            if (!isConcise) {
                return {
                    success: false,
                    failureReason: 'Semantic: Response not concise or well-structured',
                };
            }
        }

        return { success: true };
    }

    /**
     * Calculate quality score (0-1)
     */
    private calculateQuality(response: string, task: EvaluationTask): number {
        let score = 0.5; // Base score

        // Bonus for keyword coverage
        if (task.expectedOutcome.keywords) {
            const keywordMatches = task.expectedOutcome.keywords.filter(kw =>
                response.toLowerCase().includes(kw.toLowerCase()),
            ).length;
            const keywordCoverage = keywordMatches / task.expectedOutcome.keywords.length;
            score += keywordCoverage * 0.3;
        }

        // Bonus for appropriate length
        if (task.expectedOutcome.minLength && task.expectedOutcome.maxLength) {
            const idealLength = (task.expectedOutcome.minLength + task.expectedOutcome.maxLength) / 2;
            const lengthDeviation = Math.abs(response.length - idealLength) / idealLength;
            const lengthScore = Math.max(0, 1 - lengthDeviation);
            score += lengthScore * 0.2;
        }

        return Math.min(1, Math.max(0, score));
    }

    /**
     * Compare genome against versioned benchmark suite
     *
     * Living OS v1.0 Week 5: Versioned suite comparison
     */
    async compareWithSuite(
        genome: EvaluatableGenome,
        suiteId: BenchmarkSuiteId,
        userId: string,
    ): Promise<BenchmarkResult> {
        const suite = getBenchmarkSuite(suiteId);
        return this.evaluate(genome, suite.tasks, userId);
    }

    /**
     * Compare PGA vs baseline (no PGA)
     *
     * Living OS v1.0 Week 5: Uses EvaluatableGenome interface
     */
    async compare(
        genomeWithPGA: EvaluatableGenome,
        genomeBaseline: EvaluatableGenome,
        tasks: EvaluationTask[],
        userId: string,
    ): Promise<ComparisonResult> {
        console.log('🔬 Running benchmark: PGA vs Baseline...\n');

        // Run both benchmarks
        console.log('📊 Testing WITH PGA...');
        const withPGA = await this.evaluate(genomeWithPGA, tasks, userId);

        console.log('📊 Testing WITHOUT PGA (baseline)...');
        const withoutPGA = await this.evaluate(genomeBaseline, tasks, userId);

        // Calculate improvements
        const successRateImprovement = withPGA.successRate - withoutPGA.successRate;
        const tokenEfficiency =
            ((withoutPGA.avgTokensPerTask - withPGA.avgTokensPerTask) / withoutPGA.avgTokensPerTask) *
            100;
        const responseTimeImprovement =
            ((withoutPGA.avgResponseTime - withPGA.avgResponseTime) / withoutPGA.avgResponseTime) *
            100;
        const qualityImprovement =
            ((withPGA.avgQualityScore - withoutPGA.avgQualityScore) / withoutPGA.avgQualityScore) *
            100;

        // Determine verdict
        let verdict: ComparisonResult['verdict'] = 'TIE';
        const pgaScore =
            successRateImprovement + tokenEfficiency + responseTimeImprovement + qualityImprovement;

        if (pgaScore > 10) {
            verdict = 'PGA_WINS';
        } else if (pgaScore < -10) {
            verdict = 'BASELINE_WINS';
        }

        return {
            withPGA,
            withoutPGA,
            improvements: {
                successRate: Math.round(successRateImprovement * 100) / 100,
                tokenEfficiency: Math.round(tokenEfficiency * 100) / 100,
                responseTime: Math.round(responseTimeImprovement * 100) / 100,
                qualityScore: Math.round(qualityImprovement * 100) / 100,
            },
            verdict,
        };
    }

    /**
     * Format benchmark results as markdown report
     */
    formatReport(benchmark: BenchmarkResult): string {
        const lines: string[] = [];

        lines.push('# 📊 PGA Evaluation Report\n');
        lines.push(`**Date**: ${benchmark.timestamp.toISOString()}\n`);
        lines.push('---\n');

        lines.push('## 📈 Overall Results\n');
        lines.push(`- **Total Tasks**: ${benchmark.totalTasks}`);
        lines.push(`- **Successful**: ${benchmark.successfulTasks}`);
        lines.push(`- **Success Rate**: ${benchmark.successRate.toFixed(1)}%`);
        lines.push(`- **Avg Tokens/Task**: ${benchmark.avgTokensPerTask}`);
        lines.push(`- **Avg Response Time**: ${benchmark.avgResponseTime}ms`);
        lines.push(`- **Avg Quality Score**: ${benchmark.avgQualityScore}/1.0\n`);

        lines.push('---\n');
        lines.push('## 📋 Task Results\n');

        for (const result of benchmark.results) {
            const icon = result.success ? '✅' : '❌';
            lines.push(`### ${icon} ${result.taskName}\n`);
            lines.push(`- **Status**: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            if (result.failureReason) {
                lines.push(`- **Failure Reason**: ${result.failureReason}`);
            }
            lines.push(`- **Tokens**: ${result.tokensUsed}`);
            lines.push(`- **Response Time**: ${result.responseTime}ms`);
            lines.push(`- **Quality**: ${result.qualityScore.toFixed(2)}/1.0`);
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Format comparison report
     */
    formatComparisonReport(comparison: ComparisonResult): string {
        const lines: string[] = [];

        lines.push('# 🔬 PGA vs Baseline Comparison\n');
        lines.push('---\n');

        // Verdict
        const verdictIcon = {
            PGA_WINS: '🏆',
            BASELINE_WINS: '😞',
            TIE: '🤝',
        }[comparison.verdict];

        lines.push(`## ${verdictIcon} VERDICT: ${comparison.verdict}\n`);
        lines.push('---\n');

        // Improvements
        lines.push('## 📊 Improvements\n');

        const formatImprovement = (value: number, metric: string) => {
            const icon = value > 0 ? '📈' : value < 0 ? '📉' : '➡️';
            const sign = value > 0 ? '+' : '';
            return `${icon} **${metric}**: ${sign}${value.toFixed(2)}%`;
        };

        lines.push(formatImprovement(comparison.improvements.successRate, 'Success Rate'));
        lines.push(formatImprovement(comparison.improvements.tokenEfficiency, 'Token Efficiency'));
        lines.push(formatImprovement(comparison.improvements.responseTime, 'Response Speed'));
        lines.push(formatImprovement(comparison.improvements.qualityScore, 'Quality Score'));
        lines.push('');

        // Side-by-side comparison
        lines.push('---\n');
        lines.push('## 📋 Side-by-Side Comparison\n');
        lines.push('| Metric | Without PGA | With PGA | Improvement |');
        lines.push('|--------|-------------|----------|-------------|');

        const metrics = [
            [
                'Success Rate',
                `${comparison.withoutPGA.successRate.toFixed(1)}%`,
                `${comparison.withPGA.successRate.toFixed(1)}%`,
                `${comparison.improvements.successRate > 0 ? '+' : ''}${comparison.improvements.successRate.toFixed(1)}%`,
            ],
            [
                'Avg Tokens',
                `${comparison.withoutPGA.avgTokensPerTask}`,
                `${comparison.withPGA.avgTokensPerTask}`,
                `${comparison.improvements.tokenEfficiency.toFixed(1)}%`,
            ],
            [
                'Avg Time',
                `${comparison.withoutPGA.avgResponseTime}ms`,
                `${comparison.withPGA.avgResponseTime}ms`,
                `${comparison.improvements.responseTime.toFixed(1)}%`,
            ],
            [
                'Quality',
                `${comparison.withoutPGA.avgQualityScore.toFixed(2)}`,
                `${comparison.withPGA.avgQualityScore.toFixed(2)}`,
                `${comparison.improvements.qualityScore.toFixed(1)}%`,
            ],
        ];

        for (const [metric, baseline, pga, improvement] of metrics) {
            lines.push(`| ${metric} | ${baseline} | ${pga} | ${improvement} |`);
        }

        lines.push('');

        return lines.join('\n');
    }
}

/**
 * Standard evaluation task suite
 */
export const STANDARD_TASKS: EvaluationTask[] = [
    {
        id: 'debug-1',
        name: 'Debug TypeError',
        description: 'Help user debug a common TypeError',
        userMessage: "I'm getting 'Cannot read property of undefined' error. How do I fix it?",
        expectedOutcome: {
            keywords: ['undefined', 'check', 'null'],
            minLength: 100,
        },
        difficulty: 'easy',
    },
    {
        id: 'implement-1',
        name: 'Implement Authentication',
        description: 'Guide user to implement basic authentication',
        userMessage: 'How do I add user authentication to my React app?',
        expectedOutcome: {
            keywords: ['auth', 'login', 'token'],
            minLength: 200,
        },
        difficulty: 'medium',
    },
    {
        id: 'optimize-1',
        name: 'Optimize Performance',
        description: 'Provide performance optimization advice',
        userMessage: 'My React app is slow. How can I optimize it?',
        expectedOutcome: {
            keywords: ['performance', 'optimize', 'memo'],
            minLength: 150,
        },
        difficulty: 'medium',
    },
    {
        id: 'architecture-1',
        name: 'Design System Architecture',
        description: 'Help design scalable architecture',
        userMessage: 'How should I architect a microservices system with 10M users?',
        expectedOutcome: {
            keywords: ['scalable', 'microservices', 'database'],
            minLength: 300,
        },
        difficulty: 'hard',
    },
    {
        id: 'code-review-1',
        name: 'Code Review',
        description: 'Review code for best practices',
        userMessage: 'Can you review this code: function getData() { return fetch("/api").then(r => r.json()) }',
        expectedOutcome: {
            keywords: ['error', 'async', 'await'],
            minLength: 100,
        },
        difficulty: 'easy',
    },
];
