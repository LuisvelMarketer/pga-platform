/**
 * Pareto Optimizer - Multi-Objective Fitness Optimization
 *
 * Implements true multi-objective optimization using Pareto dominance.
 * Instead of single fitness score, finds solutions on Pareto frontier.
 *
 * Key Concepts:
 * - Pareto Dominance: Solution A dominates B if A is better in all objectives
 * - Pareto Frontier: Set of non-dominated solutions
 * - Trade-offs: Explore quality vs cost vs latency trade-offs
 *
 * This allows us to find diverse solutions optimizing different objectives!
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0 - Evolution Boost
 */

import type { FitnessVector } from '../../types/GenomeV2.js';
import type { GenomeV2 } from '../../types/GenomeV2.js';
import { FitnessCalculator } from '../FitnessCalculator.js';

/**
 * Pareto Solution - A genome with its multi-objective fitness
 */
export interface ParetoSolution {
    genome: GenomeV2;
    fitness: FitnessVector;
    dominatedBy: number; // How many solutions dominate this one
    crowdingDistance: number; // Diversity metric
}

/**
 * Optimization objectives (what to maximize/minimize)
 */
export interface OptimizationObjectives {
    maximizeQuality: boolean; // Default: true
    maximizeSuccessRate: boolean; // Default: true
    maximizeTokenEfficiency: boolean; // Default: true
    minimizeLatency: boolean; // Default: true
    minimizeCost: boolean; // Default: true
    minimizeIntervention: boolean; // Default: true
}

/**
 * Pareto Optimizer
 *
 * Performs multi-objective optimization to find diverse set of optimal solutions.
 */
export class ParetoOptimizer {
    public fitnessCalc: FitnessCalculator;

    constructor(fitnessCalc?: FitnessCalculator) {
        this.fitnessCalc = fitnessCalc || new FitnessCalculator();
    }

    /**
     * Find Pareto frontier from population
     *
     * Returns non-dominated solutions (Pareto optimal)
     */
    findParetoFrontier(
        solutions: ParetoSolution[],
        objectives?: Partial<OptimizationObjectives>
    ): ParetoSolution[] {
        const opts: OptimizationObjectives = {
            maximizeQuality: objectives?.maximizeQuality ?? true,
            maximizeSuccessRate: objectives?.maximizeSuccessRate ?? true,
            maximizeTokenEfficiency: objectives?.maximizeTokenEfficiency ?? true,
            minimizeLatency: objectives?.minimizeLatency ?? true,
            minimizeCost: objectives?.minimizeCost ?? true,
            minimizeIntervention: objectives?.minimizeIntervention ?? true,
        };

        // Calculate domination count for each solution
        for (let i = 0; i < solutions.length; i++) {
            solutions[i].dominatedBy = 0;

            for (let j = 0; j < solutions.length; j++) {
                if (i !== j && this.dominates(solutions[j], solutions[i], opts)) {
                    solutions[i].dominatedBy++;
                }
            }
        }

        // Pareto frontier = solutions with dominatedBy = 0
        const frontier = solutions.filter(s => s.dominatedBy === 0);

        // Calculate crowding distance for diversity
        this.calculateCrowdingDistance(frontier);

        // Sort by crowding distance (more diverse first)
        frontier.sort((a, b) => b.crowdingDistance - a.crowdingDistance);

        return frontier;
    }

    /**
     * Check if solution A dominates solution B
     *
     * A dominates B if:
     * - A is better or equal in ALL objectives
     * - A is strictly better in at least ONE objective
     */
    private dominates(
        a: ParetoSolution,
        b: ParetoSolution,
        objectives: OptimizationObjectives
    ): boolean {
        let betterInAtLeastOne = false;
        let worseInAny = false;

        // Check quality
        if (objectives.maximizeQuality) {
            if (a.fitness.quality > b.fitness.quality) betterInAtLeastOne = true;
            if (a.fitness.quality < b.fitness.quality) worseInAny = true;
        }

        // Check success rate
        if (objectives.maximizeSuccessRate) {
            if (a.fitness.successRate > b.fitness.successRate) betterInAtLeastOne = true;
            if (a.fitness.successRate < b.fitness.successRate) worseInAny = true;
        }

        // Check token efficiency
        if (objectives.maximizeTokenEfficiency) {
            if (a.fitness.tokenEfficiency > b.fitness.tokenEfficiency) betterInAtLeastOne = true;
            if (a.fitness.tokenEfficiency < b.fitness.tokenEfficiency) worseInAny = true;
        }

        // Check latency (minimize)
        if (objectives.minimizeLatency) {
            if (a.fitness.latency < b.fitness.latency) betterInAtLeastOne = true;
            if (a.fitness.latency > b.fitness.latency) worseInAny = true;
        }

        // Check cost (minimize)
        if (objectives.minimizeCost) {
            if (a.fitness.costPerSuccess < b.fitness.costPerSuccess) betterInAtLeastOne = true;
            if (a.fitness.costPerSuccess > b.fitness.costPerSuccess) worseInAny = true;
        }

        // Check intervention rate (minimize)
        if (objectives.minimizeIntervention) {
            if (a.fitness.interventionRate < b.fitness.interventionRate) betterInAtLeastOne = true;
            if (a.fitness.interventionRate > b.fitness.interventionRate) worseInAny = true;
        }

        // A dominates B if better in at least one AND not worse in any
        return betterInAtLeastOne && !worseInAny;
    }

