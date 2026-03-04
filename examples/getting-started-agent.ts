/**
 * Getting Started with PGA Platform
 *
 * This example shows how to create a basic agent with:
 * - Gene Bank integration
 * - Horizontal Knowledge Transfer (THK)
 * - Multi-model support
 * - Reasoning capabilities
 *
 * @version 0.4.0
 */

import {
    // Core PGA
    PGA,

    // Adapters
    ClaudeAdapter,

    // Gene Bank
    GeneBank,
    InMemoryGeneStorage,
    createGeneId,

    // Types
    type CognitiveGene,
    type AgentConfig,
} from '../packages/core/src/index';

// ============================================================================
// STEP 1: CONFIGURATION
// ============================================================================

/**
 * Configure your agent with API keys and preferences
 */
const config: AgentConfig = {
    // LLM Configuration
    llm: {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here',
        model: 'claude-sonnet-4-5', // or claude-opus-4, claude-haiku-4
        temperature: 0.7,
        maxTokens: 4000,
    },

    // Agent Identity
    agentId: 'agent_demo_001',
    tenantId: 'tenant_demo',

    // Gene Bank Configuration
    geneBank: {
        enabled: true,
        autoExtract: true,  // Automatically extract genes from successful mutations
        autoAdopt: true,    // Automatically adopt relevant genes from Gene Bank
        minFitnessThreshold: 0.7,
        maxGenesPerAgent: 10,
        enableTHK: true,    // Enable Horizontal Knowledge Transfer
    },

    // Reasoning Configuration
    reasoning: {
        enabled: true,
        mode: 'chain-of-thought',
        depth: 3,
    },
};

// ============================================================================
// STEP 2: INITIALIZE PGA AGENT
// ============================================================================

async function createAgent() {
    console.log('🚀 Initializing PGA Agent...\n');

    // Create LLM adapter
    const llmAdapter = new ClaudeAdapter({
        apiKey: config.llm.apiKey,
        model: config.llm.model as any,
        temperature: config.llm.temperature,
        maxTokens: config.llm.maxTokens,
    });

    // Create Gene Bank with in-memory storage (for testing)
    const geneStorage = new InMemoryGeneStorage();
    const geneBank = new GeneBank(geneStorage, {
        tenantId: config.tenantId,
        agentId: config.agentId,
        minFitnessThreshold: config.geneBank.minFitnessThreshold,
        maxGenesPerAgent: config.geneBank.maxGenesPerAgent,
        enableTHK: config.geneBank.enableTHK,
    });

    // Initialize PGA
    const pga = new PGA({
        llm: llmAdapter,
        geneBank,
        agentId: config.agentId,
        tenantId: config.tenantId,
    });

    console.log('✅ PGA Agent initialized successfully!\n');

    return { pga, geneBank, llmAdapter };
}

// ============================================================================
// STEP 3: SEED GENE BANK WITH SAMPLE GENES
// ============================================================================

