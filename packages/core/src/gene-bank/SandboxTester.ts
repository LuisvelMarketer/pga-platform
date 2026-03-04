import { z } from 'zod';
import { CognitiveGene } from './CognitiveGene';
import type { LLMAdapter } from '../interfaces/LLMAdapter';
import type { MetricsCollector } from '../monitoring/MetricsCollector';

/**
 * SandboxTester.ts
 *
 * Tests genes in a safe sandbox environment before adoption.
 *
 * The Sandbox Tester is a critical safety component that:
 * 1. Tests genes before integration
 * 2. Validates performance and safety
 * 3. Checks for adverse effects
 * 4. Prevents harmful gene adoptions
 *
 * Similar to how immune systems test foreign material, the sandbox
 * ensures that adopted genes improve (not harm) agent performance.
 *
 * @module gene-bank/SandboxTester
 * @version 0.4.0
 */

// ============================================================================
// SANDBOX CONFIGURATION
// ============================================================================

/**
 * Configuration for sandbox testing
 */
export const SandboxConfigSchema = z.object({
    /** Number of test cases to run */
    testCaseCount: z.number().int().min(1).default(5),

    /** Minimum pass rate (0-1) */
    minPassRate: z.number().min(0).max(1).default(0.8),

    /** Minimum performance vs baseline (0-1) */
    minPerformance: z.number().min(0).max(1).default(0.9),

    /** Maximum performance degradation allowed (0-1) */
    maxDegradation: z.number().min(0).max(1).default(0.1),

    /** Timeout per test (ms) */
    testTimeout: z.number().int().min(1000).default(30000),

    /** Whether to run safety checks */
    enableSafetyChecks: z.boolean().default(true),

    /** LLM model for testing */
    testModel: z.string().optional(),

    /** Temperature for testing */
    temperature: z.number().min(0).max(1).default(0.7),
});

export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;

// ============================================================================
// TEST CASE
// ============================================================================

/**
 * A test case for sandbox testing
 */
export interface SandboxTestCase {
    /** Test ID */
    id: string;

    /** Test description */
    description: string;

    /** Input/prompt for test */
    input: string;

    /** Expected output pattern (optional) */
    expectedPattern?: string;

    /** Success criteria function (optional) */
    successCriteria?: (output: string) => boolean;

    /** Timeout override (ms) */
    timeout?: number;
}

// ============================================================================
// TEST RESULT
// ============================================================================

/**
 * Result of a single test case
 */
export interface TestCaseResult {
    /** Test case ID */
    testId: string;

    /** Whether test passed */
    passed: boolean;

    /** Output generated */
    output: string;

    /** Execution time (ms) */
    executionTime: number;

    /** Error message (if failed) */
    error?: string;

    /** Performance score (0-1) */
    performanceScore: number;
}

/**
 * Overall sandbox test result
 */
export interface SandboxTestResult {
    /** Whether all tests passed */
    success: boolean;

    /** Individual test results */
    testResults: TestCaseResult[];

    /** Summary statistics */
    summary: {
        totalTests: number;
        passed: number;
        failed: number;
        passRate: number;
        averagePerformance: number;
        totalExecutionTime: number;
    };

    /** Safety check results */
    safetyChecks: {
        passed: boolean;
        issues: string[];
    };

    /** Recommendation */
    recommendation: 'adopt' | 'reject' | 'needs-review';

    /** Reason for recommendation */
    reason: string;
}

// ============================================================================
// BASELINE COMPARISON
// ============================================================================

/**
 * Baseline performance for comparison
 */
export interface BaselinePerformance {
    /** Test case ID */
    testId: string;

    /** Baseline output */
    output: string;

    /** Baseline performance score */
    performanceScore: number;

    /** Baseline execution time */
    executionTime: number;
}

// ============================================================================
// SANDBOX TESTER CLASS
// ============================================================================

/**
 * Sandbox Tester - Test genes before adoption
 */
export class SandboxTester {
    private config: SandboxConfig;

    constructor(
        private llm: LLMAdapter,
        config?: Partial<SandboxConfig>,
        private metricsCollector?: MetricsCollector
    ) {
        this.config = SandboxConfigSchema.parse(config || {});
    }

    // ========================================================================
    // CORE TESTING
    // ========================================================================

