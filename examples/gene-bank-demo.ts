/**
 * Gene Bank Demo - Complete THK (Horizontal Knowledge Transfer) Example
 *
 * This demo showcases the entire Gene Bank system:
 * 1. Gene Extraction from successful mutations
 * 2. Gene Storage in the Gene Bank
 * 3. Gene Discovery via Matching
 * 4. Sandbox Testing for safety
 * 5. Gene Adoption and Integration
 * 6. Full Observability with MetricsCollector
 *
 * @version 0.4.0
 * @author Luis Alfredo Velasquez Duran
 */

import {
    // Gene Bank Components
    GeneBank,
    GeneExtractor,
    GeneMatcher,
    SandboxTester,
    GeneAdopter,

    // Types
    type CognitiveGene,
    type GeneStorageAdapter,
    type GeneSearchFilters,
    type MutationContext as GeneMutationContext,
    type SandboxTestCase,
    type AdoptionRequest,

    // Observability
    MetricsCollector,
} from '@pga-ai/core';

// ============================================================================
// MOCK IMPLEMENTATIONS (For Demo Purposes)
// ============================================================================

/**
 * Mock LLM Adapter for demo
 */
class MockLLMAdapter {
    async chat(messages: any[], options?: any) {
        // Simulate LLM response for gene extraction
        const response = {
            content: JSON.stringify({
                canExtract: true,
                confidence: 0.92,
                geneType: 'error-recovery-pattern',
                name: 'Graceful Error Recovery',
                description: 'Pattern for handling errors gracefully with user-friendly messages and retry logic',
                instruction: 'When encountering an error, always: 1) Log the error details, 2) Show a user-friendly message, 3) Offer retry options, 4) Provide fallback alternatives',
                examples: [
                    {
                        scenario: 'API call fails due to network timeout',
                        expectedBehavior: 'Show "Connection timeout. Would you like to retry?" with retry and cancel buttons'
                    },
                    {
                        scenario: 'Database query returns empty result',
                        expectedBehavior: 'Display "No results found. Try adjusting your search criteria." with helpful suggestions'
                    }
                ],
                requiredCapabilities: ['error-logging', 'user-notifications'],
                applicableContexts: ['web-application', 'api-integration', 'user-facing-systems'],
                contraindications: ['batch-processing', 'silent-background-jobs'],
                reasoning: 'The mutation added comprehensive error handling that improved user satisfaction by 30%'
            }),
            role: 'assistant'
        };

        return response;
    }
}

/**
 * Mock Gene Storage Adapter (In-Memory)
 */
class InMemoryGeneStorage implements GeneStorageAdapter {
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

        // Apply filters
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

        if (filters.scope && filters.scope.length > 0) {
            results = results.filter(g => filters.scope!.includes(g.tenant.scope));
        }

        // Sort
        if (filters.sortBy === 'fitness') {
            results.sort((a, b) =>
                filters.sortOrder === 'asc'
                    ? a.fitness.overallFitness - b.fitness.overallFitness
                    : b.fitness.overallFitness - a.fitness.overallFitness
            );
        }

        // Pagination
        const offset = filters.offset || 0;
        const limit = filters.limit || 10;
        return results.slice(offset, offset + limit);
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

        // Update gene adoption metrics
        const gene = this.genes.get(geneId);
        if (gene) {
            gene.fitness.adoptionCount++;
            const adoptions = this.adoptions.get(geneId)!;
            const avgPerformance = adoptions.reduce((sum, a) => sum + a.performance, 0) / adoptions.length;
            gene.fitness.adoptionPerformance = avgPerformance;
            gene.updatedAt = new Date().toISOString();
        }
    }
}

// ============================================================================
// DEMO SCENARIOS
// ============================================================================

