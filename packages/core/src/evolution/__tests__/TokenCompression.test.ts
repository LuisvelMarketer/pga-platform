/**
 * Token Compression Operator Tests
 *
 * Tests for PGA's evolutionary token compression system:
 * - LLM-powered compression with behavior preservation
 * - Compression gate (rejects if no reduction)
 * - Fitness preservation (no degradation)
 * - TokenCount tracking in mutation operators
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect, vi } from 'vitest';
import type { GenomeV2, FitnessVector, OperativeGene } from '../../types/GenomeV2.js';
import type { MutationContext } from '../MutationOperator.js';
import {
    TokenCompressionOperator,
    CompressInstructionsOperator,
    SafetyReinforcementOperator,
    ToolSelectionBiasOperator,
    MutationEngine,
} from '../MutationOperator.js';
import type { LLMAdapter } from '../../interfaces/LLMAdapter.js';
import { estimateTokenCount } from '../../utils/tokens.js';

// ─── Test Helpers ────────────────────────────────────────────

function createDefaultFitness(overrides?: Partial<FitnessVector>): FitnessVector {
    return {
        quality: 0.7, successRate: 0.8, tokenEfficiency: 0.5,
        latency: 1000, costPerSuccess: 0.01, interventionRate: 0.1,
        composite: 0.7, sampleSize: 10, lastUpdated: new Date(), confidence: 0.5,
        ...overrides,
    };
}

function createTestGenome(): GenomeV2 {
    return {
        id: 'test-genome',
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
                        content: 'When a user asks you to search for information, you should always use the search tool to find relevant and accurate information before attempting to answer the question from your own knowledge. Make sure to verify the results.',
                        fitness: createDefaultFitness(),
                        origin: 'initial',
                        usageCount: 50,
                        lastUsed: new Date(),
                        successRate: 0.85,
                        tokenCount: estimateTokenCount('When a user asks you to search for information, you should always use the search tool to find relevant and accurate information before attempting to answer the question from your own knowledge. Make sure to verify the results.'),
                    },
                    {
                        id: 'gene-2',
                        category: 'reasoning',
                        content: 'Think step by step when solving complex problems. Break down tasks into smaller parts and explain your reasoning clearly.',
                        fitness: createDefaultFitness({ quality: 0.75 }),
                        origin: 'initial',
                        usageCount: 30,
                        lastUsed: new Date(),
                        successRate: 0.75,
                        tokenCount: estimateTokenCount('Think step by step when solving complex problems. Break down tasks into smaller parts and explain your reasoning clearly.'),
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
        integrity: { c0Hash: 'abc', lastVerified: new Date(), violations: 0, quarantined: false },
        lineage: { inheritedGenes: [], mutations: [] },
        fitness: createDefaultFitness(),
        config: {
            mutationRate: 'balanced', epsilonExplore: 0.1, enableSandbox: true,
            minFitnessImprovement: 0.05, enableIntegrityCheck: true, autoRollbackThreshold: 0.15,
            allowInheritance: true, minCompatibilityScore: 0.6,
        },
        state: 'active',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function createContext(overrides?: Partial<MutationContext>): MutationContext {
    return {
        genome: createTestGenome(),
        targetChromosome: 'c1',
        reason: 'Test compression',
        ...overrides,
    };
}

// ─── TokenCompressionOperator Tests ──────────────────────────

describe('TokenCompressionOperator', () => {
    it('should fail without LLM adapter', async () => {
        const operator = new TokenCompressionOperator();
        const context = createContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(false);
        expect(result.description).toContain('No LLM adapter configured');
    });

    it('should compress genes when LLM returns shorter content', async () => {
        const mockLLM: LLMAdapter = {
            async chat() {
                return {
                    content: 'Use search tool before answering. Verify results.',
                    usage: { inputTokens: 100, outputTokens: 20 },
                };
            },
        };

        const operator = new TokenCompressionOperator(mockLLM);
        const context = createContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        expect(result.compressionMetrics).toBeDefined();
        expect(result.compressionMetrics!.compressedTokens).toBeLessThan(
            result.compressionMetrics!.originalTokens
        );
        expect(result.compressionMetrics!.ratio).toBeLessThan(1);
    });

    it('should reject when LLM returns longer content', async () => {
        const mockLLM: LLMAdapter = {
            async chat(messages) {
                // Return content that's LONGER than original
                const original = (messages[1] as any).content;
                return {
                    content: original + ' Additional unnecessary verbose content that makes this much longer than the original instruction was before compression attempt.',
                    usage: { inputTokens: 100, outputTokens: 200 },
                };
            },
        };

        const operator = new TokenCompressionOperator(mockLLM);
        const context = createContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(false);
        expect(result.description).toContain('did not reduce tokens');
    });

    it('should preserve gene fitness (no degradation)', async () => {
        const mockLLM: LLMAdapter = {
            async chat() {
                return {
                    content: 'Search first, then answer. Verify.',
                    usage: { inputTokens: 100, outputTokens: 15 },
                };
            },
        };

        const operator = new TokenCompressionOperator(mockLLM);
        const context = createContext();
        const originalFitness = context.genome.chromosomes.c1.operations[0].fitness;

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        // Fitness should be preserved, not degraded
        const compressedFitness = result.mutant.chromosomes.c1.operations[0].fitness;
        expect(compressedFitness.quality).toBe(originalFitness.quality);
        expect(compressedFitness.successRate).toBe(originalFitness.successRate);
        expect(compressedFitness.composite).toBe(originalFitness.composite);
    });

    it('should use temperature 0.3 for fidelity', async () => {
        const chatSpy = vi.fn().mockResolvedValue({
            content: 'Compressed content.',
            usage: { inputTokens: 50, outputTokens: 10 },
        });

        const mockLLM: LLMAdapter = { chat: chatSpy };
        const operator = new TokenCompressionOperator(mockLLM);
        const context = createContext();

        await operator.mutate(context);

        // Verify temperature was 0.3
        expect(chatSpy).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ temperature: 0.3 })
        );
    });

    it('should update tokenCount on compressed genes', async () => {
        const mockLLM: LLMAdapter = {
            async chat() {
                return {
                    content: 'Use search, verify results.',
                    usage: { inputTokens: 100, outputTokens: 10 },
                };
            },
        };

        const operator = new TokenCompressionOperator(mockLLM);
        const context = createContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        for (const gene of result.mutant.chromosomes.c1.operations) {
            expect(gene.tokenCount).toBeDefined();
            expect(gene.tokenCount).toBe(estimateTokenCount(gene.content));
        }
    });

    it('should handle LLM errors gracefully', async () => {
        const mockLLM: LLMAdapter = {
            async chat() {
                throw new Error('LLM service unavailable');
            },
        };

        const operator = new TokenCompressionOperator(mockLLM);
        const context = createContext();
        const result = await operator.mutate(context);

        // Should fail gracefully, not throw
        expect(result.success).toBe(false);
    });

    it('should include compression metrics in result', async () => {
        const mockLLM: LLMAdapter = {
            async chat() {
                return {
                    content: 'Short.',
                    usage: { inputTokens: 50, outputTokens: 5 },
                };
            },
        };

        const operator = new TokenCompressionOperator(mockLLM);
        const context = createContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        expect(result.compressionMetrics).toBeDefined();
        expect(result.compressionMetrics!.originalTokens).toBeGreaterThan(0);
        expect(result.compressionMetrics!.compressedTokens).toBeGreaterThan(0);
        expect(result.compressionMetrics!.ratio).toBeGreaterThan(0);
        expect(result.compressionMetrics!.ratio).toBeLessThan(1);
    });

    it('should add mutation history entry for compression', async () => {
        const mockLLM: LLMAdapter = {
            async chat() {
                return {
                    content: 'Compressed.',
                    usage: { inputTokens: 50, outputTokens: 5 },
                };
            },
        };

        const operator = new TokenCompressionOperator(mockLLM);
        const context = createContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        const gene = result.mutant.chromosomes.c1.operations[0];
        expect(gene.mutationHistory).toBeDefined();
        expect(gene.mutationHistory!.length).toBeGreaterThan(0);
        expect(gene.mutationHistory![gene.mutationHistory!.length - 1].operation).toBe('compress_instructions');
    });

    it('should estimate higher improvement for low-efficiency genomes', () => {
        const operator = new TokenCompressionOperator();

        const lowEffContext = createContext({
            genome: {
                ...createTestGenome(),
                fitness: createDefaultFitness({ tokenEfficiency: 0.2 }),
            },
        });
        const highEffContext = createContext({
            genome: {
                ...createTestGenome(),
                fitness: createDefaultFitness({ tokenEfficiency: 0.9 }),
            },
        });

        expect(operator.estimateImprovement(lowEffContext)).toBeGreaterThan(
            operator.estimateImprovement(highEffContext)
        );
    });
});

// ─── Existing operators: tokenCount tracking ─────────────────

describe('Existing operators tokenCount tracking', () => {
    it('CompressInstructionsOperator should set tokenCount on genes', async () => {
        const operator = new CompressInstructionsOperator();
        const context = createContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        for (const gene of result.mutant.chromosomes.c1.operations) {
            expect(gene.tokenCount).toBeDefined();
            expect(gene.tokenCount).toBe(estimateTokenCount(gene.content));
        }
    });

    it('SafetyReinforcementOperator should set tokenCount on genes', async () => {
        const operator = new SafetyReinforcementOperator();
        const context = createContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        for (const gene of result.mutant.chromosomes.c1.operations) {
            if (gene.category === 'tool-usage' || gene.category === 'coding-patterns') {
                expect(gene.tokenCount).toBeDefined();
            }
        }
    });

    it('ToolSelectionBiasOperator should set tokenCount on tool-usage genes', async () => {
        const operator = new ToolSelectionBiasOperator();
        const context = createContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        const toolGenes = result.mutant.chromosomes.c1.operations.filter(
            g => g.category === 'tool-usage'
        );
        for (const gene of toolGenes) {
            expect(gene.tokenCount).toBeDefined();
        }
    });
});

// ─── MutationEngine with compression ─────────────────────────

describe('MutationEngine with TokenCompressionOperator', () => {
    it('should register TokenCompressionOperator', () => {
        const engine = new MutationEngine();
        const mockLLM: LLMAdapter = {
            async chat() {
                return { content: 'short', usage: { inputTokens: 10, outputTokens: 5 } };
            },
        };

        engine.registerOperator(new TokenCompressionOperator(mockLLM));

        const ops = engine.listOperators();
        const names = ops.map(o => o.name);
        // Should have the LLM-powered version replacing the heuristic one
        expect(names).toContain('compress_instructions');
    });

    it('should include compression in mutation candidates', async () => {
        const mockLLM: LLMAdapter = {
            async chat() {
                return {
                    content: 'Compressed gene content.',
                    usage: { inputTokens: 50, outputTokens: 10 },
                };
            },
        };

        const engine = new MutationEngine();
        engine.registerOperator(new TokenCompressionOperator(mockLLM));

        const context = createContext();
        const mutants = await engine.generateMutants(context, 5);

        expect(mutants.length).toBeGreaterThan(0);

        // At least one should be from compress_instructions
        const compressMutants = mutants.filter(m =>
            m.mutation.operation === 'compress_instructions'
        );
        expect(compressMutants.length).toBeGreaterThan(0);
    });
});

// ─── selectMutationStrategy tests ───────────────────────────

describe('MutationEngine.selectMutationStrategy', () => {
    it('should return ranked operators without drift signals', () => {
        const engine = new MutationEngine();
        const context = createContext();

        const strategy = engine.selectMutationStrategy(context);

        expect(strategy.length).toBeGreaterThan(0);
        // Each entry has operator, score, reason
        for (const entry of strategy) {
            expect(entry.operator).toBeDefined();
            expect(typeof entry.score).toBe('number');
            expect(typeof entry.reason).toBe('string');
        }
        // Should be sorted descending by score
        for (let i = 1; i < strategy.length; i++) {
            expect(strategy[i - 1].score).toBeGreaterThanOrEqual(strategy[i].score);
        }
    });

    it('should boost compress_instructions on efficiency-decline drift', () => {
        const engine = new MutationEngine();
        const contextNoDrift = createContext();
        const contextWithDrift = createContext({
            genome: {
                ...createTestGenome(),
                fitness: createDefaultFitness({ tokenEfficiency: 0.3 }),
            },
        });
        contextWithDrift.evidence = {
            driftSignals: [{ type: 'efficiency-decline', severity: 'major' }],
        };

        const strategyNoDrift = engine.selectMutationStrategy(contextNoDrift);
        const strategyWithDrift = engine.selectMutationStrategy(contextWithDrift);

        const compressNoDrift = strategyNoDrift.find(s => s.operator.name === 'compress_instructions');
        const compressWithDrift = strategyWithDrift.find(s => s.operator.name === 'compress_instructions');

        expect(compressWithDrift).toBeDefined();
        expect(compressNoDrift).toBeDefined();
        // Drift boost should increase compress score
        expect(compressWithDrift!.score).toBeGreaterThan(compressNoDrift!.score);
    });

    it('should boost safety_reinforcement on quality-decline drift', () => {
        const engine = new MutationEngine();
        const context = createContext();
        context.evidence = {
            driftSignals: [{ type: 'quality-decline', severity: 'critical' }],
        };

        const strategy = engine.selectMutationStrategy(context);
        const safety = strategy.find(s => s.operator.name === 'safety_reinforcement');

        expect(safety).toBeDefined();
        expect(safety!.reason).toContain('drift:quality-decline');
    });

    it('should boost compress_instructions under token pressure', () => {
        const engine = new MutationEngine();
        // Create genome with high token usage (>1600 tokens in C1)
        const genome = createTestGenome();
        genome.chromosomes.c1.operations = [
            {
                ...genome.chromosomes.c1.operations[0],
                content: 'A'.repeat(7000), // ~1750 tokens
                tokenCount: 1750,
            },
        ];
        const context = createContext({ genome });

        const strategy = engine.selectMutationStrategy(context);
        const compress = strategy.find(s => s.operator.name === 'compress_instructions');

        expect(compress).toBeDefined();
        expect(compress!.reason).toContain('token pressure');
    });

    it('should handle multiple drift signals', () => {
        const engine = new MutationEngine();
        const context = createContext();
        context.evidence = {
            driftSignals: [
                { type: 'efficiency-decline', severity: 'major' },
                { type: 'cost-increase', severity: 'moderate' },
            ],
        };

        const strategy = engine.selectMutationStrategy(context);
        const compress = strategy.find(s => s.operator.name === 'compress_instructions');

        expect(compress).toBeDefined();
        // Both efficiency-decline and cost-increase boost compression
        expect(compress!.score).toBeGreaterThan(0);
    });
});
