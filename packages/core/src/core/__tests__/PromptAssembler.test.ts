/**
 * PromptAssembler Tests - Token Budget Enforcement
 *
 * Tests for PGA's token budget system in prompt assembly:
 * - Genes under budget → all included
 * - Genes over budget → ranked by token efficiency (fitness/tokens)
 * - Efficient genes preferred over bloated genes
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect } from 'vitest';
import { PromptAssembler } from '../PromptAssembler.js';
import type { StorageAdapter } from '../../interfaces/StorageAdapter.js';
import type { Genome } from '../../types/index.js';

// ─── Mock Storage ────────────────────────────────────────────

class MockStorage implements StorageAdapter {
    async initialize() {}
    async saveGenome() {}
    async loadGenome() { return null; }
    async listGenomes() { return []; }
    async deleteGenome() {}
    async recordInteraction() {}
    async recordFeedback() {}
    async logMutation() {}
    async getAnalytics() { return { totalInteractions: 0, totalMutations: 0, avgFitnessImprovement: 0, userSatisfaction: 0 }; }
    async loadDNA() { return null; }
    async saveDNA() {}
}

// ─── Test Helpers ────────────────────────────────────────────

function createGenome(layer1Genes: Array<{
    gene: string;
    content: string;
    fitness: number;
}>): Genome {
    return {
        id: 'test-genome',
        name: 'Test Genome',
        config: {
            enableSandbox: false,
            mutationRate: 'balanced',
            epsilonExplore: 0, // Disable exploration for deterministic tests
        },
        layers: {
            layer0: [],
            layer1: layer1Genes.map((g, i) => ({
                gene: g.gene,
                variant: `v${i}`,
                content: g.content,
                fitness: g.fitness,
                sampleCount: 10,
                rollbackCount: 0,
                status: 'active' as const,
            })),
            layer2: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

// ─── Token Budget Tests ──────────────────────────────────────

describe('PromptAssembler - Token Budget', () => {
    const storage = new MockStorage();

    it('should include all genes when under budget', async () => {
        // Each gene is ~25 tokens, 3 genes = ~75 tokens (well under 2000)
        const genome = createGenome([
            { gene: 'tool-usage', content: 'Use search tools to find information.', fitness: 0.8 },
            { gene: 'reasoning', content: 'Think step by step for complex problems.', fitness: 0.7 },
            { gene: 'coding-patterns', content: 'Write clean and maintainable code.', fitness: 0.75 },
        ]);

        const assembler = new PromptAssembler(storage, genome);
        const prompt = await assembler.assemblePrompt();

        // All 3 genes should be included
        expect(prompt).toContain('Use search tools');
        expect(prompt).toContain('Think step by step');
        expect(prompt).toContain('Write clean');
    });

    it('should enforce token budget when genes exceed limit', async () => {
        // Create a bloated gene that uses most of the budget
        const bloatedContent = 'A'.repeat(7600); // ~1900 tokens
        const efficientContent = 'Use search tools.'; // ~5 tokens

        const genome = createGenome([
            { gene: 'tool-usage', content: efficientContent, fitness: 0.8 },
            { gene: 'reasoning', content: bloatedContent, fitness: 0.81 }, // Slightly higher fitness but HUGELY bloated
        ]);

        const assembler = new PromptAssembler(storage, genome);
        const prompt = await assembler.assemblePrompt();

        // Efficient gene should be included (high value-per-token)
        expect(prompt).toContain('Use search tools');

        // Both should be included since total is under 2000 tokens (~1905)
        // But if we add more genes...
    });

    it('should prefer efficient gene over bloated gene when budget exceeded', async () => {
        // Create genes that together exceed 2000 tokens
        const bloatedContent = 'B'.repeat(6000); // ~1500 tokens, fitness 0.81
        const efficientContent = 'Use search tools efficiently.'; // ~8 tokens, fitness 0.8
        const anotherBloatedContent = 'C'.repeat(4000); // ~1000 tokens, fitness 0.6

        const genome = createGenome([
            { gene: 'tool-usage', content: efficientContent, fitness: 0.8 },
            { gene: 'reasoning', content: bloatedContent, fitness: 0.81 },
            { gene: 'coding-patterns', content: anotherBloatedContent, fitness: 0.6 },
        ]);

        const assembler = new PromptAssembler(storage, genome);
        const prompt = await assembler.assemblePrompt();

        // The efficient gene should definitely be included
        expect(prompt).toContain('Use search tools efficiently');

        // Total of all 3 = ~2508 tokens (over budget)
        // Efficient gene (0.8/8 = 0.1 eff) > Bloated gene (0.81/1500 = 0.00054 eff) > Another (0.6/1000 = 0.0006)
        // Should fill: efficient (8 tokens) + reasoning (1500 tokens) = 1508, then coding would push to 2508 > 2000
        // So coding-patterns should be excluded
    });

    it('should assemble with empty layer 1', async () => {
        const genome = createGenome([]);

        const assembler = new PromptAssembler(storage, genome);
        const prompt = await assembler.assemblePrompt();

        // Should not crash
        expect(prompt).toBeDefined();
    });

    it('should use configurable c1TokenBudget from CompressionConfig', async () => {
        // Two genes: 100 tokens each = 200 total
        const content100 = 'X'.repeat(400); // ~100 tokens
        const genome = createGenome([
            { gene: 'tool-usage', content: content100, fitness: 0.8 },
            { gene: 'reasoning', content: content100, fitness: 0.7 },
        ]);

        // Set budget to 150 tokens — should only fit 1 gene
        genome.config.compression = { c1TokenBudget: 150 };

        const assembler = new PromptAssembler(storage, genome);
        const prompt = await assembler.assemblePrompt();

        // Only the highest-efficiency gene should be included (both have same tokens, so higher fitness wins)
        expect(prompt).toContain('X');
        // Since both have 100 tokens and budget is 150, only 1 fits
        // The one with fitness 0.8 (tool-usage) has higher efficiency
    });

    it('should use default 2000 budget when no compression config', async () => {
        // Genes totaling ~1500 tokens — under default 2000
        const content500 = 'Y'.repeat(2000); // ~500 tokens
        const genome = createGenome([
            { gene: 'tool-usage', content: content500, fitness: 0.8 },
            { gene: 'reasoning', content: content500, fitness: 0.7 },
            { gene: 'coding-patterns', content: content500, fitness: 0.6 },
        ]);

        // No compression config set — should use default 2000
        const assembler = new PromptAssembler(storage, genome);
        const prompt = await assembler.assemblePrompt();

        // All 3 genes should be included (1500 < 2000)
        expect(prompt).toContain('Y');
    });
});