async function runGeneExtractionDemo(
    extractor: GeneExtractor,
    metricsCollector: MetricsCollector
) {
    console.log('\n📊 === DEMO 1: Gene Extraction from Mutation ===\n');

    // Simulate a successful mutation
    const mutationContext: GeneMutationContext = {
        mutationId: 'mutation_20260227_001',
        originalPrompt: 'Handle errors by throwing exceptions',
        mutatedPrompt: 'Handle errors gracefully: log details, show user-friendly messages, offer retry options, and provide fallback alternatives',
        parentFitness: 0.65,
        mutatedFitness: 0.87,
        taskContext: 'Building a customer-facing web application that needs robust error handling',
        domain: 'web-development',
        metrics: {
            taskSuccessRate: 0.89,
            tokenEfficiency: 0.82,
            responseQuality: 0.91,
            userSatisfaction: 0.88,
        },
    };

    const tenantInfo = {
        tenantId: 'tenant_acme_corp',
        createdBy: 'agent_alice_001',
        scope: 'tenant' as const,
        verified: false,
    };

    console.log('🔬 Extracting gene from mutation...');
    console.log(`  Original Fitness: ${mutationContext.parentFitness}`);
    console.log(`  Mutated Fitness:  ${mutationContext.mutatedFitness}`);
    console.log(`  Fitness Gain:     ${mutationContext.mutatedFitness - mutationContext.parentFitness}\n`);

    const extractionResult = await extractor.extractGene(mutationContext, tenantInfo);

    if (extractionResult.success && extractionResult.gene) {
        console.log('✅ Gene extracted successfully!');
        console.log(`  Gene ID:      ${extractionResult.gene.id}`);
        console.log(`  Name:         ${extractionResult.gene.name}`);
        console.log(`  Type:         ${extractionResult.gene.type}`);
        console.log(`  Domain:       ${extractionResult.gene.domain}`);
        console.log(`  Confidence:   ${extractionResult.confidence.toFixed(2)}`);
        console.log(`  Fitness:      ${extractionResult.gene.fitness.overallFitness.toFixed(2)}`);

        return extractionResult.gene;
    } else {
        console.log('❌ Gene extraction failed:', extractionResult.reason);
        return null;
    }
}

async function runGeneBankStorageDemo(
    geneBank: GeneBank,
    gene: CognitiveGene
) {
    console.log('\n📦 === DEMO 2: Gene Bank Storage ===\n');

    console.log('💾 Storing gene in Gene Bank...');
    await geneBank.storeGene(gene);
    console.log('✅ Gene stored successfully!\n');

    // Retrieve gene
    console.log('🔍 Retrieving gene from Gene Bank...');
    const retrieved = await geneBank.getGene(gene.id);
    if (retrieved) {
        console.log('✅ Gene retrieved successfully!');
        console.log(`  Name:    ${retrieved.name}`);
        console.log(`  Type:    ${retrieved.type}`);
        console.log(`  Fitness: ${retrieved.fitness.overallFitness.toFixed(2)}\n`);
    }

    // Get stats
    const stats = await geneBank.getStats();
    console.log('📈 Gene Bank Statistics:');
    console.log(`  Total Genes:      ${stats.totalGenes}`);
    console.log(`  Average Fitness:  ${stats.averageFitness.toFixed(2)}`);
    console.log(`  Total Adoptions:  ${stats.totalAdoptions}\n`);
}

async function runGeneMatchingDemo(
    matcher: GeneMatcher,
    geneBank: GeneBank
) {
    console.log('\n🔎 === DEMO 3: Gene Discovery via Matching ===\n');

    const matchContext = {
        task: 'Improve error handling in the checkout flow',
        domain: 'web-development',
        preferredTypes: ['error-recovery-pattern' as const],
        currentContext: 'User is trying to complete a purchase but API calls might fail',
    };

    console.log('🎯 Searching for matching genes...');
    console.log(`  Task:   ${matchContext.task}`);
    console.log(`  Domain: ${matchContext.domain}\n`);

    // Get all genes from tenant
    const candidates = await geneBank.getTenantGenes();
    console.log(`📚 Found ${candidates.length} candidate genes in tenant\n`);

    // Find matches
    const matches = await matcher.findMatches(matchContext, candidates);

    if (matches.length > 0) {
        console.log(`✅ Found ${matches.length} matching gene(s):\n`);

        matches.forEach((match, idx) => {
            console.log(`  ${idx + 1}. ${match.gene.name}`);
            console.log(`     Match Score:  ${(match.matchScore * 100).toFixed(0)}%`);
            console.log(`     Fitness:      ${(match.gene.fitness.overallFitness * 100).toFixed(0)}%`);
            console.log(`     Confidence:   ${(match.confidence * 100).toFixed(0)}%`);
            console.log(`     Reason:       ${match.reason}\n`);
        });

        return matches[0]; // Return best match
    } else {
        console.log('❌ No matching genes found\n');
        return null;
    }
}