    /**
     * Test a gene in sandbox
     */
    async testGene(
        gene: CognitiveGene,
        testCases: SandboxTestCase[],
        baseline?: BaselinePerformance[]
    ): Promise<SandboxTestResult> {
        const testResults: TestCaseResult[] = [];
        const startTime = Date.now();

        // Run all test cases
        for (const testCase of testCases) {
            const result = await this.runTestCase(gene, testCase);
            testResults.push(result);
        }

        // Calculate summary
        const passed = testResults.filter(r => r.passed).length;
        const failed = testResults.length - passed;
        const passRate = passed / testResults.length;
        const averagePerformance =
            testResults.reduce((sum, r) => sum + r.performanceScore, 0) / testResults.length;
        const totalExecutionTime = Date.now() - startTime;

        // Compare with baseline if provided
        let performanceDelta = 0;
        if (baseline && baseline.length > 0) {
            performanceDelta = this.compareWithBaseline(testResults, baseline);
        }

        // Run safety checks
        const safetyChecks = this.config.enableSafetyChecks
            ? await this.runSafetyChecks(gene, testResults)
            : { passed: true, issues: [] };

        // Make recommendation
        const { recommendation, reason } = this.makeRecommendation(
            passRate,
            averagePerformance,
            performanceDelta,
            safetyChecks
        );

        // Track audit log
        this.metricsCollector?.logAudit({
            level: recommendation === 'adopt' ? 'info' : recommendation === 'reject' ? 'warning' : 'info',
            component: 'SandboxTester',
            operation: 'testGene',
            message: `Sandbox test completed for gene ${gene.id}: ${recommendation} (${reason})`,
            duration: totalExecutionTime,
            metadata: {
                geneId: gene.id,
                geneName: gene.name,
                geneType: gene.type,
                totalTests: testResults.length,
                passed,
                failed,
                passRate,
                averagePerformance,
                performanceDelta,
                recommendation,
                safetyCheckPassed: safetyChecks.passed,
                safetyIssuesCount: safetyChecks.issues.length,
            },
        });

        return {
            success: recommendation === 'adopt',
            testResults,
            summary: {
                totalTests: testResults.length,
                passed,
                failed,
                passRate,
                averagePerformance,
                totalExecutionTime,
            },
            safetyChecks,
            recommendation,
            reason,
        };
    }

    /**
     * Generate baseline performance (run tests without gene)
     */
    async generateBaseline(
        testCases: SandboxTestCase[]
    ): Promise<BaselinePerformance[]> {
        const baseline: BaselinePerformance[] = [];

        for (const testCase of testCases) {
            const startTime = Date.now();

            try {
                // Run test without gene enhancement
                const response = await this.llm.chat([{ role: 'user', content: testCase.input }], {
                    maxTokens: 500,
                    temperature: this.config.temperature,
                });

                const executionTime = Date.now() - startTime;

                // Score baseline performance
                const performanceScore = testCase.successCriteria
                    ? testCase.successCriteria(response.content) ? 1.0 : 0.0
                    : 0.5;

                baseline.push({
                    testId: testCase.id,
                    output: response.content,
                    performanceScore,
                    executionTime,
                });
            } catch (error) {
                baseline.push({
                    testId: testCase.id,
                    output: '',
                    performanceScore: 0,
                    executionTime: Date.now() - startTime,
                });
            }
        }

        return baseline;
    }

    // ========================================================================
    // TEST EXECUTION
    // ========================================================================

    /**
     * Run a single test case
     */
    private async runTestCase(
        gene: CognitiveGene,
        testCase: SandboxTestCase
    ): Promise<TestCaseResult> {
        const startTime = Date.now();

        try {
            // Build enhanced prompt with gene instruction
            const enhancedPrompt = this.buildEnhancedPrompt(gene, testCase.input);

            // Run test with timeout
            const timeout = testCase.timeout || this.config.testTimeout;
            const response = await Promise.race([
                this.llm.chat([{ role: 'user', content: enhancedPrompt }], {
                    maxTokens: 500,
                    temperature: this.config.temperature,
                }),
                this.timeoutPromise(timeout),
            ]);

            const executionTime = Date.now() - startTime;

            // Check success
            let passed = true;
            let performanceScore = 1.0;

            if (testCase.successCriteria) {
                passed = testCase.successCriteria(response.content);
                performanceScore = passed ? 1.0 : 0.0;
            } else if (testCase.expectedPattern) {
                const regex = new RegExp(testCase.expectedPattern, 'i');
                passed = regex.test(response.content);
                performanceScore = passed ? 1.0 : 0.5;
            }

            return {
                testId: testCase.id,
                passed,
                output: response.content,
                executionTime,
                performanceScore,
            };
        } catch (error) {
            return {
                testId: testCase.id,
                passed: false,
                output: '',
                executionTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error',
                performanceScore: 0,
            };
        }
    }

    /**
     * Build enhanced prompt with gene instruction
     */
    private buildEnhancedPrompt(gene: CognitiveGene, input: string): string {
        return `${gene.content.instruction}

${input}`;
    }

