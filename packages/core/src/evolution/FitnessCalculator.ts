/**
 * Fitness Calculator - Multi-Objective Optimization
 *
 * Computes comprehensive fitness scores from raw interaction data.
 * Implements the multi-dimensional fitness vector approach.
 *
 * Formula:
 * F(g) = weighted_sum(Quality, SuccessRate, TokenEfficiency, Latency, Cost, Intervention)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0
 */

import type { FitnessVector, FitnessWeights } from '../types/GenomeV2.js';

// ─── Raw Interaction Data ───────────────────────────────────

export interface InteractionData {
    success: boolean;
    quality: number; // 0-1: Quality assessment
    inputTokens: number;
    outputTokens: number;
    latency: number; // milliseconds
    model: string;
    interventionNeeded: boolean; // Did human have to correct?
    timestamp: Date;
}

// ─── Model Pricing ──────────────────────────────────────────

interface ModelPricing {
    inputCostPer1M: number; // USD per 1M input tokens
    outputCostPer1M: number; // USD per 1M output tokens
}

// Default pricing (as of 2026)
const DEFAULT_PRICING: Record<string, ModelPricing> = {
    'claude-sonnet-4.5': { inputCostPer1M: 3.0, outputCostPer1M: 15.0 },
    'claude-opus-4': { inputCostPer1M: 15.0, outputCostPer1M: 75.0 },
    'claude-haiku-3': { inputCostPer1M: 0.25, outputCostPer1M: 1.25 },
    'gpt-4-turbo-preview': { inputCostPer1M: 10.0, outputCostPer1M: 30.0 },
    'gpt-4': { inputCostPer1M: 30.0, outputCostPer1M: 60.0 },
    'gpt-3.5-turbo': { inputCostPer1M: 0.5, outputCostPer1M: 1.5 },
};

// ─── Fitness Calculator Config ──────────────────────────────

export interface FitnessCalculatorConfig {
    // Fitness weights
    weights?: FitnessWeights;

    // Normalization parameters
    worstLatency?: number; // Default: 5000ms
    bestLatency?: number; // Default: 100ms
    worstCost?: number; // Default: $1.00 per success
    bestCost?: number; // Default: $0.001 per success

    // Model pricing (custom)
    modelPricing?: Record<string, ModelPricing>;
}

// ─── Fitness Calculator ─────────────────────────────────────

/**
 * FitnessCalculator - Compute multi-dimensional fitness
 *
 * Transforms raw interaction data into comprehensive fitness vector.
 */
export class FitnessCalculator {
    private config: Required<FitnessCalculatorConfig>;

    constructor(config: FitnessCalculatorConfig = {}) {
        this.config = {
            weights: config.weights ?? {
                quality: 0.3,
                successRate: 0.25,
                tokenEfficiency: 0.2,
                latency: 0.1,
                costPerSuccess: 0.1,
                interventionRate: 0.05,
            },
            worstLatency: config.worstLatency ?? 5000,
            bestLatency: config.bestLatency ?? 100,
            worstCost: config.worstCost ?? 1.0,
            bestCost: config.bestCost ?? 0.001,
            modelPricing: config.modelPricing ?? DEFAULT_PRICING,
        };
    }

    // ─── Compute Fitness Vector ──────────────────────────────────

    /**
     * Compute comprehensive fitness from interactions
     *
     * @param interactions - Array of interaction data
     * @returns Complete fitness vector
     */
    public computeFitness(interactions: InteractionData[]): FitnessVector {
        if (interactions.length === 0) {
            return this.createZeroFitness();
        }

        // Compute individual dimensions
        const quality = this.computeQuality(interactions);
        const successRate = this.computeSuccessRate(interactions);
        const tokenEfficiency = this.computeTokenEfficiency(interactions);
        const latency = this.computeAverageLatency(interactions);
        const costPerSuccess = this.computeCostPerSuccess(interactions);
        const interventionRate = this.computeInterventionRate(interactions);

        // Normalize dimensions (0-1 scale)
        const normalizedLatency = this.normalizeLatency(latency);
        const normalizedCost = this.normalizeCost(costPerSuccess);

        // Compute composite fitness (weighted average)
        const composite = this.computeComposite({
            quality,
            successRate,
            tokenEfficiency,
            latency: normalizedLatency,
            costPerSuccess: normalizedCost,
            interventionRate: 1 - interventionRate, // Lower is better
        });

        // Compute confidence (based on sample size)
        const confidence = this.computeConfidence(interactions.length);

        return {
            quality,
            successRate,
            tokenEfficiency,
            latency, // Keep raw value
            costPerSuccess, // Keep raw value
            interventionRate,
            composite,
            sampleSize: interactions.length,
            lastUpdated: new Date(),
            confidence,
        };
    }

    // ─── Individual Dimension Calculations ────────────────────────

    /**
     * Compute average quality score (0-1)
     */
    private computeQuality(interactions: InteractionData[]): number {
        const sum = interactions.reduce((acc, i) => acc + i.quality, 0);
        return sum / interactions.length;
    }

    /**
     * Compute success rate (0-1)
     */
    private computeSuccessRate(interactions: InteractionData[]): number {
        const successful = interactions.filter((i) => i.success).length;
        return successful / interactions.length;
    }

