/**
 * Meta-Evolution Engine - Learning to Evolve Better
 *
 * Tracks which mutation operators work best and adapts strategy over time.
 * The system LEARNS how to evolve more effectively!
 *
 * Key Features:
 * - Operator Performance Tracking
 * - Dynamic Probability Adjustment
 * - Strategy Learning (which operators work in which contexts)
 * - Fitness Weight Adaptation
 *
 * This is evolution of evolution itself!
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0 - Evolution Boost
 */

import type { MutationType } from '../../types/GenomeV2.js';

/**
 * Operator performance record
 */
export interface OperatorPerformance {
    operatorName: MutationType | string;
    timesUsed: number;
    timesSuccessful: number; // Promoted to production
    avgFitnessImprovement: number;
    avgSandboxScore: number;
    lastUsed: Date;
    successRate: number; // timesSuccessful / timesUsed
}

/**
 * Context-specific performance (which operators work in which situations)
 */
export interface ContextualPerformance {
    context: string; // e.g., "low-quality", "high-latency", etc.
    operators: Map<string, {
        successRate: number;
        avgImprovement: number;
        sampleSize: number;
    }>;
}

/**
 * Meta-Evolution Configuration
 */
export interface MetaEvolutionConfig {
    // Learning rate for probability adjustment
    learningRate: number; // Default: 0.1

    // Minimum sample size before adjusting probabilities
    minSampleSize: number; // Default: 10

    // Exploration rate (try underperforming operators sometimes)
    explorationRate: number; // Default: 0.15 (15% exploration)
}

/**
 * Meta-Evolution Engine
 *
 * Learns which mutation operators work best and adapts the evolution strategy.
 */
export class MetaEvolutionEngine {
    private operatorPerformance = new Map<string, OperatorPerformance>();
    private contextualPerformance: ContextualPerformance[] = [];
    private operatorProbabilities = new Map<string, number>();
    private config: Required<MetaEvolutionConfig>;

    constructor(config?: Partial<MetaEvolutionConfig>) {
        this.config = {
            learningRate: config?.learningRate ?? 0.1,
            minSampleSize: config?.minSampleSize ?? 10,
            explorationRate: config?.explorationRate ?? 0.15,
        };
    }

    /**
     * Record mutation attempt
     */
    recordMutationAttempt(
        operatorName: string,
        success: boolean,
        fitnessImprovement: number,
        sandboxScore?: number,
        context?: string
    ): void {
        // Update operator performance
        let perf = this.operatorPerformance.get(operatorName);

        if (!perf) {
            perf = {
                operatorName,
                timesUsed: 0,
                timesSuccessful: 0,
                avgFitnessImprovement: 0,
                avgSandboxScore: 0,
                lastUsed: new Date(),
                successRate: 0,
            };
            this.operatorPerformance.set(operatorName, perf);
        }

        // Update stats
        perf.timesUsed++;
        if (success) {
            perf.timesSuccessful++;
        }

        // Update moving average for fitness improvement
        const alpha = 0.2; // Smoothing factor
        perf.avgFitnessImprovement =
            alpha * fitnessImprovement + (1 - alpha) * perf.avgFitnessImprovement;

        if (sandboxScore !== undefined) {
            perf.avgSandboxScore =
                alpha * sandboxScore + (1 - alpha) * perf.avgSandboxScore;
        }

        perf.successRate = perf.timesSuccessful / perf.timesUsed;
        perf.lastUsed = new Date();

        // Update contextual performance if context provided
        if (context) {
            this.recordContextualPerformance(operatorName, context, success, fitnessImprovement);
        }

        // Adapt operator probabilities
        this.adaptOperatorProbabilities();
    }

    /**
     * Record contextual performance
     */
    private recordContextualPerformance(
        operatorName: string,
        context: string,
        success: boolean,
        improvement: number
    ): void {
        // Find or create context
        let ctx = this.contextualPerformance.find(c => c.context === context);

        if (!ctx) {
            ctx = {
                context,
                operators: new Map(),
            };
            this.contextualPerformance.push(ctx);
        }

        // Update operator stats for this context
        let stats = ctx.operators.get(operatorName);

        if (!stats) {
            stats = {
                successRate: 0,
                avgImprovement: 0,
                sampleSize: 0,
            };
            ctx.operators.set(operatorName, stats);
        }

        stats.sampleSize++;

        // Update moving averages
        const alpha = 0.3;
        stats.avgImprovement = alpha * improvement + (1 - alpha) * stats.avgImprovement;
        stats.successRate =
            alpha * (success ? 1 : 0) + (1 - alpha) * stats.successRate;
    }

