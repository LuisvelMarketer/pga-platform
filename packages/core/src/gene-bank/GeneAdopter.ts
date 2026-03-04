import { z } from 'zod';
import {
    CognitiveGene,
    GeneAdoptionResult,
} from './CognitiveGene';
import { GeneBank } from './GeneBank';
import { GeneMatcher, MatchContext, GeneMatchResult } from './GeneMatcher';
import { SandboxTester, SandboxTestCase, SandboxTestResult } from './SandboxTester';
import type { LLMAdapter } from '../interfaces/LLMAdapter';
import type { MetricsCollector } from '../monitoring/MetricsCollector';

/**
 * GeneAdopter.ts
 *
 * Orchestrates the gene adoption process.
 *
 * The Gene Adopter is the high-level component that:
 * 1. Searches for relevant genes (using GeneMatcher)
 * 2. Tests genes in sandbox (using SandboxTester)
 * 3. Integrates successful genes into agent prompt
 * 4. Tracks adoption performance
 *
 * This is the main interface for Horizontal Knowledge Transfer (THK).
 *
 * @module gene-bank/GeneAdopter
 * @version 0.4.0
 */

// ============================================================================
// ADOPTION CONFIGURATION
// ============================================================================

/**
 * Configuration for gene adoption
 */
export const GeneAdoptionConfigSchema = z.object({
    /** Agent ID adopting genes */
    agentId: z.string(),

    /** Maximum genes to adopt at once */
    maxConcurrentAdoptions: z.number().int().min(1).default(3),

    /** Whether to require sandbox testing */
    requireSandboxTest: z.boolean().default(true),

    /** Auto-adopt high-confidence genes */
    autoAdopt: z.boolean().default(false),

    /** Minimum confidence for auto-adoption */
    autoAdoptMinConfidence: z.number().min(0).max(1).default(0.9),

    /** Track adoption performance */
    trackPerformance: z.boolean().default(true),

    /** Performance tracking window (days) */
    performanceWindowDays: z.number().int().min(1).default(7),
});

export type GeneAdoptionConfig = z.infer<typeof GeneAdoptionConfigSchema>;

// ============================================================================
// ADOPTION REQUEST
// ============================================================================

/**
 * Request to adopt a gene
 */
export interface AdoptionRequest {
    /** Gene ID to adopt */
    geneId?: string;

    /** Or match context to find gene */
    matchContext?: MatchContext;

    /** Test cases for sandbox (if required) */
    testCases?: SandboxTestCase[];

    /** Force adoption without sandbox */
    skipSandbox?: boolean;

    /** Metadata */
    metadata?: Record<string, unknown>;
}

// ============================================================================
// ADOPTION STATUS
// ============================================================================

/**
 * Status of an adopted gene
 */
export interface AdoptedGeneStatus {
    /** Gene ID */
    geneId: string;

    /** Adoption timestamp */
    adoptedAt: string;

    /** Current status */
    status: 'active' | 'testing' | 'failed' | 'removed';

    /** Performance since adoption */
    performance: {
        tasksCompleted: number;
        successRate: number;
        averageFitness: number;
    };

    /** Issues encountered */
    issues: string[];
}

// ============================================================================
// GENE ADOPTER CLASS
// ============================================================================

/**
 * Gene Adopter - Orchestrates gene adoption
 */
export class GeneAdopter {
    private config: GeneAdoptionConfig;
    private adoptedGenes: Map<string, AdoptedGeneStatus> = new Map();
    private geneContentCache: Map<string, string> = new Map();
    private matcher: GeneMatcher;
    private sandboxTester: SandboxTester;

    constructor(
        private geneBank: GeneBank,
        private llm: LLMAdapter,
        config: Partial<GeneAdoptionConfig> & { agentId: string },
        private metricsCollector?: MetricsCollector
    ) {
        this.config = GeneAdoptionConfigSchema.parse(config);
        this.matcher = new GeneMatcher();
        this.sandboxTester = new SandboxTester(this.llm, undefined, this.metricsCollector);
    }

    // ========================================================================
    // ADOPTION PROCESS
    // ========================================================================

