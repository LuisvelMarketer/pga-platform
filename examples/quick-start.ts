/**
 * Quick Start - PGA Installation in 3 Lines
 *
 * This is the simplest possible PGA integration.
 * No configuration needed - just install and go!
 *
 * @version 0.4.0
 */

import {
    GeneBank,
    InMemoryGeneStorage,
    createGeneId,
    type CognitiveGene,
} from '../packages/core/src/index';

// ═══════════════════════════════════════════════════════
// STEP 1: Create Gene Bank (ONE LINE)
// ═══════════════════════════════════════════════════════

const geneBank = new GeneBank(new InMemoryGeneStorage(), {
    tenantId: 'my-app',
    agentId: 'agent-001',
});

// ═══════════════════════════════════════════════════════
// STEP 2: Use it!
// ═══════════════════════════════════════════════════════

async function demo() {
    console.log('🧬 PGA Quick Start - 3 Line Installation\n');

    // Create a gene
    const gene: CognitiveGene = {
        id: createGeneId('my-app', 'pattern-001'),
        version: '1.0.0',
        name: 'Error Recovery Pattern',
        description: 'Graceful error handling with retry logic',
        type: 'error-recovery-pattern',
        domain: 'general',
        fitness: {
            overallFitness: 0.85,
            taskSuccessRate: 0.87,
            userSatisfaction: 0.88,
            tokenEfficiency: 0.15,
            responseQuality: 0.88,
            adoptionCount: 0,
            adoptionPerformance: null,
        },
        lineage: {
            parentGeneId: null,
            generation: 0,
            ancestors: [],
            mutationHistory: [],
        },
        content: {
            instruction: 'When error occurs: 1. Log it, 2. Check if recoverable, 3. Retry with backoff',
            examples: [
                {
                    scenario: 'API timeout',
                    expectedBehavior: 'Retry 3 times with exponential backoff',
                },
            ],
            requiredCapabilities: ['error-handling'],
            applicableContexts: ['api-calls'],
            contraindications: ['financial-transactions'],
            metadata: {},
        },
        tenant: {
            tenantId: 'my-app',
            createdBy: 'agent-001',
            scope: 'tenant',
            verified: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['error-handling', 'resilience'],
    };

    // Store it
    await geneBank.storeGene(gene);
    console.log('✅ Gene stored\n');

    // Search for it
    const results = await geneBank.searchGenes({
        type: ['error-recovery-pattern'],
    });
    console.log(`✅ Found ${results.length} gene(s)\n`);

    // Get stats
    const stats = await geneBank.getStats();
    console.log('📊 Gene Bank Stats:');
    console.log(`   Total Genes: ${stats.totalGenes}`);
    console.log(`   Average Fitness: ${stats.averageFitness.toFixed(2)}\n`);

    console.log('🎉 PGA is ready! Installation took 3 lines of code.');
}

// Run
demo().catch(console.error);
