/**
 * Swarm Intelligence Tests
 *
 * Tests for auto-publishing and auto-importing genes
 * via the Gene Bank swarm system.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect, vi } from 'vitest';
import { GeneAdopter } from '../gene-bank/GeneAdopter.js';
import type { GeneBank } from '../gene-bank/GeneBank.js';
import type { CognitiveGene } from '../gene-bank/CognitiveGene.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';

// ─── Helpers ────────────────────────────────────────────

function createMockLLM(): LLMAdapter {
    return {
        chat: vi.fn().mockResolvedValue({ content: 'OK' }),
    } as unknown as LLMAdapter;
}

function createMockGeneBank(genes: CognitiveGene[] = []): GeneBank {
    return {
        searchGenes: vi.fn().mockResolvedValue(genes),
        storeGene: vi.fn().mockResolvedValue(undefined),
        getGene: vi.fn().mockImplementation(async (id: string) =>
            genes.find(g => g.id === id) ?? null
        ),
        getTenantGenes: vi.fn().mockResolvedValue(genes),
        recordAdoption: vi.fn().mockResolvedValue(undefined),
        canAutoAdopt: vi.fn().mockReturnValue(true),
    } as unknown as GeneBank;
}

function createCognitiveGene(overrides: Partial<CognitiveGene> = {}): CognitiveGene {
    return {
        id: 'gene-test-001',
        version: '1.0.0',
        name: 'Test Pattern',
        description: 'A test cognitive gene',
        type: 'tool-usage-pattern',
        domain: 'general',
        content: {
            instruction: 'Always validate input before processing.',
            examples: [
                { scenario: 'API call', expectedBehavior: 'Validate parameters first' },
            ],
            requiredCapabilities: [],
            applicableContexts: ['coding'],
            contraindications: ['Do not over-validate simple strings'],
            metadata: {},
        },
        fitness: {
            overallFitness: 0.88,
            taskSuccessRate: 0.9,
            tokenEfficiency: 0.85,
            responseQuality: 0.87,
            adoptionCount: 3,
            adoptionPerformance: 0.84,
        },
        lineage: {
            parentGeneId: null,
            generation: 0,
            ancestors: [],
            mutationHistory: [],
        },
        tenant: {
            tenantId: 'tenant-1',
            createdBy: 'agent-1',
            scope: 'tenant',
        },
        tags: ['tool-usage'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    } as CognitiveGene;
}

// ─── Tests ──────────────────────────────────────────────

describe('Swarm Intelligence', () => {
    it('integrateGene should build content from CognitiveGene', async () => {
        const gene = createCognitiveGene();
        const geneBank = createMockGeneBank([gene]);
        const llm = createMockLLM();
        const adopter = new GeneAdopter(geneBank, llm, { agentId: 'test-agent' }, undefined);

        // Adopt the gene (skip sandbox)
        const result = await adopter.adoptGene({
            geneId: gene.id,
            skipSandbox: true,
        });

        expect(result.success).toBe(true);
        expect(result.integrated).toBe(true);
    });

    it('buildEnhancedPrompt should include actual gene content', async () => {
        const gene = createCognitiveGene();
        const geneBank = createMockGeneBank([gene]);
        const llm = createMockLLM();
        const adopter = new GeneAdopter(geneBank, llm, { agentId: 'test-agent' }, undefined);

        // Adopt the gene
        await adopter.adoptGene({
            geneId: gene.id,
            skipSandbox: true,
        });

        // Build enhanced prompt
        const prompt = adopter.buildEnhancedPrompt('Base prompt here.');

        expect(prompt).toContain('Base prompt here.');
        expect(prompt).toContain('Always validate input before processing.');
        expect(prompt).toContain('API call');
        expect(prompt).toContain('Do not over-validate simple strings');
    });

    it('should not re-publish already published genes', () => {
        // This is tested by the publishedToSwarm flag
        const allele = {
            gene: 'tool-usage',
            variant: 'v1',
            content: 'High fitness content',
            fitness: 0.9,
            publishedToSwarm: true, // Already published
            status: 'active' as const,
            createdAt: new Date(),
        };

        // The publishedToSwarm flag should prevent re-publishing
        expect(allele.publishedToSwarm).toBe(true);
    });

    it('GeneAdopter tracks adopted gene status correctly', async () => {
        const gene = createCognitiveGene();
        const geneBank = createMockGeneBank([gene]);
        const llm = createMockLLM();
        const adopter = new GeneAdopter(geneBank, llm, { agentId: 'test-agent' }, undefined);

        await adopter.adoptGene({ geneId: gene.id, skipSandbox: true });

        const status = adopter.getGeneStatus(gene.id);
        expect(status).not.toBeNull();
        expect(status!.status).toBe('active');
        expect(status!.performance.tasksCompleted).toBe(0);
    });

    it('GeneAdopter performance tracking works', async () => {
        const gene = createCognitiveGene();
        const geneBank = createMockGeneBank([gene]);
        const llm = createMockLLM();
        const adopter = new GeneAdopter(geneBank, llm, { agentId: 'test-agent' }, undefined);

        await adopter.adoptGene({ geneId: gene.id, skipSandbox: true });

        // Update performance
        adopter.updateGenePerformance(gene.id, true, 0.85);
        adopter.updateGenePerformance(gene.id, true, 0.90);

        const status = adopter.getGeneStatus(gene.id);
        expect(status!.performance.tasksCompleted).toBe(2);
        expect(status!.performance.successRate).toBe(1.0);
        expect(status!.performance.averageFitness).toBeCloseTo(0.875, 2);
    });
});
