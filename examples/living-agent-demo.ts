/**
 * Living Agent Demo - End-to-End PGA Evolution
 *
 * Demonstrates the COMPLETE lifecycle of a living PGA agent:
 * 1. Agent creation with genome
 * 2. Interactions with quality tracking
 * 3. Drift detection from declining quality
 * 4. Mutation proposal + canary deployment
 * 5. Gene published to Gene Bank
 * 6. Second agent inherits gene from family
 *
 * Run: npx tsx examples/living-agent-demo.ts
 * No external dependencies required (uses mock adapters).
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import { PGA } from '../packages/core/src/PGA.js';
import { InMemoryGeneStorage } from '../packages/core/src/gene-bank/adapters/InMemoryGeneStorage.js';
import { GeneBank } from '../packages/core/src/gene-bank/GeneBank.js';
import type { LLMAdapter, ChatResponse, Message } from '../packages/core/src/interfaces/LLMAdapter.js';
import type { StorageAdapter } from '../packages/core/src/interfaces/StorageAdapter.js';
import type { Genome, UserDNA, MutationLog, GeneRegistryEntry, SemanticFact } from '../packages/core/src/index.js';

// ═══════════════════════════════════════════════════════
// MOCK ADAPTERS (no external dependencies)
// ═══════════════════════════════════════════════════════

class DemoLLMAdapter implements LLMAdapter {
    private callCount = 0;

    async chat(messages: Message[]): Promise<ChatResponse> {
        this.callCount++;
        const userMsg = messages.find(m => m.role === 'user')?.content || '';

        // Simulate varying quality responses
        if (userMsg.includes('bad')) {
            return { content: 'ok' }; // Low quality response
        }

        return {
            content: `Here is a detailed response to your question about "${userMsg.slice(0, 50)}":\n\n` +
                `1. First, let me analyze the core issue\n` +
                `2. Then provide a structured solution\n\n` +
                '```typescript\n// Example implementation\nconst result = await solve(problem);\n```\n\n' +
                'This approach ensures maintainability and correctness.',
        };
    }
}

class DemoStorageAdapter implements StorageAdapter {
    private genomes = new Map<string, Genome>();
    private dna = new Map<string, UserDNA>();
    private mutations: MutationLog[] = [];
    private registry = new Map<string, GeneRegistryEntry>();

    async initialize() {}
    async saveGenome(genome: Genome) { this.genomes.set(genome.id, genome); }
    async loadGenome(id: string) { return this.genomes.get(id) || null; }
    async listGenomes() { return Array.from(this.genomes.values()); }
    async deleteGenome(id: string) { this.genomes.delete(id); }
    async saveDNA(userId: string, genomeId: string, dna: UserDNA) {
        this.dna.set(`${userId}:${genomeId}`, dna);
    }
    async loadDNA(userId: string, genomeId: string) {
        return this.dna.get(`${userId}:${genomeId}`) || null;
    }
    async logMutation(m: MutationLog) { this.mutations.push(m); }
    async getMutationHistory() { return this.mutations; }
    async getGeneMutationHistory() { return this.mutations; }
    async recordInteraction() {}
    async getRecentInteractions() { return []; }
    async recordFeedback() {}
    async getAnalytics() {
        return { totalInteractions: 10, totalMutations: this.mutations.length, avgFitnessImprovement: 0.05, userSatisfaction: 0.7, topGenes: [] };
    }
    async saveFact() {}
    async getFacts() { return [] as SemanticFact[]; }
    async getFact() { return null; }
    async updateFact() {}
    async deleteFact() {}
    async deleteUserFacts() {}
    async cleanExpiredFacts() { return 0; }

    // Gene Registry
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
        return results[0] || null;
    }

    getRegistrySize() { return this.registry.size; }
    getMutationCount() { return this.mutations.length; }
}

// ═══════════════════════════════════════════════════════
// DEMO EXECUTION
// ═══════════════════════════════════════════════════════

async function main() {
    console.log('========================================');
    console.log(' PGA Living Agent Demo');
    console.log(' Genomic Self-Evolving Prompts');
    console.log('========================================\n');

    const llm = new DemoLLMAdapter();
    const storage = new DemoStorageAdapter();

    // Gene Bank for cross-agent sharing
    const geneStorage = new InMemoryGeneStorage({ maxGenes: 100 });
    const geneBank = new GeneBank(geneStorage, {
        tenantId: 'demo-tenant',
        agentId: 'system',
        enableTHK: true,
        minFitnessThreshold: 0.5,
    });

    const pga = new PGA({
        llm,
        storage,
        geneBank,
    });

    await pga.initialize();

    // ─── Step 1: Create Agent Alpha ─────────────────────────

    console.log('--- Step 1: Creating Agent Alpha ---\n');

    const alpha = await pga.createGenome({
        name: 'agent-alpha',
        config: {
            mutationRate: 'balanced',
            enableSandbox: true,
            autonomous: {
                continuousEvolution: true,
                evolveEveryN: 5,
                autoMutateOnDrift: true,
                enableSwarm: true,
                autoPublishThreshold: 0.8,
                enableSelfModel: true,
                enablePatternMemory: true,
            },
        },
    });

    // Set familyId for cross-genome sharing
    (alpha as any).genome.familyId = 'demo-family';

    // Add initial genes
    await alpha.addAllele(1, 'coding-patterns', 'v1',
        'Always use TypeScript strict mode. Prefer const over let. Use meaningful variable names. Handle all error cases explicitly.');
    await alpha.addAllele(1, 'tool-usage', 'v1',
        'Use grep for text search, glob for file patterns. Prefer dedicated tools over bash commands.');
    await alpha.addAllele(1, 'communication-style', 'v1',
        'Be concise and direct. Use code examples. Structure responses with headers and lists.');

    console.log(`  Agent: ${alpha.name} (ID: ${alpha.id})`);
    console.log(`  Family: demo-family`);
    console.log(`  Genes: coding-patterns, tool-usage, communication-style`);
    console.log(`  Canary deployments: ${alpha.getActiveCanaries().length}`);
    console.log();

    // ─── Step 2: Simulate Good Interactions ─────────────────

    console.log('--- Step 2: Good Interactions (fitness increases) ---\n');

    for (let i = 0; i < 5; i++) {
        const response = await alpha.chat(
            `How do I implement feature ${i + 1}?`,
            { userId: 'user-1', taskType: 'coding' },
        );
        console.log(`  Interaction ${i + 1}: ${response.slice(0, 60)}...`);
    }

    // Manually boost fitness to simulate learning
    const layer1 = (alpha as any).genome.layers.layer1;
    for (const allele of layer1) {
        if (allele.status === 'active') {
            allele.fitness = Math.min(1, allele.fitness + 0.15);
        }
    }

    console.log();
    console.log('  Fitness after good interactions:');
    for (const allele of layer1.filter((a: any) => a.status === 'active')) {
        console.log(`    ${allele.gene}: ${allele.fitness.toFixed(2)}`);
    }
    console.log();

    // ─── Step 3: Publish High-Fitness Gene ──────────────────

    console.log('--- Step 3: Publishing Gene to Registry ---\n');

    // Boost coding-patterns to high fitness for publishing
    const codingAllele = layer1.find((a: any) => a.gene === 'coding-patterns' && a.status === 'active');
    if (codingAllele) codingAllele.fitness = 0.92;

    const registryId = await alpha.publishGeneToRegistry(
        'coding-patterns', 'v1', 'Battle-tested coding patterns'
    );

    console.log(`  Published: coding-patterns (fitness: 0.92)`);
    console.log(`  Registry ID: ${registryId}`);
    console.log(`  Registry size: ${storage.getRegistrySize()} genes`);
    console.log();

    // ─── Step 4: Trigger Mutation via Drift ─────────────────

    console.log('--- Step 4: Triggering Mutation ---\n');

    const mutationResult = await alpha.mutate({
        layer: 1,
        gene: 'tool-usage',
        taskType: 'auto-evolve',
    });

    console.log(`  Mutation applied: ${mutationResult.applied}`);
    console.log(`  Reason: ${mutationResult.reason}`);
    if (mutationResult.gateResults) {
        console.log('  Gate results:');
        console.log(`    Quality: ${mutationResult.gateResults.quality.passed ? 'PASS' : 'FAIL'} (${mutationResult.gateResults.quality.score.toFixed(2)})`);
        console.log(`    Sandbox: ${mutationResult.gateResults.sandbox.passed ? 'PASS' : 'FAIL'} (${mutationResult.gateResults.sandbox.score.toFixed(2)})`);
        console.log(`    Economic: ${mutationResult.gateResults.economic.passed ? 'PASS' : 'FAIL'} (${mutationResult.gateResults.economic.score.toFixed(2)})`);
        console.log(`    Stability: ${mutationResult.gateResults.stability.passed ? 'PASS' : 'FAIL'} (${mutationResult.gateResults.stability.score.toFixed(2)})`);
    }
    console.log(`  Active canaries: ${alpha.getActiveCanaries().length}`);
    console.log();

    // ─── Step 5: Check Evolution Health ─────────────────────

    console.log('--- Step 5: Evolution Health ---\n');

    const health = await alpha.getEvolutionHealth();
    console.log(`  Status: ${health.status}`);
    console.log(`  Avg Fitness: ${health.metrics.avgFitness.toFixed(2)}`);
    console.log(`  Mutation Rate: ${health.metrics.mutationRate.toFixed(4)}`);
    console.log(`  Warnings: ${health.warnings.length > 0 ? health.warnings.join(', ') : 'none'}`);
    console.log();

    // ─── Step 6: Create Agent Beta and Inherit ──────────────

    console.log('--- Step 6: Agent Beta Inherits from Alpha ---\n');

    const beta = await pga.createGenome({
        name: 'agent-beta',
        config: {
            mutationRate: 'balanced',
            enableSandbox: true,
            autonomous: {
                enableSwarm: true,
            },
        },
    });

    (beta as any).genome.familyId = 'demo-family';

    console.log(`  Agent Beta created: ${beta.name} (ID: ${beta.id})`);
    console.log(`  Beta genes before inheritance: ${(beta as any).genome.layers.layer1.length}`);

    // Beta inherits Alpha's coding-patterns gene
    await beta.inheritGeneFromRegistry('demo-family', 'coding-patterns');

    const betaGenes = (beta as any).genome.layers.layer1.filter((a: any) => a.status === 'active');
    console.log(`  Beta genes after inheritance: ${betaGenes.length}`);

    const inherited = betaGenes.find((a: any) =>
        a.gene === 'coding-patterns' && a.variant.startsWith('inherited_')
    );
    if (inherited) {
        console.log(`  Inherited gene: ${inherited.gene}`);
        console.log(`  Inherited variant: ${inherited.variant}`);
        console.log(`  Inherited content: ${inherited.content.slice(0, 60)}...`);
    }
    console.log();

    // ─── Step 7: Drift Detection ────────────────────────────

    console.log('--- Step 7: Drift Analysis ---\n');

    const driftReport = alpha.getDriftAnalysis();
    console.log(`  Is drifting: ${driftReport.isDrifting}`);
    console.log(`  Signals: ${driftReport.signals.length}`);
    for (const signal of driftReport.signals) {
        console.log(`    - ${signal.type}: ${signal.severity} (${signal.description})`);
    }
    console.log();

    // ─── Summary ────────────────────────────────────────────

    console.log('========================================');
    console.log(' LIVING AGENT DEMO COMPLETE');
    console.log('========================================\n');
    console.log('What happened:');
    console.log('  1. Agent Alpha was created with 3 genes');
    console.log('  2. 5 interactions improved fitness');
    console.log('  3. High-fitness gene published to Family Registry');
    console.log('  4. Mutation proposed and evaluated through 4 gates');
    console.log('  5. Agent Beta inherited coding-patterns from Alpha');
    console.log(`  6. Total mutations logged: ${storage.getMutationCount()}`);
    console.log(`  7. Registry genes available: ${storage.getRegistrySize()}`);
    console.log();
    console.log('The agents are ALIVE:');
    console.log('  - They measure their own performance (fitness)');
    console.log('  - They detect when they degrade (drift)');
    console.log('  - They propose improvements (mutations)');
    console.log('  - They validate before deploying (4-gate system)');
    console.log('  - They share knowledge across the family (gene registry)');
    console.log('  - They inherit successful strategies (inheritance)');
    console.log();
}

main().catch(console.error);