    /**
     * Adapt operator probabilities based on performance
     *
     * Better-performing operators get higher probability
     */
    private adaptOperatorProbabilities(): void {
        const operators = Array.from(this.operatorPerformance.values());

        if (operators.length === 0) {
            return;
        }

        // Only adapt if we have enough samples
        const hasEnoughSamples = operators.some(
            op => op.timesUsed >= this.config.minSampleSize
        );

        if (!hasEnoughSamples) {
            // Equal probabilities until we have data
            const equalProb = 1 / operators.length;
            for (const op of operators) {
                this.operatorProbabilities.set(op.operatorName, equalProb);
            }
            return;
        }

        // Calculate scores for each operator
        const scores = operators.map(op => ({
            name: op.operatorName,
            score: this.calculateOperatorScore(op),
        }));

        // Softmax to get probabilities
        const totalExp = scores.reduce((sum, s) => sum + Math.exp(s.score), 0);

        for (const { name, score } of scores) {
            const prob = Math.exp(score) / totalExp;

            // Mix exploitation (learned probs) with exploration (uniform)
            const finalProb =
                (1 - this.config.explorationRate) * prob +
                this.config.explorationRate * (1 / operators.length);

            this.operatorProbabilities.set(name, finalProb);
        }
    }

    /**
     * Calculate score for an operator (higher = better)
     */
    private calculateOperatorScore(perf: OperatorPerformance): number {
        // Combine multiple factors:
        // - Success rate (0-1)
        // - Average improvement (0-1+)
        // - Recency bonus (used recently = might be on a streak)

        const successWeight = 0.4;
        const improvementWeight = 0.5;
        const recencyWeight = 0.1;

        // Recency score: decays over time
        const hoursSinceUse = (Date.now() - perf.lastUsed.getTime()) / (1000 * 60 * 60);
        const recencyScore = Math.exp(-hoursSinceUse / 24); // Decay over 24 hours

        const score =
            perf.successRate * successWeight +
            perf.avgFitnessImprovement * improvementWeight +
            recencyScore * recencyWeight;

        return score;
    }

    /**
     * Select operator based on learned probabilities
     */
    selectOperator(availableOperators: string[], context?: string): string {
        // If context provided and we have contextual data, use it
        if (context) {
            const contextual = this.selectOperatorForContext(availableOperators, context);
            if (contextual) {
                return contextual;
            }
        }

        // Use learned probabilities
        const probabilities = availableOperators.map(name => ({
            name,
            prob: this.operatorProbabilities.get(name) || 1 / availableOperators.length,
        }));

        // Normalize
        const total = probabilities.reduce((sum, p) => sum + p.prob, 0);
        const normalized = probabilities.map(p => ({
            ...p,
            prob: p.prob / total,
        }));

        // Random selection weighted by probabilities
        const rand = Math.random();
        let cumulative = 0;

        for (const { name, prob } of normalized) {
            cumulative += prob;
            if (rand <= cumulative) {
                return name;
            }
        }

        // Fallback (shouldn't happen)
        return availableOperators[0];
    }

    /**
     * Select operator for specific context
     */
    private selectOperatorForContext(
        availableOperators: string[],
        context: string
    ): string | null {
        const ctx = this.contextualPerformance.find(c => c.context === context);

        if (!ctx || ctx.operators.size === 0) {
            return null; // No data for this context
        }

        // Find best operator for this context
        let bestOperator: string | null = null;
        let bestScore = -Infinity;

        for (const name of availableOperators) {
            const stats = ctx.operators.get(name);

            if (!stats || stats.sampleSize < 3) {
                continue; // Not enough data
            }

            // Score = combination of success rate and improvement
            const score = stats.successRate * 0.5 + stats.avgImprovement * 0.5;

            if (score > bestScore) {
                bestScore = score;
                bestOperator = name;
            }
        }

        return bestOperator;
    }

    /**
     * Get operator performance stats
     */
    getOperatorPerformance(operatorName?: string): OperatorPerformance[] {
        if (operatorName) {
            const perf = this.operatorPerformance.get(operatorName);
            return perf ? [perf] : [];
        }

        return Array.from(this.operatorPerformance.values());
    }

    /**
     * Get operator probabilities
     */
    getOperatorProbabilities(): Map<string, number> {
        return new Map(this.operatorProbabilities);
    }

    /**
     * Get contextual performance
     */
    getContextualPerformance(): ContextualPerformance[] {
        return [...this.contextualPerformance];
    }

    /**
     * Get learning summary
     */
    getLearningSummary(): {
        totalMutations: number;
        successfulMutations: number;
        overallSuccessRate: number;
        bestOperator: string | null;
        worstOperator: string | null;
    } {
        const operators = Array.from(this.operatorPerformance.values());

        if (operators.length === 0) {
            return {
                totalMutations: 0,
                successfulMutations: 0,
                overallSuccessRate: 0,
                bestOperator: null,
                worstOperator: null,
            };
        }

        const totalMutations = operators.reduce((sum, op) => sum + op.timesUsed, 0);
        const successfulMutations = operators.reduce((sum, op) => sum + op.timesSuccessful, 0);
        const overallSuccessRate = successfulMutations / totalMutations;

        // Find best and worst
        const sorted = [...operators].sort((a, b) => b.successRate - a.successRate);

        return {
            totalMutations,
            successfulMutations,
            overallSuccessRate,
            bestOperator: sorted[0]?.operatorName || null,
            worstOperator: sorted[sorted.length - 1]?.operatorName || null,
        };
    }

    /**
     * Reset learning (for testing or fresh start)
     */
    reset(): void {
        this.operatorPerformance.clear();
        this.contextualPerformance = [];
        this.operatorProbabilities.clear();
    }
}
