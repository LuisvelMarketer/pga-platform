/**
 * Promotion Gate - Mutation Validation & Deployment
 *
 * The gatekeeper that decides which mutations get promoted to production.
 * Implements multi-stage validation to ensure only beneficial mutations deploy.
 *
 * Validation Stages:
 * 1. Security Check - C0 integrity preserved
 * 2. Fitness Check - Improvement exceeds threshold
 * 3. Quality Check - No regression in key metrics
 * 4. Confidence Check - Sufficient sample size
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0
 */

import type { GenomeV2, MutationRecord } from '../types/GenomeV2.js';
import { GenomeKernel } from '../core/GenomeKernel.js';
import { FitnessCalculator } from './FitnessCalculator.js';

// ─── Promotion Config ───────────────────────────────────────

export interface PromotionGateConfig {
    // Fitness thresholds
    minFitnessImprovement: number; // Default: 0.05 (5%)
    minCompositeScore: number; // Default: 0.60 (60%)

    // Quality thresholds
    maxQualityRegression: number; // Default: 0.05 (5% drop allowed)
    maxSuccessRateRegression: number; // Default: 0.03 (3% drop allowed)

    // Confidence thresholds
    minConfidence: number; // Default: 0.70 (70%)
    minSampleSize: number; // Default: 20

    // Safety thresholds
    maxLatencyIncrease: number; // Default: 0.20 (20% slower allowed)
    maxCostIncrease: number; // Default: 0.15 (15% more expensive allowed)

    // Security
    requireIntegrityCheck: boolean; // Default: true
    requireSandboxTest: boolean; // Default: true
}

// ─── Promotion Decision ─────────────────────────────────────

export interface PromotionDecision {
    approved: boolean;
    reason: string;
    confidence: number;
    checks: PromotionCheck[];
    recommendedAction: 'promote' | 'reject' | 'retest' | 'rollback';
}

export interface PromotionCheck {
    name: string;
    passed: boolean;
    message: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
}

// ─── Promotion Gate ────────────────────────────────────────

/**
 * PromotionGate - Validates and approves mutations
 *
 * Multi-stage validation before deploying mutations to production.
 */
export class PromotionGate {
    private config: Required<PromotionGateConfig>;
    private fitnessCalculator: FitnessCalculator;

    constructor(config: Partial<PromotionGateConfig> = {}) {
        this.config = {
            minFitnessImprovement: config.minFitnessImprovement ?? 0.05,
            minCompositeScore: config.minCompositeScore ?? 0.6,
            maxQualityRegression: config.maxQualityRegression ?? 0.05,
            maxSuccessRateRegression: config.maxSuccessRateRegression ?? 0.03,
            minConfidence: config.minConfidence ?? 0.7,
            minSampleSize: config.minSampleSize ?? 20,
            maxLatencyIncrease: config.maxLatencyIncrease ?? 0.2,
            maxCostIncrease: config.maxCostIncrease ?? 0.15,
            requireIntegrityCheck: config.requireIntegrityCheck ?? true,
            requireSandboxTest: config.requireSandboxTest ?? true,
        };

        this.fitnessCalculator = new FitnessCalculator();
    }

    // ─── Main Evaluation ──────────────────────────────────────────

    /**
     * Evaluate mutation for promotion
     *
     * Runs all validation checks and returns decision.
     */
    public async evaluateMutation(
        baseline: GenomeV2,
        mutant: GenomeV2,
        mutation: MutationRecord
    ): Promise<PromotionDecision> {
        const checks: PromotionCheck[] = [];

        // Stage 1: Security Check
        if (this.config.requireIntegrityCheck) {
            checks.push(this.checkIntegrity(mutant));
        }

        // Stage 2: Sandbox Test Check
        if (this.config.requireSandboxTest) {
            checks.push(this.checkSandboxTested(mutation));
        }

        // Stage 3: Fitness Improvement Check
        checks.push(this.checkFitnessImprovement(baseline, mutant));

        // Stage 4: Quality Regression Check
        checks.push(this.checkQualityRegression(baseline, mutant));

        // Stage 5: Success Rate Regression Check
        checks.push(this.checkSuccessRateRegression(baseline, mutant));

        // Stage 6: Confidence Check
        checks.push(this.checkConfidence(mutant));

        // Stage 7: Latency Check
        checks.push(this.checkLatency(baseline, mutant));

        // Stage 8: Cost Check
        checks.push(this.checkCost(baseline, mutant));

        // Evaluate decision
        const decision = this.computeDecision(checks);

        return decision;
    }