    /**
     * Compute token efficiency (0-1)
     *
     * Higher score = fewer tokens per successful interaction
     */
    private computeTokenEfficiency(interactions: InteractionData[]): number {
        const successful = interactions.filter((i) => i.success);

        if (successful.length === 0) {
            return 0;
        }

        const totalTokens = successful.reduce(
            (acc, i) => acc + i.inputTokens + i.outputTokens,
            0
        );

        const avgTokensPerSuccess = totalTokens / successful.length;

        // Normalize: assume 5000 tokens is worst, 500 is best
        const worstTokens = 5000;
        const bestTokens = 500;

        const normalized = 1 - (avgTokensPerSuccess - bestTokens) / (worstTokens - bestTokens);

        return Math.max(0, Math.min(1, normalized));
    }

    /**
     * Compute average latency (milliseconds)
     */
    private computeAverageLatency(interactions: InteractionData[]): number {
        const sum = interactions.reduce((acc, i) => acc + i.latency, 0);
        return sum / interactions.length;
    }

    /**
     * Compute cost per successful interaction (USD)
     */
    private computeCostPerSuccess(interactions: InteractionData[]): number {
        const successful = interactions.filter((i) => i.success);

        if (successful.length === 0) {
            return 0;
        }

        let totalCost = 0;

        for (const interaction of successful) {
            const pricing = this.config.modelPricing[interaction.model];

            if (!pricing) {
                console.warn(`No pricing found for model: ${interaction.model}`);
                continue;
            }

            const inputCost = (interaction.inputTokens / 1_000_000) * pricing.inputCostPer1M;
            const outputCost = (interaction.outputTokens / 1_000_000) * pricing.outputCostPer1M;

            totalCost += inputCost + outputCost;
        }

        return totalCost / successful.length;
    }

    /**
     * Compute intervention rate (0-1)
     *
     * Percentage of interactions requiring human correction
     */
    private computeInterventionRate(interactions: InteractionData[]): number {
        const interventions = interactions.filter((i) => i.interventionNeeded).length;
        return interventions / interactions.length;
    }

    // ─── Normalization ────────────────────────────────────────────

    /**
     * Normalize latency to 0-1 scale (lower is better)
     */
    private normalizeLatency(latency: number): number {
        const { worstLatency, bestLatency } = this.config;
        const normalized = 1 - (latency - bestLatency) / (worstLatency - bestLatency);
        return Math.max(0, Math.min(1, normalized));
    }

    /**
     * Normalize cost to 0-1 scale (lower is better)
     */
    private normalizeCost(cost: number): number {
        const { worstCost, bestCost } = this.config;
        const normalized = 1 - (cost - bestCost) / (worstCost - bestCost);
        return Math.max(0, Math.min(1, normalized));
    }

    // ─── Composite Fitness ────────────────────────────────────────

    /**
     * Compute composite fitness (weighted average)
     */
    private computeComposite(normalized: {
        quality: number;
        successRate: number;
        tokenEfficiency: number;
        latency: number;
        costPerSuccess: number;
        interventionRate: number;
    }): number {
        const weights = this.config.weights;

        const composite =
            normalized.quality * weights.quality +
            normalized.successRate * weights.successRate +
            normalized.tokenEfficiency * weights.tokenEfficiency +
            normalized.latency * weights.latency +
            normalized.costPerSuccess * weights.costPerSuccess +
            normalized.interventionRate * weights.interventionRate;

        return composite;
    }

    // ─── Confidence Calculation ───────────────────────────────────

    /**
     * Compute statistical confidence based on sample size
     *
     * Larger sample size = higher confidence
     */
    private computeConfidence(sampleSize: number): number {
        if (sampleSize < 10) return 0.5;
        if (sampleSize < 20) return 0.6;
        if (sampleSize < 50) return 0.7;
        if (sampleSize < 100) return 0.8;
        if (sampleSize < 200) return 0.9;
        return 0.95;
    }

    // ─── Utilities ────────────────────────────────────────────────

    private createZeroFitness(): FitnessVector {
        return {
            quality: 0,
            successRate: 0,
            tokenEfficiency: 0,
            latency: 0,
            costPerSuccess: 0,
            interventionRate: 0,
            composite: 0,
            sampleSize: 0,
            lastUpdated: new Date(),
            confidence: 0,
        };
    }

    /**
     * Compare two fitness vectors
     *
     * Returns positive if f1 > f2, negative if f1 < f2
     */
    public compareFitness(f1: FitnessVector, f2: FitnessVector): number {
        return f1.composite - f2.composite;
    }

    /**
     * Compute fitness improvement percentage
     */
    public computeImprovement(baseline: FitnessVector, current: FitnessVector): number {
        if (baseline.composite === 0) return 0;
        return (current.composite - baseline.composite) / baseline.composite;
    }

    /**
     * Check if fitness meets threshold
     */
    public meetsThreshold(
        fitness: FitnessVector,
        baseline: FitnessVector,
        threshold: number
    ): boolean {
        const improvement = this.computeImprovement(baseline, fitness);
        return improvement >= threshold;
    }

    // ─── Getters ──────────────────────────────────────────────────

    public getWeights(): FitnessWeights {
        return { ...this.config.weights };
    }

    public setWeights(weights: Partial<FitnessWeights>): void {
        this.config.weights = { ...this.config.weights, ...weights };
    }

    public addModelPricing(model: string, pricing: ModelPricing): void {
        this.config.modelPricing[model] = pricing;
    }
}
