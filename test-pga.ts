/**
 * Quick Test - Verify PGA Core Installation
 *
 * Tests core components
 */

import {
    GeneBank,
    type GeneStorageAdapter,
    type GeneSearchFilters,
    createGeneId,
    meetsMinimumFitness,
    calculateFitnessDelta,
    type CognitiveGene,
} from './packages/core/src/index';

// Simple in-memory storage for testing
class TestGeneStorage implements GeneStorageAdapter {
    private genes: Map<string, CognitiveGene> = new Map();
    private adoptions: Map<string, Array<{ agentId: string; performance: number }>> = new Map();

    async store(gene: CognitiveGene): Promise<void> {
        this.genes.set(gene.id, gene);
    }

    async get(geneId: string): Promise<CognitiveGene | null> {
        return this.genes.get(geneId) || null;
    }

    async update(gene: CognitiveGene): Promise<void> {
        this.genes.set(gene.id, gene);
    }

    async delete(geneId: string): Promise<void> {
        this.genes.delete(geneId);
    }

    async search(filters: GeneSearchFilters): Promise<CognitiveGene[]> {
        let results = Array.from(this.genes.values());

        if (filters.tenantId) {
            results = results.filter(g => g.tenant.tenantId === filters.tenantId);
        }

        if (filters.type && filters.type.length > 0) {
            results = results.filter(g => filters.type!.includes(g.type));
        }

        if (filters.domain && filters.domain.length > 0) {
            results = results.filter(g => filters.domain!.includes(g.domain));
        }

        if (filters.minFitness !== undefined) {
            results = results.filter(g => g.fitness.overallFitness >= filters.minFitness!);
        }

        return results.slice(0, filters.limit || 10);
    }

    async listByTenant(tenantId: string, scope?: string): Promise<CognitiveGene[]> {
        let results = Array.from(this.genes.values())
            .filter(g => g.tenant.tenantId === tenantId);

        if (scope) {
            results = results.filter(g => g.tenant.scope === scope);
        }

        return results;
    }

    async getLineage(geneId: string): Promise<CognitiveGene[]> {
        const gene = this.genes.get(geneId);
        if (!gene) return [];

        const lineage: CognitiveGene[] = [];
        let currentGeneId: string | null = gene.lineage.parentGeneId;

        while (currentGeneId) {
            const parent = this.genes.get(currentGeneId);
            if (!parent) break;
            lineage.push(parent);
            currentGeneId = parent.lineage.parentGeneId;
        }

        return lineage;
    }

    async recordAdoption(geneId: string, agentId: string, performance: number): Promise<void> {
        if (!this.adoptions.has(geneId)) {
            this.adoptions.set(geneId, []);
        }
        this.adoptions.get(geneId)!.push({ agentId, performance });

        const gene = this.genes.get(geneId);
        if (gene) {
            gene.fitness.adoptionCount++;
            const adoptions = this.adoptions.get(geneId)!;
            const avgPerformance = adoptions.reduce((sum, a) => sum + a.performance, 0) / adoptions.length;
            gene.fitness.adoptionPerformance = avgPerformance;
        }
    }
}