    // ─── Individual Checks ────────────────────────────────────────

    /**
     * Check C0 integrity
     */
    private checkIntegrity(mutant: GenomeV2): PromotionCheck {
        try {
            const kernel = new GenomeKernel(mutant, { strictMode: false });
            const valid = kernel.verifyIntegrity();

            return {
                name: 'C0 Integrity',
                passed: valid && !mutant.integrity.quarantined,
                message: valid
                    ? 'C0 integrity verified'
                    : `C0 integrity violation detected (${mutant.integrity.violations} violations)`,
                severity: 'critical',
            };
        } catch (error) {
            return {
                name: 'C0 Integrity',
                passed: false,
                message: `Integrity check failed: ${(error as Error).message}`,
                severity: 'critical',
            };
        }
    }

    /**
     * Check if mutation was sandbox tested
     */
    private checkSandboxTested(mutation: MutationRecord): PromotionCheck {
        if (!mutation.sandboxTested) {
            return {
                name: 'Sandbox Test',
                passed: false,
                message: 'Mutation was not sandbox tested',
                severity: 'critical',
            };
        }

        if (!mutation.testResults) {
            return {
                name: 'Sandbox Test',
                passed: false,
                message: 'Sandbox test results not available',
                severity: 'high',
            };
        }

        return {
            name: 'Sandbox Test',
            passed: mutation.testResults.success,
            message: mutation.testResults.success
                ? 'Sandbox tests passed'
                : 'Sandbox tests failed',
            severity: 'critical',
        };
    }

    /**
     * Check fitness improvement
     */
    private checkFitnessImprovement(baseline: GenomeV2, mutant: GenomeV2): PromotionCheck {
        const improvement = this.fitnessCalculator.computeImprovement(
            baseline.fitness,
            mutant.fitness
        );

        const passed = improvement >= this.config.minFitnessImprovement;

        return {
            name: 'Fitness Improvement',
            passed,
            message: passed
                ? `Fitness improved by ${(improvement * 100).toFixed(1)}%`
                : `Insufficient improvement: ${(improvement * 100).toFixed(1)}% ` +
                  `(required: ${(this.config.minFitnessImprovement * 100).toFixed(1)}%)`,
            severity: 'high',
        };
    }

    /**
     * Check quality regression
     */
    private checkQualityRegression(baseline: GenomeV2, mutant: GenomeV2): PromotionCheck {
        const qualityDrop = baseline.fitness.quality - mutant.fitness.quality;
        const passed = qualityDrop <= this.config.maxQualityRegression;

        return {
            name: 'Quality Regression',
            passed,
            message: passed
                ? `Quality maintained (drop: ${(qualityDrop * 100).toFixed(1)}%)`
                : `Quality regression detected: ${(qualityDrop * 100).toFixed(1)}% ` +
                  `(max allowed: ${(this.config.maxQualityRegression * 100).toFixed(1)}%)`,
            severity: 'high',
        };
    }

    /**
     * Check success rate regression
     */
    private checkSuccessRateRegression(baseline: GenomeV2, mutant: GenomeV2): PromotionCheck {
        const drop = baseline.fitness.successRate - mutant.fitness.successRate;
        const passed = drop <= this.config.maxSuccessRateRegression;

        return {
            name: 'Success Rate Regression',
            passed,
            message: passed
                ? `Success rate maintained (drop: ${(drop * 100).toFixed(1)}%)`
                : `Success rate regression: ${(drop * 100).toFixed(1)}% ` +
                  `(max allowed: ${(this.config.maxSuccessRateRegression * 100).toFixed(1)}%)`,
            severity: 'high',
        };
    }

    /**
     * Check confidence level
     */
    private checkConfidence(mutant: GenomeV2): PromotionCheck {
        const confidence = mutant.fitness.confidence;
        const sampleSize = mutant.fitness.sampleSize;

        const passed =
            confidence >= this.config.minConfidence &&
            sampleSize >= this.config.minSampleSize;

        return {
            name: 'Confidence',
            passed,
            message: passed
                ? `Confidence: ${(confidence * 100).toFixed(0)}%, Sample: ${sampleSize}`
                : `Insufficient confidence: ${(confidence * 100).toFixed(0)}% ` +
                  `(required: ${(this.config.minConfidence * 100).toFixed(0)}%), ` +
                  `Sample: ${sampleSize} (required: ${this.config.minSampleSize})`,
            severity: 'medium',
        };
    }

