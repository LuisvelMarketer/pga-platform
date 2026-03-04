/**
 * Evolution Boost 2.0 - Comprehensive Tests
 *
 * Tests for all Evolution Boost components:
 * - ParetoOptimizer
 * - MetaEvolutionEngine
 * - MutationEngine (base operators)
 * - EvolutionBoostEngine (orchestrator)
 * - Boost operators (Semantic, Crossover, Pattern, Breakthrough)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GenomeV2, FitnessVector, OperativeGene } from '../../../types/GenomeV2.js';
import type { MutationContext, MutationResult } from '../../MutationOperator.js';
import { MutationEngine } from '../../MutationOperator.js';
import { ParetoOptimizer, type ParetoSolution } from '../ParetoOptimizer.js';
import { MetaEvolutionEngine } from '../MetaEvolutionEngine.js';
import { CrossoverMutationOperator } from '../operators/CrossoverMutationOperator.js';
import { SemanticRestructuringOperator } from '../operators/SemanticRestructuringOperator.js';
import { EvolutionBoostEngine } from '../EvolutionBoostEngine.js';
import type { LLMAdapter } from '../../../interfaces/LLMAdapter.js';

// ─── Test Helpers ────────────────────────────────────────────

function createDefaultFitness(overrides?: Partial<FitnessVector>): FitnessVector {
    return {
        quality: 0.5,
        successRate: 0.5,
        tokenEfficiency: 0.5,
        latency: 1000,
        costPerSuccess: 0.01,
        interventionRate: 0.1,
        composite: 0.5,
        sampleSize: 10,
        lastUpdated: new Date(),
        confidence: 0.5,
        ...overrides,
    };
}

function createTestGenome(overrides?: Partial<GenomeV2>): GenomeV2 {
    return {
        id: 'test-genome-1',
        name: 'Test Genome',
        familyId: 'test-family',
        version: 1,
        chromosomes: {
            c0: {
                identity: { role: 'AI Assistant', purpose: 'Help users', constraints: [] },
                security: { forbiddenTopics: [], accessControls: [], safetyRules: [] },
                attribution: { creator: 'Test', copyright: 'Test', license: 'MIT' },
                metadata: { version: '2.0.0', createdAt: new Date() },
            },
            c1: {
                operations: [
                    {
                        id: 'gene-1',
                        category: 'tool-usage',
                        content: 'Use the search tool to find relevant information before answering questions.',
                        fitness: createDefaultFitness(),
                        origin: 'initial',
                        usageCount: 50,
                        lastUsed: new Date(),
                        successRate: 0.8,
                    },
                    {
                        id: 'gene-2',
                        category: 'reasoning',
                        content: 'Think step by step when solving complex problems. Break down tasks into smaller parts.',
                        fitness: createDefaultFitness({ quality: 0.7 }),
                        origin: 'initial',
                        usageCount: 30,
                        lastUsed: new Date(),
                        successRate: 0.75,
                    },
                ],
                metadata: { lastMutated: new Date(), mutationCount: 0, avgFitnessGain: 0 },
            },
            c2: {
                userAdaptations: new Map(),
                contextPatterns: [],
                metadata: { lastMutated: new Date(), adaptationRate: 0, totalUsers: 0 },
            },
        },
        integrity: {
            c0Hash: 'abc123',
            lastVerified: new Date(),
            violations: 0,
            quarantined: false,
        },
        lineage: { inheritedGenes: [], mutations: [] },
        fitness: createDefaultFitness(),
        config: {
            mutationRate: 'balanced',
            epsilonExplore: 0.1,
            enableSandbox: true,
            minFitnessImprovement: 0.05,
            enableIntegrityCheck: true,
            autoRollbackThreshold: 0.15,
            allowInheritance: true,
            minCompatibilityScore: 0.6,
        },
        state: 'active',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function createMutationContext(overrides?: Partial<MutationContext>): MutationContext {
    return {
        genome: createTestGenome(),
        targetChromosome: 'c1',
        reason: 'Test mutation',
        ...overrides,
    };
}

class MockLLMAdapter implements LLMAdapter {
    async chat(messages: Array<{ role: string; content: string }>) {
        return {
            content: 'Improved instruction: Use search tools effectively and verify results before presenting answers to users.',
            usage: { inputTokens: 100, outputTokens: 50 },
        };
    }
}

// ─── ParetoOptimizer Tests ───────────────────────────────────

describe('ParetoOptimizer', () => {
    let optimizer: ParetoOptimizer;

    beforeEach(() => {
        optimizer = new ParetoOptimizer();
    });

    it('should create with default FitnessCalculator', () => {
        expect(optimizer).toBeDefined();
        expect(optimizer.fitnessCalc).toBeDefined();
    });

    it('should find Pareto frontier with single solution', () => {
        const solutions: ParetoSolution[] = [
            {
                genome: createTestGenome(),
                fitness: createDefaultFitness({ quality: 0.8, successRate: 0.9 }),
                dominatedBy: 0,
                crowdingDistance: 0,
            },
        ];

        const frontier = optimizer.findParetoFrontier(solutions);
        expect(frontier).toHaveLength(1);
        expect(frontier[0].dominatedBy).toBe(0);
    });

    it('should identify dominated solutions', () => {
        const solutions: ParetoSolution[] = [
            {
                genome: createTestGenome({ id: 'genome-a' }),
                fitness: createDefaultFitness({ quality: 0.9, successRate: 0.9, tokenEfficiency: 0.9 }),
                dominatedBy: 0,
                crowdingDistance: 0,
            },
            {
                genome: createTestGenome({ id: 'genome-b' }),
                fitness: createDefaultFitness({ quality: 0.5, successRate: 0.5, tokenEfficiency: 0.5 }),
                dominatedBy: 0,
                crowdingDistance: 0,
            },
        ];

        const frontier = optimizer.findParetoFrontier(solutions);

        // Solution A dominates B in all objectives, so only A should be on frontier
        expect(frontier.length).toBeGreaterThanOrEqual(1);
        const dominatedB = solutions.find(s => s.genome.id === 'genome-b');
        expect(dominatedB!.dominatedBy).toBeGreaterThan(0);
    });

    it('should keep non-dominated solutions on frontier', () => {
        const solutions: ParetoSolution[] = [
            {
                genome: createTestGenome({ id: 'high-quality' }),
                fitness: createDefaultFitness({
                    quality: 0.95, successRate: 0.6, tokenEfficiency: 0.4,
                    latency: 2000, costPerSuccess: 0.05,
                }),
                dominatedBy: 0,
                crowdingDistance: 0,
            },
            {
                genome: createTestGenome({ id: 'high-efficiency' }),
                fitness: createDefaultFitness({
                    quality: 0.6, successRate: 0.95, tokenEfficiency: 0.95,
                    latency: 500, costPerSuccess: 0.002,
                }),
                dominatedBy: 0,
                crowdingDistance: 0,
            },
        ];

        const frontier = optimizer.findParetoFrontier(solutions);

        // Neither dominates the other (trade-off), both should be on frontier
        expect(frontier).toHaveLength(2);
    });

    it('should handle empty solutions array', () => {
        const frontier = optimizer.findParetoFrontier([]);
        expect(frontier).toHaveLength(0);
    });
});

// ─── MetaEvolutionEngine Tests ───────────────────────────────

describe('MetaEvolutionEngine', () => {
    let engine: MetaEvolutionEngine;

    beforeEach(() => {
        engine = new MetaEvolutionEngine({
            learningRate: 0.1,
            minSampleSize: 3,
            explorationRate: 0.15,
        });
    });

    it('should create with default config', () => {
        const defaultEngine = new MetaEvolutionEngine();
        expect(defaultEngine).toBeDefined();
    });

    it('should record mutation attempts', () => {
        engine.recordMutationAttempt('compress_instructions', true, 0.15);
        engine.recordMutationAttempt('compress_instructions', true, 0.12);
        engine.recordMutationAttempt('compress_instructions', false, 0.02);

        const perf = engine.getOperatorPerformance('compress_instructions');
        expect(perf).toHaveLength(1);
        expect(perf[0].timesUsed).toBe(3);
        expect(perf[0].timesSuccessful).toBe(2);
        expect(perf[0].successRate).toBeCloseTo(2 / 3);
    });

    it('should track multiple operators independently', () => {
        engine.recordMutationAttempt('compress_instructions', true, 0.15);
        engine.recordMutationAttempt('reorder_constraints', false, 0.05);
        engine.recordMutationAttempt('safety_reinforcement', true, 0.08);

        const allPerf = engine.getOperatorPerformance();
        expect(allPerf).toHaveLength(3);
    });

    it('should provide learning summary', () => {
        engine.recordMutationAttempt('compress_instructions', true, 0.15);
        engine.recordMutationAttempt('compress_instructions', true, 0.12);
        engine.recordMutationAttempt('reorder_constraints', false, 0.02);

        const summary = engine.getLearningSummary();
        expect(summary.totalMutations).toBe(3);
        expect(summary.successfulMutations).toBe(2);
        expect(summary.overallSuccessRate).toBeCloseTo(2 / 3);
        expect(summary.bestOperator).toBe('compress_instructions');
    });

    it('should return empty summary when no mutations recorded', () => {
        const summary = engine.getLearningSummary();
        expect(summary.totalMutations).toBe(0);
        expect(summary.overallSuccessRate).toBe(0);
        expect(summary.bestOperator).toBeNull();
    });

    it('should select operator from available operators', () => {
        // Record enough data for probability adaptation
        for (let i = 0; i < 5; i++) {
            engine.recordMutationAttempt('compress_instructions', true, 0.15);
            engine.recordMutationAttempt('reorder_constraints', false, 0.02);
        }

        const selected = engine.selectOperator([
            'compress_instructions',
            'reorder_constraints',
        ]);

        expect(['compress_instructions', 'reorder_constraints']).toContain(selected);
    });

    it('should adapt operator probabilities based on performance', () => {
        // Record many successful mutations for one operator
        for (let i = 0; i < 15; i++) {
            engine.recordMutationAttempt('compress_instructions', true, 0.20);
            engine.recordMutationAttempt('reorder_constraints', false, 0.01);
        }

        const probs = engine.getOperatorProbabilities();

        // Compress should have higher probability since it's more successful
        const compressProb = probs.get('compress_instructions') || 0;
        const reorderProb = probs.get('reorder_constraints') || 0;

        expect(compressProb).toBeGreaterThan(reorderProb);
    });

    it('should record contextual performance', () => {
        engine.recordMutationAttempt('compress_instructions', true, 0.15, undefined, 'low-quality');
        engine.recordMutationAttempt('compress_instructions', true, 0.12, undefined, 'low-quality');

        const contextPerf = engine.getContextualPerformance();
        expect(contextPerf.length).toBeGreaterThan(0);

        const lowQualityCtx = contextPerf.find(c => c.context === 'low-quality');
        expect(lowQualityCtx).toBeDefined();
        expect(lowQualityCtx!.operators.has('compress_instructions')).toBe(true);
    });
});

// ─── MutationEngine Tests ────────────────────────────────────

describe('MutationEngine', () => {
    let engine: MutationEngine;

    beforeEach(() => {
        engine = new MutationEngine();
    });

    it('should create with default operators registered', () => {
        const operators = engine.listOperators();
        expect(operators.length).toBeGreaterThanOrEqual(4);

        const names = operators.map(op => op.name);
        expect(names).toContain('compress_instructions');
        expect(names).toContain('reorder_constraints');
        expect(names).toContain('safety_reinforcement');
        expect(names).toContain('tool_selection_bias');
    });

    it('should generate mutants', async () => {
        const context = createMutationContext();
        const mutants = await engine.generateMutants(context, 2);

        expect(mutants.length).toBeGreaterThan(0);
        expect(mutants.length).toBeLessThanOrEqual(2);

        for (const mutant of mutants) {
            expect(mutant.success).toBe(true);
            expect(mutant.mutant).toBeDefined();
            expect(mutant.mutation).toBeDefined();
            expect(mutant.expectedImprovement).toBeGreaterThan(0);
        }
    });

    it('should produce different mutant content', async () => {
        const context = createMutationContext();
        const mutants = await engine.generateMutants(context, 4);

        // At least some mutants should have modified C1 operations
        const hasModified = mutants.some(m => {
            const origContent = context.genome.chromosomes.c1.operations.map(o => o.content).join('|');
            const mutContent = m.mutant.chromosomes.c1.operations.map(o => o.content).join('|');
            return origContent !== mutContent;
        });

        expect(hasModified).toBe(true);
    });

    it('should register custom operators', () => {
        const crossover = new CrossoverMutationOperator();
        engine.registerOperator(crossover);

        const operators = engine.listOperators();
        const names = operators.map(op => op.name);
        expect(names).toContain('crossover_mutation');
    });

    it('should get specific operator by name', () => {
        const op = engine.getOperator('compress_instructions');
        expect(op).toBeDefined();
        expect(op!.name).toBe('compress_instructions');
    });

    it('should return undefined for non-existent operator', () => {
        const op = engine.getOperator('nonexistent' as any);
        expect(op).toBeUndefined();
    });
});

// ─── CrossoverMutationOperator Tests ─────────────────────────

describe('CrossoverMutationOperator', () => {
    let operator: CrossoverMutationOperator;

    beforeEach(() => {
        operator = new CrossoverMutationOperator();
    });

    it('should fail with insufficient population', async () => {
        const context = createMutationContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(false);
        expect(result.expectedImprovement).toBe(0);
    });

    it('should succeed with 2+ parents in population', async () => {
        const parent1 = createTestGenome({ id: 'parent-1' });
        const parent2 = createTestGenome({ id: 'parent-2' });

        // Differentiate parent genes
        parent2.chromosomes.c1.operations[0].content = 'Always verify search results before presenting them.';

        operator.addToPopulation(parent1, 0.8);
        operator.addToPopulation(parent2, 0.7);

        expect(operator.getPopulationSize()).toBe(2);

        const context = createMutationContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        expect(result.expectedImprovement).toBeGreaterThan(0);
    });

    it('should keep only top 10 in population', () => {
        for (let i = 0; i < 15; i++) {
            operator.addToPopulation(createTestGenome({ id: `genome-${i}` }), Math.random());
        }

        expect(operator.getPopulationSize()).toBe(10);
    });

    it('should clear population', () => {
        operator.addToPopulation(createTestGenome(), 0.8);
        operator.addToPopulation(createTestGenome(), 0.7);
        expect(operator.getPopulationSize()).toBe(2);

        operator.clearPopulation();
        expect(operator.getPopulationSize()).toBe(0);
    });

    it('should estimate improvement based on population', () => {
        const context = createMutationContext();

        // No parents → 0 improvement
        expect(operator.estimateImprovement(context)).toBe(0);

        // Add parents
        operator.addToPopulation(createTestGenome(), 0.8);
        operator.addToPopulation(createTestGenome(), 0.7);

        expect(operator.estimateImprovement(context)).toBeGreaterThan(0);
    });
});

// ─── SemanticRestructuringOperator Tests ─────────────────────

describe('SemanticRestructuringOperator', () => {
    it('should restructure genes using LLM', async () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new SemanticRestructuringOperator(mockLLM);

        const context = createMutationContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        expect(result.expectedImprovement).toBeGreaterThanOrEqual(0.40);
        expect(result.mutant.chromosomes.c1.operations.length).toBe(
            context.genome.chromosomes.c1.operations.length
        );

        // Content should be restructured (different from original)
        const originalContent = context.genome.chromosomes.c1.operations[0].content;
        const restructuredContent = result.mutant.chromosomes.c1.operations[0].content;
        expect(restructuredContent).not.toBe(originalContent);
    });

    it('should estimate higher improvement for lower-quality genomes', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new SemanticRestructuringOperator(mockLLM);

        const lowQualityContext = createMutationContext({
            genome: createTestGenome({
                fitness: createDefaultFitness({ quality: 0.3, tokenEfficiency: 0.3 }),
            }),
        });
        const highQualityContext = createMutationContext({
            genome: createTestGenome({
                fitness: createDefaultFitness({ quality: 0.9, tokenEfficiency: 0.9 }),
            }),
        });

        const lowEstimate = operator.estimateImprovement(lowQualityContext);
        const highEstimate = operator.estimateImprovement(highQualityContext);

        expect(lowEstimate).toBeGreaterThan(highEstimate);
    });

    it('should fallback to simple restructuring if LLM fails', async () => {
        const failingLLM: LLMAdapter = {
            async chat() {
                throw new Error('LLM unavailable');
            },
        };
        const operator = new SemanticRestructuringOperator(failingLLM);

        const context = createMutationContext();
        const result = await operator.mutate(context);

        // Should still succeed with fallback
        expect(result.success).toBe(true);
    });
});

// ─── EvolutionBoostEngine Tests ──────────────────────────────

describe('EvolutionBoostEngine', () => {
    it('should create with default balanced config', () => {
        const engine = new EvolutionBoostEngine();
        const config = engine.getConfig();

        expect(config.mode).toBe('balanced');
        expect(config.parallelBranches).toBe(5);
        expect(config.enableParallelEvolution).toBe(true);
        expect(config.enableMetaLearning).toBe(true);
    });

    it('should create with conservative config', () => {
        const engine = new EvolutionBoostEngine({ mode: 'conservative' });
        const config = engine.getConfig();

        expect(config.mode).toBe('conservative');
        expect(config.parallelBranches).toBe(3);
    });

    it('should create with aggressive config', () => {
        const engine = new EvolutionBoostEngine({ mode: 'aggressive' });
        const config = engine.getConfig();

        expect(config.mode).toBe('aggressive');
        expect(config.parallelBranches).toBe(10);
    });

    it('should register boost operators when LLM provided', () => {
        const mockLLM = new MockLLMAdapter();
        const engine = new EvolutionBoostEngine({
            mode: 'balanced',
            llm: mockLLM,
        });

        expect(engine).toBeDefined();
    });

    it('should update configuration', () => {
        const engine = new EvolutionBoostEngine({ mode: 'balanced' });

        engine.updateConfig({ mode: 'aggressive' });
        const config = engine.getConfig();

        expect(config.mode).toBe('aggressive');
        expect(config.parallelBranches).toBe(10);
    });

    it('should evolve genome and return results', async () => {
        const engine = new EvolutionBoostEngine({
            mode: 'conservative',
            parallelBranches: 2,
            enableRecombination: false,
        });

        const context = createMutationContext();
        const result = await engine.evolve(context);

        expect(result).toBeDefined();
        expect(result.best).toBeDefined();
        expect(result.bestMutation).toBeDefined();
        expect(result.allBranches.length).toBeGreaterThan(0);
        expect(result.stats.mode).toBe('conservative');
        expect(result.stats.operatorsUsed.length).toBeGreaterThan(0);
    });

    it('should provide meta-learning insights', () => {
        const engine = new EvolutionBoostEngine();
        const insights = engine.getMetaLearningInsights();

        expect(insights).toBeDefined();
        expect(insights.recommendedMode).toBeDefined();
        expect(Array.isArray(insights.operatorPerformance)).toBe(true);
    });

    it('should track evolution statistics', async () => {
        const engine = new EvolutionBoostEngine({
            mode: 'conservative',
            parallelBranches: 2,
            enableRecombination: false,
        });

        const context = createMutationContext();
        const result = await engine.evolve(context);

        expect(result.stats.branchesExplored).toBeGreaterThan(0);
        expect(result.stats.topImprovement).toBeGreaterThan(0);
        expect(result.stats.avgImprovement).toBeGreaterThan(0);
        expect(typeof result.stats.diversityScore).toBe('number');
    });
});

// ─── Integration: MutationEngine + DriftAnalyzer ─────────────

describe('Integration: Evolution Pipeline', () => {
    it('should generate valid GenomeV2 mutations end-to-end', async () => {
        const engine = new MutationEngine();
        const genome = createTestGenome();
        const context: MutationContext = {
            genome,
            targetChromosome: 'c1',
            reason: 'Drift detected: quality decline',
        };

        const mutants = await engine.generateMutants(context, 3);

        expect(mutants.length).toBeGreaterThan(0);

        for (const result of mutants) {
            // Each mutant should be a valid GenomeV2
            expect(result.mutant.id).toBe(genome.id);
            expect(result.mutant.chromosomes.c1.operations.length).toBeGreaterThan(0);
            expect(result.mutation.chromosome).toBe('c1');
            expect(result.mutation.sandboxTested).toBe(false);
        }
    });

    it('should preserve C0 immutability during mutations', async () => {
        const engine = new MutationEngine();
        const genome = createTestGenome();
        const originalC0 = JSON.stringify(genome.chromosomes.c0);

        const context: MutationContext = {
            genome,
            targetChromosome: 'c1',
            reason: 'Test mutation',
        };

        const mutants = await engine.generateMutants(context, 4);

        for (const result of mutants) {
            const mutatedC0 = JSON.stringify(result.mutant.chromosomes.c0);
            expect(mutatedC0).toBe(originalC0);
        }
    });

    it('should produce mutations with valid audit records', async () => {
        const engine = new MutationEngine();
        const context = createMutationContext();
        const mutants = await engine.generateMutants(context, 2);

        for (const result of mutants) {
            expect(result.mutation.id).toBeDefined();
            expect(result.mutation.timestamp).toBeInstanceOf(Date);
            expect(result.mutation.operation).toBeDefined();
            expect(result.mutation.before).toBeTruthy();
            expect(result.mutation.after).toBeTruthy();
            expect(result.mutation.reason).toBeTruthy();
        }
    });
});