    /**
     * Create timeout promise
     */
    private timeoutPromise(ms: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Test timeout')), ms);
        });
    }

    // ========================================================================
    // COMPARISON & ANALYSIS
    // ========================================================================

    /**
     * Compare test results with baseline
     */
    private compareWithBaseline(
        results: TestCaseResult[],
        baseline: BaselinePerformance[]
    ): number {
        let totalDelta = 0;
        let comparisons = 0;

        for (const result of results) {
            const baselineResult = baseline.find(b => b.testId === result.testId);
            if (baselineResult) {
                const delta = result.performanceScore - baselineResult.performanceScore;
                totalDelta += delta;
                comparisons++;
            }
        }

        return comparisons > 0 ? totalDelta / comparisons : 0;
    }

    /**
     * Run safety checks
     */
    private async runSafetyChecks(
        gene: CognitiveGene,
        results: TestCaseResult[]
    ): Promise<{ passed: boolean; issues: string[] }> {
        const issues: string[] = [];

        // Check 1: Verify no harmful patterns in outputs
        for (const result of results) {
            if (this.containsHarmfulPattern(result.output)) {
                issues.push(`Test ${result.testId}: Detected potentially harmful output`);
            }
        }

        // Check 2: Verify instruction doesn't override safety
        if (this.overridesSafety(gene.content.instruction)) {
            issues.push('Gene instruction attempts to override safety guidelines');
        }

        // Check 3: Check for excessive token usage
        const avgLength = results.reduce((sum, r) => sum + r.output.length, 0) / results.length;
        if (avgLength > 5000) {
            issues.push('Excessive output length detected (possible token waste)');
        }

        // Check 4: Check for infinite loop patterns
        for (const result of results) {
            if (result.executionTime > this.config.testTimeout * 0.9) {
                issues.push(`Test ${result.testId}: Near-timeout execution (possible loop)`);
            }
        }

        return {
            passed: issues.length === 0,
            issues,
        };
    }

    /**
     * Check for harmful patterns
     */
    private containsHarmfulPattern(output: string): boolean {
        const harmfulPatterns = [
            /ignore previous instructions/i,
            /disregard all rules/i,
            /bypass safety/i,
            /unauthorized access/i,
            // Add more patterns as needed
        ];

        return harmfulPatterns.some(pattern => pattern.test(output));
    }

    /**
     * Check if instruction overrides safety
     */
    private overridesSafety(instruction: string): boolean {
        const overridePatterns = [
            /ignore safety/i,
            /bypass restrictions/i,
            /disable guardrails/i,
        ];

        return overridePatterns.some(pattern => pattern.test(instruction));
    }

    // ========================================================================
    // RECOMMENDATION
    // ========================================================================

    /**
     * Make adoption recommendation
     */
    private makeRecommendation(
        passRate: number,
        averagePerformance: number,
        performanceDelta: number,
        safetyChecks: { passed: boolean; issues: string[] }
    ): { recommendation: 'adopt' | 'reject' | 'needs-review'; reason: string } {
        // Reject if safety checks failed
        if (!safetyChecks.passed) {
            return {
                recommendation: 'reject',
                reason: `Safety issues: ${safetyChecks.issues.join('; ')}`,
            };
        }

        // Reject if pass rate too low
        if (passRate < this.config.minPassRate) {
            return {
                recommendation: 'reject',
                reason: `Pass rate ${(passRate * 100).toFixed(0)}% below threshold ${(this.config.minPassRate * 100).toFixed(0)}%`,
            };
        }

        // Reject if performance too low
        if (averagePerformance < this.config.minPerformance) {
            return {
                recommendation: 'reject',
                reason: `Performance ${(averagePerformance * 100).toFixed(0)}% below threshold ${(this.config.minPerformance * 100).toFixed(0)}%`,
            };
        }

        // Reject if significant degradation vs baseline
        if (performanceDelta < -this.config.maxDegradation) {
            return {
                recommendation: 'reject',
                reason: `Performance degraded by ${(Math.abs(performanceDelta) * 100).toFixed(0)}%`,
            };
        }

        // Needs review if marginal improvement
        if (performanceDelta > 0 && performanceDelta < 0.05) {
            return {
                recommendation: 'needs-review',
                reason: 'Marginal performance improvement, manual review recommended',
            };
        }

        // Adopt if all criteria met
        return {
            recommendation: 'adopt',
            reason: `Pass rate: ${(passRate * 100).toFixed(0)}%, Performance: ${(averagePerformance * 100).toFixed(0)}%${performanceDelta > 0 ? `, Improvement: +${(performanceDelta * 100).toFixed(0)}%` : ''}`,
        };
    }

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /**
     * Get current configuration
     */
    getConfig(): SandboxConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<SandboxConfig>): void {
        this.config = SandboxConfigSchema.parse({
            ...this.config,
            ...updates,
        });
    }
}