    /**
     * Adopt a gene
     */
    async adoptGene(request: AdoptionRequest): Promise<GeneAdoptionResult> {
        const startTime = Date.now();

        try {
            // Step 1: Get the gene
            let gene: CognitiveGene | null = null;
            let matchResult: GeneMatchResult | null = null;

            if (request.geneId) {
                // Direct gene ID provided
                gene = await this.geneBank.getGene(request.geneId);
                if (!gene) {
                    return this.buildFailedResult(
                        request.geneId,
                        'Gene not found',
                        startTime
                    );
                }
            } else if (request.matchContext) {
                // Find gene via matching
                const candidates = await this.geneBank.getTenantGenes();
                matchResult = await this.matcher.findBestMatch(request.matchContext, candidates);

                if (!matchResult) {
                    return this.buildFailedResult(
                        'unknown',
                        'No matching gene found',
                        startTime
                    );
                }

                gene = matchResult.gene;
            } else {
                return this.buildFailedResult(
                    'unknown',
                    'Must provide either geneId or matchContext',
                    startTime
                );
            }

            // Step 2: Check if already adopted
            if (this.adoptedGenes.has(gene.id)) {
                return this.buildFailedResult(
                    gene.id,
                    'Gene already adopted',
                    startTime
                );
            }

            // Step 3: Check concurrent adoptions limit
            const activeAdoptions = Array.from(this.adoptedGenes.values()).filter(
                status => status.status === 'active' || status.status === 'testing'
            ).length;

            if (activeAdoptions >= this.config.maxConcurrentAdoptions) {
                return this.buildFailedResult(
                    gene.id,
                    `Maximum concurrent adoptions (${this.config.maxConcurrentAdoptions}) reached`,
                    startTime
                );
            }

            // Step 4: Sandbox testing (if required)
            let sandboxResult: SandboxTestResult | null = null;

            if (this.config.requireSandboxTest && !request.skipSandbox) {
                if (!request.testCases || request.testCases.length === 0) {
                    return this.buildFailedResult(
                        gene.id,
                        'Test cases required for sandbox testing',
                        startTime
                    );
                }

                sandboxResult = await this.sandboxTester.testGene(gene, request.testCases);

                if (sandboxResult.recommendation === 'reject') {
                    return {
                        success: false,
                        geneId: gene.id,
                        agentId: this.config.agentId,
                        sandboxResults: {
                            passed: false,
                            testsPassed: sandboxResult.summary.passed,
                            testsFailed: sandboxResult.summary.failed,
                            performance: sandboxResult.summary.averagePerformance,
                            issues: [sandboxResult.reason],
                        },
                        integrated: false,
                        reason: `Sandbox test failed: ${sandboxResult.reason}`,
                        metadata: {
                            adoptionTimestamp: new Date().toISOString(),
                            durationMs: Date.now() - startTime,
                        },
                    };
                }
            }

            // Step 5: Integrate gene
            const integrated = await this.integrateGene(gene);

            if (!integrated) {
                return this.buildFailedResult(
                    gene.id,
                    'Failed to integrate gene',
                    startTime
                );
            }

            // Step 6: Record adoption
            this.adoptedGenes.set(gene.id, {
                geneId: gene.id,
                adoptedAt: new Date().toISOString(),
                status: 'active',
                performance: {
                    tasksCompleted: 0,
                    successRate: 0,
                    averageFitness: 0,
                },
                issues: [],
            });

            // Step 7: Track in gene bank
            if (this.config.trackPerformance) {
                await this.geneBank.recordAdoption(
                    gene.id,
                    this.config.agentId,
                    sandboxResult?.summary.averagePerformance || 1.0
                );
            }

            // Track successful adoption
            this.metricsCollector?.logAudit({
                level: 'info',
                component: 'GeneAdopter',
                operation: 'adoptGene',
                message: `Successfully adopted gene ${gene.name} (${gene.type}) with fitness ${gene.fitness.overallFitness.toFixed(2)}`,
                duration: Date.now() - startTime,
                metadata: {
                    geneId: gene.id,
                    geneName: gene.name,
                    geneType: gene.type,
                    domain: gene.domain,
                    agentId: this.config.agentId,
                    sandboxTested: !!sandboxResult,
                    sandboxPerformance: sandboxResult?.summary.averagePerformance,
                },
            });

            // Return success result
            return {
                success: true,
                geneId: gene.id,
                agentId: this.config.agentId,
                sandboxResults: sandboxResult
                    ? {
                          passed: true,
                          testsPassed: sandboxResult.summary.passed,
                          testsFailed: sandboxResult.summary.failed,
                          performance: sandboxResult.summary.averagePerformance,
                          issues: [],
                      }
                    : {
                          passed: true,
                          testsPassed: 0,
                          testsFailed: 0,
                          performance: 1.0,
                          issues: [],
                      },
                integrated: true,
                metadata: {
                    adoptionTimestamp: new Date().toISOString(),
                    durationMs: Date.now() - startTime,
                },
            };
        } catch (error) {
            // Track adoption error
            this.metricsCollector?.logAudit({
                level: 'error',
                component: 'GeneAdopter',
                operation: 'adoptGene',
                message: `Gene adoption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                duration: Date.now() - startTime,
                metadata: {
                    geneId: request.geneId || 'unknown',
                    agentId: this.config.agentId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            });

            return this.buildFailedResult(
                request.geneId || 'unknown',
                error instanceof Error ? error.message : 'Unknown error',
                startTime
            );
        }
    }

    /**
     * Auto-adopt high-confidence genes for a task
     */
    async autoAdoptForTask(
        matchContext: MatchContext,
        testCases: SandboxTestCase[]
    ): Promise<GeneAdoptionResult[]> {
        if (!this.config.autoAdopt) {
            return [];
        }

        // Find matching genes
        const candidates = await this.geneBank.getTenantGenes();
        const matches = await this.matcher.findMatches(matchContext, candidates);

        // Filter high-confidence matches
        const highConfidence = matches.filter(
            m => m.confidence >= this.config.autoAdoptMinConfidence
        );

        // Adopt each gene
        const results: GeneAdoptionResult[] = [];

        for (const match of highConfidence) {
            // Check if we can adopt more
            if (!this.geneBank.canAutoAdopt()) {
                break;
            }

            const result = await this.adoptGene({
                geneId: match.gene.id,
                testCases,
            });

            results.push(result);

            // Stop if adoption failed
            if (!result.success) {
                break;
            }
        }

        return results;
    }

    // ========================================================================
    // INTEGRATION
    // ========================================================================

    /**
     * Integrate gene into agent by building prompt content from CognitiveGene.
     */
    private async integrateGene(gene: CognitiveGene): Promise<boolean> {
        let content = gene.content.instruction;

        // Include examples if available
        if (gene.content.examples && gene.content.examples.length > 0) {
            content += '\n\nExamples:\n' + gene.content.examples
                .map(e => `- ${e.scenario}: ${e.expectedBehavior}`)
                .join('\n');
        }

        // Include contraindications
        if (gene.content.contraindications.length > 0) {
            content += '\n\nAvoid:\n' + gene.content.contraindications
                .map(c => `- ${c}`)
                .join('\n');
        }

        // Cache for prompt building
        this.geneContentCache.set(gene.id, content);

        return content.length > 0;
    }

    /**
     * Build enhanced prompt with adopted genes
     */
    buildEnhancedPrompt(basePrompt: string): string {
        const activeGenes = Array.from(this.adoptedGenes.values())
            .filter(status => status.status === 'active')
            .map(status => status.geneId);

        if (activeGenes.length === 0) {
            return basePrompt;
        }

        // Build gene instructions from cached content
        const geneInstructions: string[] = [];

        for (const geneId of activeGenes) {
            const content = this.geneContentCache.get(geneId);
            if (content) {
                geneInstructions.push(content);
            }
        }

        if (geneInstructions.length === 0) {
            return basePrompt;
        }

        // Combine base prompt with gene instructions
        return `${basePrompt}

## Adopted Cognitive Genes

The following behavioral patterns have been adopted:

${geneInstructions.join('\n\n---\n\n')}

Apply these patterns when relevant to the current task.`;
    }

    // ========================================================================
    // MANAGEMENT
    // ========================================================================

    /**
     * Remove an adopted gene
     */
    async removeGene(geneId: string): Promise<boolean> {
        const status = this.adoptedGenes.get(geneId);
        if (!status) {
            return false;
        }

        status.status = 'removed';
        this.adoptedGenes.delete(geneId);
        return true;
    }

    /**
     * Get status of adopted gene
     */
    getGeneStatus(geneId: string): AdoptedGeneStatus | null {
        return this.adoptedGenes.get(geneId) || null;
    }

    /**
     * Get all adopted genes
     */
    getAdoptedGenes(): AdoptedGeneStatus[] {
        return Array.from(this.adoptedGenes.values());
    }

    /**
     * Update gene performance
     */
    updateGenePerformance(
        geneId: string,
        taskSuccess: boolean,
        fitness: number
    ): void {
        const status = this.adoptedGenes.get(geneId);
        if (!status || status.status !== 'active') {
            return;
        }

        // Update performance metrics
        const perf = status.performance;
        perf.tasksCompleted++;

        const newSuccessRate =
            (perf.successRate * (perf.tasksCompleted - 1) + (taskSuccess ? 1 : 0)) /
            perf.tasksCompleted;

        const newAvgFitness =
            (perf.averageFitness * (perf.tasksCompleted - 1) + fitness) /
            perf.tasksCompleted;

        perf.successRate = newSuccessRate;
        perf.averageFitness = newAvgFitness;

        // Check if performance is degrading
        if (perf.tasksCompleted >= 10 && perf.successRate < 0.5) {
            status.issues.push('Low success rate detected');
            status.status = 'failed';
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Build failed adoption result
     */
    private buildFailedResult(
        geneId: string,
        reason: string,
        startTime: number
    ): GeneAdoptionResult {
        return {
            success: false,
            geneId,
            agentId: this.config.agentId,
            sandboxResults: {
                passed: false,
                testsPassed: 0,
                testsFailed: 0,
                performance: 0,
                issues: [reason],
            },
            integrated: false,
            reason,
            metadata: {
                adoptionTimestamp: new Date().toISOString(),
                durationMs: Date.now() - startTime,
            },
        };
    }

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /**
     * Get current configuration
     */
    getConfig(): GeneAdoptionConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<GeneAdoptionConfig>): void {
        this.config = GeneAdoptionConfigSchema.parse({
            ...this.config,
            ...updates,
        });
    }
}
