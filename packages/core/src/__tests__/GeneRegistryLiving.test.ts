/**
 * Gene Registry & Living Agent Tests
 *
 * Tests for:
 * - Gene Registry publish/inherit
 * - Quality scoring feedback loop
 * - Canary deployment integration
 * - Auto-publish swarm intelligence
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PGA } from '../PGA.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { GeneRegistryEntry } from '../types/index.js';

// ─── Mock Implementations ───────────────────────────────────

class MockLLMAdapter implements LLMAdapter {
    async chat(messages: Array<{ role: string; content: string }>) {
        return {
            content: `Response to: ${messages[messages.length - 1].content}`,
            usage: { inputTokens: 100, outputTokens: 200 },
        };
    }
}

class MockStorageWithRegistry implements StorageAdapter {
    private genomes: Map<string, any> = new Map();
    private registry: Map<string, GeneRegistryEntry> = new Map();

    async initialize() {}
    async saveGenome(genome: any) { this.genomes.set(genome.id, genome); }
    async loadGenome(id: string) { return this.genomes.get(id) || null; }
    async listGenomes() { return Array.from(this.genomes.values()); }
    async deleteGenome(id: string) { this.genomes.delete(id); }
    async recordInteraction() {}
    async recordFeedback() {}
    async logMutation() {}
    async getAnalytics() {
        return { totalInteractions: 10, totalMutations: 2, avgFitnessImprovement: 0.05, userSatisfaction: 0.75, topGenes: [] };
    }
    async loadDNA() { return null; }
    async saveDNA() {}
    async getMutationHistory() { return []; }
    async getGeneMutationHistory() { return []; }
    async getRecentInteractions() { return []; }
    async saveFact() {}
    async getFacts() { return []; }
    async getFact() { return null; }
    async updateFact() {}
    async deleteFact() {}
    async deleteUserFacts() {}
    async cleanExpiredFacts() { return 0; }

    // Gene Registry methods
    async saveToGeneRegistry(entry: GeneRegistryEntry) {
        this.registry.set(entry.id, entry);
    }

    async queryGeneRegistry(familyId: string, gene?: string, minFitness?: number) {
        return Array.from(this.registry.values())
            .filter(e => e.familyId === familyId)
            .filter(e => !gene || e.gene === gene)
            .filter(e => !minFitness || e.fitness >= minFitness)
            .sort((a, b) => b.fitness - a.fitness);
    }

    async getBestRegistryGene(familyId: string, gene: string) {
        const results = await this.queryGeneRegistry(familyId, gene);
        return results.length > 0 ? results[0] : null;
    }

    // Expose for assertions
    getRegistryEntries() { return Array.from(this.registry.values()); }
}

// ─── Tests ────────────────────────────────────────────────────

describe('Gene Registry - Living Agent', () => {
    let llm: MockLLMAdapter;
    let storage: MockStorageWithRegistry;
    let pga: PGA;

    beforeEach(async () => {
        llm = new MockLLMAdapter();
        storage = new MockStorageWithRegistry();
        pga = new PGA({ llm, storage });
        await pga.initialize();
    });

    describe('publishGeneToRegistry', () => {
        it('should publish a gene to the family registry', async () => {
            const genome = await pga.createGenome({
                name: 'agent-alpha',
                config: { mutationRate: 'balanced', enableSandbox: true },
            });

            // Manually set familyId and add a gene
            (genome as any).genome.familyId = 'family-123';
            await genome.addAllele(1, 'coding-patterns', 'v1', 'Use clean code principles');
            // Set fitness high
            const allele = (genome as any).genome.layers.layer1.find(
                (a: any) => a.gene === 'coding-patterns' && a.variant === 'v1'
            );
            if (allele) allele.fitness = 0.9;

            const registryId = await genome.publishGeneToRegistry('coding-patterns', 'v1', 'High-quality coding gene');

            expect(registryId).toContain('family-123');
            expect(registryId).toContain('coding-patterns');

            const entries = storage.getRegistryEntries();
            expect(entries.length).toBe(1);
            expect(entries[0].gene).toBe('coding-patterns');
            expect(entries[0].familyId).toBe('family-123');
            expect(entries[0].fitness).toBe(0.9);
            expect(entries[0].content).toBe('Use clean code principles');
        });

        it('should throw if genome has no familyId', async () => {
            const genome = await pga.createGenome({ name: 'orphan-agent' });
            await genome.addAllele(1, 'test-gene', 'v1', 'content');

            await expect(
                genome.publishGeneToRegistry('test-gene', 'v1')
            ).rejects.toThrow('familyId');
        });
    });

    describe('inheritGeneFromRegistry', () => {
        it('should inherit the best gene from family registry', async () => {
            // First, publish a gene from agent-alpha
            const alpha = await pga.createGenome({ name: 'agent-alpha' });
            (alpha as any).genome.familyId = 'family-123';
            await alpha.addAllele(1, 'tool-usage', 'v1', 'Use grep for search, not find');
            const allele = (alpha as any).genome.layers.layer1.find(
                (a: any) => a.gene === 'tool-usage' && a.variant === 'v1'
            );
            if (allele) allele.fitness = 0.92;
            await alpha.publishGeneToRegistry('tool-usage', 'v1', 'Expert tool usage');

            // Now agent-beta inherits
            const beta = await pga.createGenome({ name: 'agent-beta' });
            (beta as any).genome.familyId = 'family-123';
            await beta.inheritGeneFromRegistry('family-123', 'tool-usage');

            // Verify beta has the inherited gene
            const betaAlleles = (beta as any).genome.layers.layer1;
            const inherited = betaAlleles.find((a: any) =>
                a.gene === 'tool-usage' && a.variant.startsWith('inherited_')
            );
            expect(inherited).toBeDefined();
            expect(inherited.content).toBe('Use grep for search, not find');
        });

        it('should throw if gene not found in registry', async () => {
            const genome = await pga.createGenome({ name: 'lonely-agent' });
            (genome as any).genome.familyId = 'family-123';

            await expect(
                genome.inheritGeneFromRegistry('family-123', 'nonexistent-gene')
            ).rejects.toThrow('No gene');
        });

        it('should throw if inheriting from different family', async () => {
            const genome = await pga.createGenome({ name: 'agent' });
            (genome as any).genome.familyId = 'family-A';

            await expect(
                genome.inheritGeneFromRegistry('family-B', 'some-gene')
            ).rejects.toThrow('Cannot inherit from different family');
        });
    });
});

describe('Quality Scoring - Feedback Loop', () => {
    let llm: MockLLMAdapter;
    let storage: MockStorageWithRegistry;
    let pga: PGA;

    beforeEach(async () => {
        llm = new MockLLMAdapter();
        storage = new MockStorageWithRegistry();
        pga = new PGA({ llm, storage });
        await pga.initialize();
    });

    it('should compute quality score based on response substance', async () => {
        const genome = await pga.createGenome({ name: 'quality-agent' });

        // Access private method for testing
        const computeQuality = (genome as any).computeInteractionQuality.bind(genome);

        // Good response: substantial, structured
        const goodScore = computeQuality({
            userMessage: 'How do I implement authentication?',
            assistantResponse: 'Here is how to implement authentication:\n\n1. First, set up your auth provider\n2. Configure the middleware\n\n```typescript\nconst auth = new AuthManager();\n```\n\nThis approach ensures security.',
            toolCalls: [],
            timestamp: new Date(),
        });

        // Bad response: empty
        const badScore = computeQuality({
            userMessage: 'Help me',
            assistantResponse: '',
            toolCalls: [],
            timestamp: new Date(),
        });

        // Mediocre response: short, no structure
        const mediumScore = computeQuality({
            userMessage: 'What is TypeScript?',
            assistantResponse: 'TypeScript is a superset of JavaScript.',
            toolCalls: [],
            timestamp: new Date(),
        });

        expect(goodScore).toBeGreaterThan(0.5);
        expect(badScore).toBeLessThan(0.3);
        expect(mediumScore).toBeGreaterThan(badScore);
        expect(goodScore).toBeGreaterThan(mediumScore);
    });

    it('should factor in user satisfaction when available', async () => {
        const genome = await pga.createGenome({ name: 'satisfaction-agent' });
        const computeQuality = (genome as any).computeInteractionQuality.bind(genome);

        const response = 'A reasonable response with enough content to be useful';

        const satisfiedScore = computeQuality({
            userMessage: 'Help', assistantResponse: response,
            toolCalls: [], timestamp: new Date(), userSatisfied: true,
        });

        const unsatisfiedScore = computeQuality({
            userMessage: 'Help', assistantResponse: response,
            toolCalls: [], timestamp: new Date(), userSatisfied: false,
        });

        expect(satisfiedScore).toBeGreaterThan(unsatisfiedScore);
    });
});

describe('Canary Deployment - Integration', () => {
    let llm: MockLLMAdapter;
    let storage: MockStorageWithRegistry;
    let pga: PGA;

    beforeEach(async () => {
        llm = new MockLLMAdapter();
        storage = new MockStorageWithRegistry();
        pga = new PGA({ llm, storage });
        await pga.initialize();
    });

    it('should have no active canaries by default', async () => {
        const genome = await pga.createGenome({ name: 'test-agent' });
        expect(genome.getActiveCanaries()).toHaveLength(0);
    });

    it('should track canary deployments through getActiveCanaries', async () => {
        const genome = await pga.createGenome({ name: 'canary-agent' });
        await genome.addAllele(1, 'coding-patterns', 'stable-v1', 'Current coding patterns');

        // Access canary manager to start a deployment
        const canaryMgr = (genome as any).canaryManager;
        const stableAllele = (genome as any).genome.layers.layer1.find(
            (a: any) => a.variant === 'stable-v1'
        );

        await canaryMgr.startCanary({
            genomeId: genome.id,
            layer: 1,
            gene: 'coding-patterns',
            stableAllele,
            canaryAllele: { ...stableAllele, variant: 'canary-v1', content: 'New patterns' },
        });

        const canaries = genome.getActiveCanaries();
        expect(canaries).toHaveLength(1);
        expect(canaries[0].gene).toBe('coding-patterns');
        expect(canaries[0].status).toBe('active');
    });
});