    /**
     * Check latency increase
     */
    private checkLatency(baseline: GenomeV2, mutant: GenomeV2): PromotionCheck {
        const increase = (mutant.fitness.latency - baseline.fitness.latency) / baseline.fitness.latency;
        const passed = increase <= this.config.maxLatencyIncrease;

        return {
            name: 'Latency',
            passed,
            message: passed
                ? `Latency acceptable (${mutant.fitness.latency.toFixed(0)}ms, ` +
                  `+${(increase * 100).toFixed(1)}%)`
                : `Latency increased too much: +${(increase * 100).toFixed(1)}% ` +
                  `(max allowed: +${(this.config.maxLatencyIncrease * 100).toFixed(1)}%)`,
            severity: 'medium',
        };
    }

    /**
     * Check cost increase
     */
    private checkCost(baseline: GenomeV2, mutant: GenomeV2): PromotionCheck {
        const increase =
            (mutant.fitness.costPerSuccess - baseline.fitness.costPerSuccess) /
            baseline.fitness.costPerSuccess;
        const passed = increase <= this.config.maxCostIncrease;

        return {
            name: 'Cost',
            passed,
            message: passed
                ? `Cost acceptable ($${mutant.fitness.costPerSuccess.toFixed(4)}, ` +
                  `+${(increase * 100).toFixed(1)}%)`
                : `Cost increased too much: +${(increase * 100).toFixed(1)}% ` +
                  `(max allowed: +${(this.config.maxCostIncrease * 100).toFixed(1)}%)`,
            severity: 'low',
        };
    }

    // ─── Decision Logic ───────────────────────────────────────────

    /**
     * Compute final promotion decision
     */
    private computeDecision(checks: PromotionCheck[]): PromotionDecision {
        const failed = checks.filter((c) => !c.passed);
        const criticalFailures = failed.filter((c) => c.severity === 'critical');
        const highFailures = failed.filter((c) => c.severity === 'high');

        // Critical failures = immediate reject
        if (criticalFailures.length > 0) {
            return {
                approved: false,
                reason: `Critical checks failed: ${criticalFailures.map((c) => c.name).join(', ')}`,
                confidence: 0,
                checks,
                recommendedAction: 'rollback',
            };
        }

        // High severity failures = reject
        if (highFailures.length > 1) {
            return {
                approved: false,
                reason: `Multiple high-severity checks failed: ${highFailures.map((c) => c.name).join(', ')}`,
                confidence: 0.3,
                checks,
                recommendedAction: 'reject',
            };
        }

        // One high failure = retest
        if (highFailures.length === 1) {
            return {
                approved: false,
                reason: `High-severity check failed: ${highFailures[0].name}`,
                confidence: 0.5,
                checks,
                recommendedAction: 'retest',
            };
        }

        // Medium/low failures = warning but approve
        if (failed.length > 0 && failed.length <= 2) {
            const passedCount = checks.length - failed.length;
            const confidence = passedCount / checks.length;

            return {
                approved: true,
                reason: `Approved with warnings: ${failed.map((c) => c.name).join(', ')}`,
                confidence,
                checks,
                recommendedAction: 'promote',
            };
        }

        // All checks passed
        return {
            approved: true,
            reason: 'All checks passed',
            confidence: 1.0,
            checks,
            recommendedAction: 'promote',
        };
    }

    // ─── Utilities ────────────────────────────────────────────────

    /**
     * Get human-readable report
     */
    public generateReport(decision: PromotionDecision): string {
        const lines: string[] = [];

        lines.push('═══════════════════════════════════════');
        lines.push('  PROMOTION GATE EVALUATION REPORT');
        lines.push('═══════════════════════════════════════');
        lines.push('');

        // Decision
        lines.push(`Decision: ${decision.approved ? '✅ APPROVED' : '❌ REJECTED'}`);
        lines.push(`Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
        lines.push(`Recommended Action: ${decision.recommendedAction.toUpperCase()}`);
        lines.push(`Reason: ${decision.reason}`);
        lines.push('');

        // Checks
        lines.push('Checks:');
        for (const check of decision.checks) {
            const icon = check.passed ? '✅' : '❌';
            const severity = `[${check.severity.toUpperCase()}]`;
            lines.push(`  ${icon} ${check.name} ${severity}`);
            lines.push(`     ${check.message}`);
        }

        lines.push('═══════════════════════════════════════');

        return lines.join('\n');
    }

    /**
     * Get config
     */
    public getConfig(): Required<PromotionGateConfig> {
        return { ...this.config };
    }

    /**
     * Update config
     */
    public updateConfig(config: Partial<PromotionGateConfig>): void {
        this.config = { ...this.config, ...config };
    }
}