async function runSandboxTestingDemo(
    sandboxTester: SandboxTester,
    gene: CognitiveGene
) {
    console.log('\n🧪 === DEMO 4: Sandbox Testing ===\n');

    // Define test cases
    const testCases: SandboxTestCase[] = [
        {
            id: 'test_001',
            description: 'API timeout error',
            input: 'The API request timed out after 30 seconds',
            successCriteria: (output) =>
                output.toLowerCase().includes('retry') &&
                output.toLowerCase().includes('timeout'),
        },
        {
            id: 'test_002',
            description: 'Empty database result',
            input: 'The database query returned no results',
            successCriteria: (output) =>
                output.toLowerCase().includes('no results') ||
                output.toLowerCase().includes('not found'),
        },
        {
            id: 'test_003',
            description: 'Invalid user input',
            input: 'The user entered an invalid email address',
            successCriteria: (output) =>
                output.toLowerCase().includes('invalid') &&
                output.toLowerCase().includes('email'),
        },
        {
            id: 'test_004',
            description: 'Permission denied',
            input: 'The user does not have permission to access this resource',
            successCriteria: (output) =>
                output.toLowerCase().includes('permission') ||
                output.toLowerCase().includes('access denied'),
        },
        {
            id: 'test_005',
            description: 'Server error',
            input: 'The server encountered an internal error',
            successCriteria: (output) =>
                output.toLowerCase().includes('error') &&
                output.toLowerCase().includes('try again'),
        },
    ];

    console.log(`🔬 Running ${testCases.length} sandbox tests...\n`);

    const result = await sandboxTester.testGene(gene, testCases);

    console.log('📊 Test Results:');
    console.log(`  Total Tests:      ${result.summary.totalTests}`);
    console.log(`  Passed:           ${result.summary.passed}`);
    console.log(`  Failed:           ${result.summary.failed}`);
    console.log(`  Pass Rate:        ${(result.summary.passRate * 100).toFixed(0)}%`);
    console.log(`  Avg Performance:  ${(result.summary.averagePerformance * 100).toFixed(0)}%`);
    console.log(`  Execution Time:   ${result.summary.totalExecutionTime}ms\n`);

    console.log('🔒 Safety Checks:');
    console.log(`  Status: ${result.safetyChecks.passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (result.safetyChecks.issues.length > 0) {
        console.log(`  Issues:`);
        result.safetyChecks.issues.forEach(issue => {
            console.log(`    - ${issue}`);
        });
    }
    console.log();

    console.log('💡 Recommendation:', result.recommendation.toUpperCase());
    console.log(`   Reason: ${result.reason}\n`);

    return result;
}

async function runGeneAdoptionDemo(
    adopter: GeneAdopter,
    gene: CognitiveGene,
    testCases: SandboxTestCase[]
) {
    console.log('\n🚀 === DEMO 5: Gene Adoption ===\n');

    const adoptionRequest: AdoptionRequest = {
        geneId: gene.id,
        testCases,
    };

    console.log('📥 Adopting gene...');
    console.log(`  Gene:  ${gene.name}`);
    console.log(`  Agent: agent_bob_002\n`);

    const result = await adopter.adoptGene(adoptionRequest);

    if (result.success) {
        console.log('✅ Gene adopted successfully!');
        console.log(`  Gene ID:           ${result.geneId}`);
        console.log(`  Agent ID:          ${result.agentId}`);
        console.log(`  Integrated:        ${result.integrated}`);
        console.log(`  Sandbox Tests:     ${result.sandboxResults.testsPassed}/${result.sandboxResults.testsPassed + result.sandboxResults.testsFailed} passed`);
        console.log(`  Sandbox Performance: ${(result.sandboxResults.performance * 100).toFixed(0)}%\n`);
    } else {
        console.log('❌ Gene adoption failed!');
        console.log(`  Reason: ${result.reason}\n`);
    }

    return result;
}

async function displayMetrics(metricsCollector: MetricsCollector) {
    console.log('\n📈 === OBSERVABILITY METRICS ===\n');

    const auditLogs = metricsCollector.getAuditLogs(20);

    console.log(`📋 Recent Audit Logs (${auditLogs.length} entries):\n`);

    auditLogs.forEach((log, idx) => {
        const levelEmoji = {
            'info': '✅',
            'warning': '⚠️',
            'error': '❌',
            'critical': '🔥'
        }[log.level];

        console.log(`${idx + 1}. ${levelEmoji} [${log.component}] ${log.operation}`);
        console.log(`   ${log.message}`);
        if (log.duration) {
            console.log(`   Duration: ${log.duration}ms`);
        }
        console.log();
    });
}

// ============================================================================
// MAIN DEMO
// ============================================================================

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║  🧬 PGA GENE BANK + THK DEMO                                      ║');
    console.log('║  Horizontal Knowledge Transfer System v0.4.0                      ║');
    console.log('║  Author: Luis Alfredo Velasquez Duran                             ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');

    // Initialize components
    console.log('\n⚙️  Initializing Gene Bank System...\n');

    const metricsCollector = new MetricsCollector({
        enabled: true,
        enableAuditLogs: true,
        enableCostTracking: false,
    });

    const llm = new MockLLMAdapter() as any;
    const storage = new InMemoryGeneStorage();

    const geneBank = new GeneBank(
        storage,
        {
            tenantId: 'tenant_acme_corp',
            agentId: 'agent_alice_001',
            minFitnessThreshold: 0.7,
            enableTHK: true,
        },
        metricsCollector
    );

    const geneExtractor = new GeneExtractor(llm, {
        minFitnessThreshold: 0.7,
        minFitnessGain: 0.1,
        minConfidence: 0.6,
    }, metricsCollector);

    const geneMatcher = new GeneMatcher({
        minFitness: 0.7,
        minMatchScore: 0.5,
    });

    const sandboxTester = new SandboxTester(llm, {
        testCaseCount: 5,
        minPassRate: 0.8,
        minPerformance: 0.7,
    }, metricsCollector);

    const geneAdopter = new GeneAdopter(
        geneBank,
        llm,
        {
            agentId: 'agent_bob_002',
            requireSandboxTest: true,
        },
        metricsCollector
    );

    console.log('✅ System initialized!\n');

    // Run demos
    try {
        // Demo 1: Extract gene
        const extractedGene = await runGeneExtractionDemo(geneExtractor, metricsCollector);
        if (!extractedGene) {
            console.log('❌ Demo aborted: Gene extraction failed');
            return;
        }

        // Demo 2: Store gene
        await runGeneBankStorageDemo(geneBank, extractedGene);

        // Demo 3: Match gene
        const matchResult = await runGeneMatchingDemo(geneMatcher, geneBank);
        if (!matchResult) {
            console.log('❌ Demo aborted: No matching genes found');
            return;
        }

        // Demo 4: Test gene
        const testCases: SandboxTestCase[] = [
            {
                id: 'test_001',
                description: 'API timeout error',
                input: 'The API request timed out',
                successCriteria: (output) => output.toLowerCase().includes('retry'),
            },
            {
                id: 'test_002',
                description: 'Empty result',
                input: 'No results found',
                successCriteria: (output) => output.toLowerCase().includes('no results'),
            },
            {
                id: 'test_003',
                description: 'Invalid input',
                input: 'Invalid email',
                successCriteria: (output) => output.toLowerCase().includes('invalid'),
            },
        ];

        const sandboxResult = await runSandboxTestingDemo(sandboxTester, matchResult.gene);

        // Demo 5: Adopt gene (if sandbox passed)
        if (sandboxResult.recommendation === 'adopt') {
            await runGeneAdoptionDemo(geneAdopter, matchResult.gene, testCases);
        } else {
            console.log('\n⚠️  Skipping adoption: Sandbox test did not recommend adoption\n');
        }

        // Display metrics
        await displayMetrics(metricsCollector);

        console.log('╔═══════════════════════════════════════════════════════════════════╗');
        console.log('║  ✅ DEMO COMPLETED SUCCESSFULLY                                   ║');
        console.log('║                                                                   ║');
        console.log('║  Key Features Demonstrated:                                       ║');
        console.log('║  ✓ Gene Extraction from successful mutations                     ║');
        console.log('║  ✓ Gene Bank storage and retrieval                               ║');
        console.log('║  ✓ Intelligent gene matching                                     ║');
        console.log('║  ✓ Sandbox testing for safety                                    ║');
        console.log('║  ✓ Gene adoption with THK                                        ║');
        console.log('║  ✓ Complete observability                                        ║');
        console.log('╚═══════════════════════════════════════════════════════════════════╝');

    } catch (error) {
        console.error('\n❌ Demo failed:', error);
        console.error(error);
    }
}

// Run demo
main().catch(console.error);