async function seedGeneBank(geneBank: GeneBank) {
    console.log('🧬 Seeding Gene Bank with sample genes...\n');

    // Sample Gene 1: Error Recovery Pattern
    const errorRecoveryGene: CognitiveGene = {
        id: createGeneId(config.tenantId, 'error-recovery-pattern'),
        version: '1.0.0',
        name: 'Graceful Error Recovery',
        description: 'Pattern for handling errors gracefully with retry logic',
        type: 'error-recovery-pattern',
        domain: 'general',
        fitness: {
            overallFitness: 0.85,
            taskSuccessRate: 0.87,
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
            instruction: `When encountering an error:
1. Log the error details clearly
2. Check if the error is recoverable
3. If recoverable, retry with exponential backoff (max 3 attempts)
4. If not recoverable, provide a clear error message to the user
5. Always maintain state consistency`,
            examples: [
                {
                    scenario: 'API call fails with timeout',
                    expectedBehavior: 'Retry up to 3 times with 1s, 2s, 4s delays. If all fail, inform user of network issue.',
                },
            ],
            requiredCapabilities: ['error-handling', 'state-management'],
            applicableContexts: ['api-calls', 'external-services', 'user-interactions'],
            contraindications: ['critical-operations', 'financial-transactions'],
            metadata: {
                author: 'pga-demo',
                createdDate: new Date().toISOString(),
            },
        },
        tenant: {
            tenantId: config.tenantId,
            createdBy: config.agentId,
            scope: 'tenant',
            verified: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['error-handling', 'resilience', 'best-practices'],
    };

    // Sample Gene 2: Code Review Pattern
    const codeReviewGene: CognitiveGene = {
        id: createGeneId(config.tenantId, 'reasoning-pattern'),
        version: '1.0.0',
        name: 'Systematic Code Review',
        description: 'Pattern for conducting thorough code reviews',
        type: 'reasoning-pattern',
        domain: 'coding',
        fitness: {
            overallFitness: 0.92,
            taskSuccessRate: 0.94,
            tokenEfficiency: 0.12,
            responseQuality: 0.95,
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
            instruction: `When reviewing code, systematically check:
1. **Correctness**: Does it solve the problem correctly?
2. **Security**: Are there any vulnerabilities (SQL injection, XSS, etc.)?
3. **Performance**: Are there obvious inefficiencies?
4. **Readability**: Is the code easy to understand?
5. **Tests**: Are there adequate tests?
6. **Edge Cases**: Are edge cases handled?`,
            examples: [
                {
                    scenario: 'Reviewing a new API endpoint',
                    expectedBehavior: 'Check input validation, authentication, error handling, and test coverage.',
                },
            ],
            requiredCapabilities: ['code-analysis', 'security-awareness'],
            applicableContexts: ['code-review', 'pull-requests', 'code-quality'],
            contraindications: [],
            metadata: {},
        },
        tenant: {
            tenantId: config.tenantId,
            createdBy: config.agentId,
            scope: 'tenant',
            verified: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['code-review', 'quality', 'best-practices'],
    };

    // Store genes in Gene Bank
    await geneBank.storeGene(errorRecoveryGene);
    await geneBank.storeGene(codeReviewGene);

    console.log(`✅ Stored 2 sample genes in Gene Bank\n`);

    // Show Gene Bank stats
    const stats = await geneBank.getStats();
    console.log('📊 Gene Bank Stats:');
    console.log(`   Total Genes: ${stats.totalGenes}`);
    console.log(`   Average Fitness: ${stats.averageFitness.toFixed(2)}`);
    console.log(`   Genes by Type:`);
    Object.entries(stats.genesByType).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count}`);
    });
    console.log('');
}

// ============================================================================
// STEP 4: USE THE AGENT
// ============================================================================

async function runAgentDemo(pga: PGA, geneBank: GeneBank) {
    console.log('💬 Running Agent Demo...\n');

    // Example 1: Search for relevant genes
    console.log('Example 1: Searching for error-recovery genes...');
    const errorGenes = await geneBank.searchGenes({
        type: ['error-recovery-pattern'],
        minFitness: 0.8,
    });
    console.log(`   Found ${errorGenes.length} error-recovery genes`);
    if (errorGenes.length > 0) {
        console.log(`   - ${errorGenes[0].name} (fitness: ${errorGenes[0].fitness.overallFitness})`);
    }
    console.log('');

    // Example 2: Search for code review genes
    console.log('Example 2: Searching for code-review genes...');
    const reviewGenes = await geneBank.searchGenes({
        domain: ['coding'],
        minFitness: 0.9,
    });
    console.log(`   Found ${reviewGenes.length} coding genes with fitness > 0.9`);
    if (reviewGenes.length > 0) {
        console.log(`   - ${reviewGenes[0].name} (fitness: ${reviewGenes[0].fitness.overallFitness})`);
    }
    console.log('');

    // Example 3: Adopt a gene
    console.log('Example 3: Adopting a gene...');
    if (errorGenes.length > 0) {
        const geneToAdopt = errorGenes[0];
        console.log(`   Adopting: ${geneToAdopt.name}`);

        // Record adoption
        await geneBank.recordAdoption(geneToAdopt.id, config.agentId, 0.88);

        console.log('   ✅ Gene adopted successfully!');
        console.log('   📈 This gene can now influence agent behavior');
    }
    console.log('');

    // Example 4: Show final stats
    const finalStats = await geneBank.getStats();
    console.log('📊 Final Gene Bank Stats:');
    console.log(`   Total Genes: ${finalStats.totalGenes}`);
    console.log(`   Average Fitness: ${finalStats.averageFitness.toFixed(2)}`);
    console.log(`   Highest Fitness: ${finalStats.highestFitness.toFixed(2)}`);
    console.log('');
}

// ============================================================================
// STEP 5: RUN THE DEMO
// ============================================================================

async function main() {
    try {
        console.log('═══════════════════════════════════════════════════════');
        console.log('   PGA Platform - Getting Started Demo');
        console.log('═══════════════════════════════════════════════════════\n');

        // Check for API key
        if (!process.env.ANTHROPIC_API_KEY) {
            console.log('⚠️  Warning: ANTHROPIC_API_KEY not set');
            console.log('   Set it with: export ANTHROPIC_API_KEY=your-key-here\n');
        }

        // Initialize agent
        const { pga, geneBank, llmAdapter } = await createAgent();

        // Seed Gene Bank
        await seedGeneBank(geneBank);

        // Run demo
        await runAgentDemo(pga, geneBank);

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ Demo completed successfully!');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('📚 Next Steps:');
        console.log('   1. Explore more examples in /examples/');
        console.log('   2. Read the full documentation at docs/');
        console.log('   3. Try the Gene Bank demo: examples/gene-bank-demo.ts');
        console.log('   4. Try the Reasoning demo: examples/reasoning-demo.ts');
        console.log('');

    } catch (error) {
        console.error('❌ Error running demo:', error);
        process.exit(1);
    }
}

// Run the demo
if (require.main === module) {
    main();
}

export { main, createAgent, seedGeneBank, runAgentDemo };