    /**
     * Calculate crowding distance for diversity
     *
     * Higher crowding distance = more isolated = more diverse
     */
    private calculateCrowdingDistance(solutions: ParetoSolution[]): void {
        if (solutions.length <= 2) {
            // All solutions are equally diverse if only 2 or less
            solutions.forEach(s => s.crowdingDistance = Infinity);
            return;
        }

        // Initialize all distances to 0
        solutions.forEach(s => s.crowdingDistance = 0);

        // For each objective, calculate crowding distance
        const objectives = [
            'quality',
            'successRate',
            'tokenEfficiency',
            'latency',
            'costPerSuccess',
            'interventionRate',
        ] as const;

        for (const objective of objectives) {
            // Sort by this objective
            const sorted = [...solutions].sort((a, b) => {
                const aVal = a.fitness[objective];
                const bVal = b.fitness[objective];
                return aVal - bVal;
            });

            // Boundary solutions get infinite distance
            sorted[0].crowdingDistance = Infinity;
            sorted[sorted.length - 1].crowdingDistance = Infinity;

            // Get range for normalization
            const minVal = sorted[0].fitness[objective];
            const maxVal = sorted[sorted.length - 1].fitness[objective];
            const range = maxVal - minVal;

            if (range === 0) continue;

            // Calculate crowding distance for middle solutions
            for (let i = 1; i < sorted.length - 1; i++) {
                const distance =
                    (sorted[i + 1].fitness[objective] - sorted[i - 1].fitness[objective]) / range;

                // Find original solution and add distance
                const original = solutions.find(s => s.genome.id === sorted[i].genome.id);
                if (original) {
                    original.crowdingDistance += distance;
                }
            }
        }
    }

    /**
     * Select best solutions using NSGA-II algorithm
     *
     * Combines Pareto dominance with crowding distance for diversity
     */
    selectBest(
        solutions: ParetoSolution[],
        count: number,
        objectives?: Partial<OptimizationObjectives>
    ): ParetoSolution[] {
        // Find Pareto frontier
        const frontier = this.findParetoFrontier(solutions, objectives);

        // If frontier has enough solutions, return them
        if (frontier.length >= count) {
            return frontier.slice(0, count);
        }

        // Otherwise, need to select from non-frontier solutions
        const selected = [...frontier];
        const remaining = solutions.filter(s => !frontier.includes(s));

        // Sort remaining by composite fitness
        remaining.sort((a, b) => b.fitness.composite - a.fitness.composite);

        // Add remaining until we have enough
        while (selected.length < count && remaining.length > 0) {
            selected.push(remaining.shift()!);
        }

        return selected;
    }

    /**
     * Find solution optimized for specific trade-off
     */
    findBestForTradeoff(
        solutions: ParetoSolution[],
        tradeoff: 'quality' | 'cost' | 'speed' | 'balanced'
    ): ParetoSolution | null {
        if (solutions.length === 0) return null;

        const frontier = this.findParetoFrontier(solutions);

        switch (tradeoff) {
            case 'quality':
                // Best quality, regardless of cost/speed
                return frontier.reduce((best, current) =>
                    current.fitness.quality > best.fitness.quality ? current : best
                );

            case 'cost':
                // Lowest cost, acceptable quality
                return frontier
                    .filter(s => s.fitness.quality >= 0.7) // Minimum quality threshold
                    .reduce((best, current) =>
                        current.fitness.costPerSuccess < best.fitness.costPerSuccess ? current : best
                    );

            case 'speed':
                // Lowest latency, acceptable quality
                return frontier
                    .filter(s => s.fitness.quality >= 0.7)
                    .reduce((best, current) =>
                        current.fitness.latency < best.fitness.latency ? current : best
                    );

            case 'balanced':
                // Best composite score
                return frontier.reduce((best, current) =>
                    current.fitness.composite > best.fitness.composite ? current : best
                );
        }
    }

    /**
     * Analyze trade-offs in Pareto frontier
     */
    analyzeTrade(frontier: ParetoSolution[]): {
        qualityRange: { min: number; max: number };
        costRange: { min: number; max: number };
        latencyRange: { min: number; max: number };
        tradeoffSummary: string;
    } {
        if (frontier.length === 0) {
            return {
                qualityRange: { min: 0, max: 0 },
                costRange: { min: 0, max: 0 },
                latencyRange: { min: 0, max: 0 },
                tradeoffSummary: 'No solutions available',
            };
        }

        const qualities = frontier.map(s => s.fitness.quality);
        const costs = frontier.map(s => s.fitness.costPerSuccess);
        const latencies = frontier.map(s => s.fitness.latency);

        const qualityRange = { min: Math.min(...qualities), max: Math.max(...qualities) };
        const costRange = { min: Math.min(...costs), max: Math.max(...costs) };
        const latencyRange = { min: Math.min(...latencies), max: Math.max(...latencies) };

        const tradeoffSummary = `Found ${frontier.length} Pareto-optimal solutions:
- Quality: ${(qualityRange.min * 100).toFixed(0)}% - ${(qualityRange.max * 100).toFixed(0)}%
- Cost: $${costRange.min.toFixed(4)} - $${costRange.max.toFixed(4)}
- Latency: ${latencyRange.min.toFixed(0)}ms - ${latencyRange.max.toFixed(0)}ms

Trade-off: ${qualityRange.max > qualityRange.min ? 'Higher quality costs more/takes longer' : 'Solutions are similar'}`;

        return {
            qualityRange,
            costRange,
            latencyRange,
            tradeoffSummary,
        };
    }
}