async function runTests() {
    console.log('🧪 Testing PGA Core Installation...\n');

    try {
        // Test 1: Gene Bank Storage
        console.log('Test 1: Creating Gene Bank Storage...');
        const storage = new TestGeneStorage();
        console.log('✅ Storage created\n');

        // Test 2: Gene Bank
        console.log('Test 2: Creating Gene Bank...');
        const geneBank = new GeneBank(storage, {
            tenantId: 'test-tenant',
            agentId: 'test-agent',
            enableTHK: true,
            minFitnessThreshold: 0.7,
            maxGenesPerAgent: 10,
        });
        console.log('✅ Gene Bank created\n');

        // Test 3: Create a Gene
        console.log('Test 3: Creating a test gene...');
        const testGene: CognitiveGene = {
            id: createGeneId('test-tenant', 'error-recovery-pattern'),
            version: '1.0.0',
            name: 'Test Error Recovery',
            description: 'A test gene for error recovery patterns',
            type: 'error-recovery-pattern',
            domain: 'testing',
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
                instruction: 'When an error occurs: 1. Log it, 2. Check if recoverable, 3. Retry with backoff',
                examples: [
                    {
                        scenario: 'API timeout',
                        expectedBehavior: 'Retry 3 times with exponential backoff',
                    },
                ],
                requiredCapabilities: ['error-handling'],
                applicableContexts: ['api-calls', 'network-ops'],
                contraindications: ['financial-transactions'],
                metadata: { testMode: true },
            },
            tenant: {
                tenantId: 'test-tenant',
                createdBy: 'test-agent',
                scope: 'tenant',
                verified: false,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ['test', 'error-handling', 'resilience'],
        };
        console.log('✅ Test gene created\n');

        // Test 4: Store Gene
        console.log('Test 4: Storing gene in Gene Bank...');
        await geneBank.storeGene(testGene);
        console.log('✅ Gene stored successfully\n');

        // Test 5: Retrieve Gene
        console.log('Test 5: Retrieving gene from Gene Bank...');
        const retrievedGene = await geneBank.getGene(testGene.id);
        if (!retrievedGene) {
            throw new Error('Gene not found');
        }
        if (retrievedGene.id !== testGene.id) {
            throw new Error('Retrieved gene ID mismatch');
        }
        console.log('✅ Gene retrieved successfully\n');

        // Test 6: Search Genes
        console.log('Test 6: Searching genes by type...');
        const searchResults = await geneBank.searchGenes({
            type: ['error-recovery-pattern'],
            minFitness: 0.8,
        });
        console.log(`✅ Found ${searchResults.length} gene(s)\n`);

        // Test 7: Record Adoption
        console.log('Test 7: Recording gene adoption...');
        await geneBank.recordAdoption(testGene.id, 'agent_bob', 0.90);
        const updatedGene = await geneBank.getGene(testGene.id);
        if (updatedGene?.fitness.adoptionCount !== 1) {
            throw new Error('Adoption count not updated');
        }
        console.log('✅ Adoption recorded successfully\n');

        // Test 8: Gene Bank Stats
        console.log('Test 8: Getting Gene Bank statistics...');
        const stats = await geneBank.getStats();
        console.log('✅ Gene Bank Stats:');
        console.log(`   Total Genes: ${stats.totalGenes}`);
        console.log(`   Average Fitness: ${stats.averageFitness.toFixed(2)}`);
        console.log(`   Genes by Type:`, stats.genesByType);
        console.log(`   Genes by Domain:`, stats.genesByDomain);
        console.log('');

        // Test 9: Helper Functions
        console.log('Test 9: Testing helper functions...');

        // Test meetsMinimumFitness
        const highFitnessGene = { ...testGene, fitness: { ...testGene.fitness, overallFitness: 0.9 } };
        const lowFitnessGene = { ...testGene, fitness: { ...testGene.fitness, overallFitness: 0.5 } };

        if (!meetsMinimumFitness(highFitnessGene, 0.7)) {
            throw new Error('meetsMinimumFitness failed for high fitness gene');
        }
        if (meetsMinimumFitness(lowFitnessGene, 0.7)) {
            throw new Error('meetsMinimumFitness failed for low fitness gene');
        }

        // Test calculateFitnessDelta
        const parentGene = { ...testGene, fitness: { ...testGene.fitness, overallFitness: 0.7 } };
        const childGene = { ...testGene, fitness: { ...testGene.fitness, overallFitness: 0.9 } };
        const delta = calculateFitnessDelta(childGene, parentGene);

        if (Math.abs(delta - 0.2) > 0.01) {
            throw new Error(`Fitness delta calculation failed: expected 0.2, got ${delta}`);
        }

        console.log('✅ Helper functions working correctly\n');

        // Success!
        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 ALL TESTS PASSED!');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('✅ Your PGA Core installation is working correctly!');
        console.log('');
        console.log('📊 Summary:');
        console.log(`   • Gene Bank: ✅ Working`);
        console.log(`   • Storage: ✅ Working`);
        console.log(`   • Gene Operations: ✅ Working`);
        console.log(`   • Search: ✅ Working`);
        console.log(`   • Adoptions: ✅ Working`);
        console.log(`   • Helper Functions: ✅ Working`);
        console.log('');
        console.log('📚 Next steps:');
        console.log('   1. Check out GETTING_STARTED.md for detailed guide');
        console.log('   2. Explore examples in /examples/ directory');
        console.log('   3. Read documentation in /docs/');
        console.log('');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        console.error('\nPlease check:');
        console.error('  1. Did you run: npm install');
        console.error('  2. Did you run: npm run build');
        console.error('  3. Are all dependencies installed?');
        console.error('');
        process.exit(1);
    }
}

runTests();
