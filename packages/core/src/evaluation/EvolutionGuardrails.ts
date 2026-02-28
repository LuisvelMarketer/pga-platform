/**
 * Evolution Guardrails - Multi-Gate Promotion System
 *
 * Implements 4-gate validation for mutation promotion:
 * 1. Quality Gate: Fitness threshold
 * 2. Sandbox Gate: Safety validation
 * 3. Economic Gate: Cost efficiency
 * 4. Stability Gate: Rollback rate
 *
 * Living OS v1.0 Must-Have: Production-grade mutation control
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import type { EvolutionGuardrails, PromotionGateResult, EconomicMetrics } from '../types/index.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';

// ─── Candidate Evaluation ───────────────────────────────────

export interface MutationCandidate {
    layer: 0 | 1 | 2;
    gene: string;
    variant: string;
    content: string;

    // Metrics
    fitness: number;
    sandboxScore?: number;
    economicMetrics?: EconomicMetrics;

    // Stability
    sampleCount: number;
    rollbackCount?: number;
}

// ─── Guardrails Manager ─────────────────────────────────────

export class EvolutionGuardrailsManager {
    private defaultGuardrails: EvolutionGuardrails = {
        // Quality Gate: 60% fitness minimum
        minQualityScore: 0.60,

        // Sandbox Gate: 70% pass rate minimum
        minSandboxScore: 0.70,

        // Economic Gate: Must be cost-effective
        minCompressionScore: 0.65,
        maxCostPerTask: 0.10, // $0.10 per task max

        // Stability Gate: Proven over time
        minStabilityWindow: 10,   // At least 10 interactions
        maxRollbackRate: 0.20,    // Max 20% rollback rate

        // Gate mode: ALL gates must pass
        gateMode: 'AND',
    };

    constructor(
        private storage: StorageAdapter,
        private guardrails?: EvolutionGuardrails,
    ) {
        // Merge with defaults
        this.guardrails = {
            ...this.defaultGuardrails,
            ...guardrails,
        };
    }

    /**
     * Evaluate mutation candidate against all gates
     *
     * Returns detailed gate results for transparency
     */
    async evaluateCandidate(
        candidate: MutationCandidate,
        genomeId: string,
    ): Promise<PromotionGateResult> {
        const gates = this.guardrails!;

        // ═══ Gate 1: Quality ═══
        const qualityGate = this.evaluateQualityGate(candidate, gates);

        // ═══ Gate 2: Sandbox ═══
        const sandboxGate = this.evaluateSandboxGate(candidate, gates);

        // ═══ Gate 3: Economic ═══
        const economicGate = await this.evaluateEconomicGate(candidate, genomeId, gates);

        // ═══ Gate 4: Stability ═══
        const stabilityGate = this.evaluateStabilityGate(candidate, gates);

        // ═══ Final Decision ═══
        const allGates = [qualityGate, sandboxGate, economicGate, stabilityGate];
        const passedCount = allGates.filter(g => g.passed).length;

        let finalDecision: 'promote' | 'reject' | 'canary';
        let reason: string;

        if (gates.gateMode === 'AND') {
            // ALL gates must pass
            if (passedCount === 4) {
                finalDecision = 'promote';
                reason = 'All gates passed - promoting to production';
            } else if (passedCount >= 3) {
                // 3/4 gates: canary deployment
                finalDecision = 'canary';
                reason = `${passedCount}/4 gates passed - deploying to canary (5% traffic)`;
            } else {
                finalDecision = 'reject';
                const failedGates = allGates
                    .map((g, i) => !g.passed ? ['Quality', 'Sandbox', 'Economic', 'Stability'][i] : null)
                    .filter(Boolean);
                reason = `Failed gates: ${failedGates.join(', ')}`;
            }
        } else {
            // OR mode: Any gate passing is enough
            if (passedCount >= 1) {
                finalDecision = 'promote';
                reason = `${passedCount}/4 gates passed (OR mode)`;
            } else {
                finalDecision = 'reject';
                reason = 'All gates failed';
            }
        }

        return {
            passed: finalDecision === 'promote',
            gates: {
                quality: qualityGate,
                sandbox: sandboxGate,
                economic: economicGate,
                stability: stabilityGate,
            },
            finalDecision,
            reason,
        };
    }

    /**
     * Gate 1: Quality - Fitness threshold
     */
    private evaluateQualityGate(
        candidate: MutationCandidate,
        gates: EvolutionGuardrails,
    ): { passed: boolean; score: number; threshold: number } {
        const score = candidate.fitness;
        const threshold = gates.minQualityScore;

        return {
            passed: score >= threshold,
            score,
            threshold,
        };
    }

    /**
     * Gate 2: Sandbox - Safety validation
     */
    private evaluateSandboxGate(
        candidate: MutationCandidate,
        gates: EvolutionGuardrails,
    ): { passed: boolean; score: number; threshold: number } {
        const score = candidate.sandboxScore ?? 0;
        const threshold = gates.minSandboxScore;

        return {
            passed: score >= threshold,
            score,
            threshold,
        };
    }

    /**
     * Gate 3: Economic - Cost efficiency
     */
    private async evaluateEconomicGate(
        candidate: MutationCandidate,
        genomeId: string,
        gates: EvolutionGuardrails,
    ): Promise<{ passed: boolean; score: number; threshold: number }> {
        // Calculate economic metrics
        const metrics = await this.calculateEconomicMetrics(candidate, genomeId);

        // Check both compression and cost thresholds
        const compressionPass = metrics.compressionScore >= gates.minCompressionScore;
        const costPass = metrics.costPerTask <= gates.maxCostPerTask;

        const passed = compressionPass && costPass;
        const score = (metrics.compressionScore + (costPass ? 1 : 0)) / 2;

        return {
            passed,
            score,
            threshold: gates.minCompressionScore,
        };
    }

    /**
     * Gate 4: Stability - Proven over time
     */
    private evaluateStabilityGate(
        candidate: MutationCandidate,
        gates: EvolutionGuardrails,
    ): { passed: boolean; score: number; threshold: number } {
        const sampleCount = candidate.sampleCount || 0;
        const rollbackCount = candidate.rollbackCount || 0;

        // Check minimum stability window
        const hasEnoughSamples = sampleCount >= gates.minStabilityWindow;

        // Check rollback rate
        const rollbackRate = sampleCount > 0 ? rollbackCount / sampleCount : 0;
        const lowRollbackRate = rollbackRate <= gates.maxRollbackRate;

        const passed = hasEnoughSamples && lowRollbackRate;
        const score = hasEnoughSamples ? (1 - rollbackRate) : 0;

        return {
            passed,
            score,
            threshold: gates.minStabilityWindow,
        };
    }

    /**
     * Calculate economic metrics for candidate
     */
    private async calculateEconomicMetrics(
        candidate: MutationCandidate,
        genomeId: string,
    ): Promise<EconomicMetrics> {
        // If metrics already provided, use them
        if (candidate.economicMetrics) {
            return candidate.economicMetrics;
        }

        // Otherwise, estimate based on content length and interactions
        // TODO: Use analytics for more accurate economic metrics
        void await this.storage.getAnalytics(genomeId);

        // Estimate tokens (rough: 4 chars per token)
        const estimatedTokens = candidate.content.length / 4;

        // Get average success rate
        const successRate = candidate.fitness;

        // Calculate tokens per success
        const tokensPerSuccess = successRate > 0 ? estimatedTokens / successRate : estimatedTokens;

        // Compression score: Lower tokens = higher score
        // Normalize: 500 tokens = 1.0, 2000 tokens = 0.0
        const compressionScore = Math.max(0, Math.min(1,
            1 - (tokensPerSuccess - 500) / 1500
        ));

        // Estimate cost (assuming $0.003 per 1k tokens for Sonnet)
        const costPerTask = (estimatedTokens / 1000) * 0.003;
        const costPerSuccess = successRate > 0 ? costPerTask / successRate : costPerTask;

        // Estimate latency (default to 2000ms since analytics doesn't track this yet)
        const avgLatencyMs = 2000;
        const p95LatencyMs = avgLatencyMs * 1.5;

        // North Star: Value per dollar
        const valuePerDollar = costPerSuccess > 0 ? successRate / costPerSuccess : 0;

        return {
            tokensPerSuccess,
            compressionScore,
            costPerTask,
            costPerSuccess,
            avgLatencyMs,
            p95LatencyMs,
            valuePerDollar,
        };
    }

    /**
     * Get guardrails configuration
     */
    getGuardrails(): EvolutionGuardrails {
        return { ...this.guardrails! };
    }

    /**
     * Update guardrails configuration
     */
    updateGuardrails(updates: Partial<EvolutionGuardrails>): void {
        this.guardrails = {
            ...this.guardrails!,
            ...updates,
        };
    }

    /**
     * Get guardrails report
     *
     * Human-readable report of current guardrails status
     */
    getGuardrailsReport(): string {
        const g = this.guardrails!;

        const lines: string[] = [];
        lines.push('# 🛡️ Evolution Guardrails Status\n');
        lines.push(`**Gate Mode**: ${g.gateMode} (${g.gateMode === 'AND' ? 'All gates must pass' : 'Any gate passing is enough'})\n`);

        lines.push('## Gate Thresholds\n');
        lines.push(`### 1️⃣ Quality Gate`);
        lines.push(`- Min Fitness: ${(g.minQualityScore * 100).toFixed(0)}%\n`);

        lines.push(`### 2️⃣ Sandbox Gate`);
        lines.push(`- Min Pass Rate: ${(g.minSandboxScore * 100).toFixed(0)}%\n`);

        lines.push(`### 3️⃣ Economic Gate`);
        lines.push(`- Min Compression: ${(g.minCompressionScore * 100).toFixed(0)}%`);
        lines.push(`- Max Cost/Task: $${g.maxCostPerTask.toFixed(4)}\n`);

        lines.push(`### 4️⃣ Stability Gate`);
        lines.push(`- Min Samples: ${g.minStabilityWindow}`);
        lines.push(`- Max Rollback Rate: ${(g.maxRollbackRate * 100).toFixed(0)}%`);

        return lines.join('\n');
    }
}
