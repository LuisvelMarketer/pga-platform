/**
 * PGA Core Integration for Gene Bank
 *
 * Shows how to integrate Gene Bank with PGA's mutation engine
 * for automatic gene extraction and adoption
 *
 * @version 0.4.0
 */

import type {
    CognitiveGene,
    MutationContext,
    TenantInfo,
} from './CognitiveGene';
import { GeneBank } from './GeneBank';
import { GeneExtractor } from './GeneExtractor';
import { GeneAdopter } from './GeneAdopter';
import type { GeneStorageAdapter } from './GeneBank';
import type { LLMAdapter } from '../interfaces/LLMAdapter';
import type { MetricsCollector } from '../monitoring/MetricsCollector';

// Import PGA types (these would be from actual PGA core)
type Genome = any; // Placeholder
type MutationProposal = any; // Placeholder
type FitnessMetrics = any; // Placeholder

/**
 * Configuration for PGA Gene Bank Integration
 */
export interface PGAGeneBankConfig {
    /** Enable automatic gene extraction */
    autoExtract?: boolean;

    /** Enable automatic gene adoption */
    autoAdopt?: boolean;

    /** Minimum fitness to extract gene */
    minFitnessForExtraction?: number;

    /** Minimum fitness gain to extract gene */
    minFitnessGainForExtraction?: number;

    /** Enable THK (tenant-wide sharing) */
    enableTHK?: boolean;

    /** Gene Bank storage adapter */
    storage: GeneStorageAdapter;

    /** Metrics collector (optional) */
    metricsCollector?: MetricsCollector;
}

/**
 * PGA Gene Bank Integration
 *
 * Connects Gene Bank with PGA's mutation engine for:
 * 1. Auto-extraction when mutations succeed
 * 2. Auto-adoption when similar tasks detected
 * 3. Lineage tracking for gene evolution
 */
export class PGAGeneBankIntegration {
    private geneBank: GeneBank;
    private geneExtractor: GeneExtractor;
    private geneAdopters: Map<string, GeneAdopter> = new Map();

    constructor(
        private llm: LLMAdapter,
        private config: PGAGeneBankConfig,
        private tenantId: string
    ) {
        // Initialize Gene Bank
        this.geneBank = new GeneBank(
            config.storage,
            {
                tenantId,
                agentId: 'pga_system',
                enableTHK: config.enableTHK ?? true,
                minFitnessThreshold: config.minFitnessForExtraction ?? 0.7,
            },
            config.metricsCollector
        );

        // Initialize Gene Extractor
        this.geneExtractor = new GeneExtractor(
            llm,
            {
                minFitnessThreshold: config.minFitnessForExtraction ?? 0.7,
                minFitnessGain: config.minFitnessGainForExtraction ?? 0.1,
                autoExtract: config.autoExtract ?? true,
            },
            config.metricsCollector
        );
    }

    /**
     * Hook into PGA mutation lifecycle
     *
     * Call this after a mutation is promoted to production
     */
    async onMutationPromoted(
        genome: Genome,
        mutation: MutationProposal,
        oldFitness: number,
        newFitness: number
    ): Promise<CognitiveGene | null> {
        // Only extract if auto-extraction enabled
        if (!this.config.autoExtract) {
            return null;
        }

        // Build mutation context for extraction
        const mutationContext: MutationContext = {
            mutationId: mutation.id || `mut_${Date.now()}`,
            originalPrompt: this.extractPromptFromGenome(genome, 'before'),
            mutatedPrompt: this.extractPromptFromGenome(genome, 'after'),
            parentFitness: oldFitness,
            mutatedFitness: newFitness,
            taskContext: this.extractTaskContext(genome),
            domain: this.inferDomain(genome),
            metrics: this.convertFitnessMetrics(mutation.fitnessMetrics),
        };

        // Tenant info from genome
        const tenantInfo: TenantInfo = {
            tenantId: this.tenantId,
            createdBy: genome.id || 'unknown',
            scope: 'tenant', // Share within tenant
            verified: false,
        };

        // Extract gene
        const extractionResult = await this.geneExtractor.extractGene(
            mutationContext,
            tenantInfo
        );

        if (extractionResult.success && extractionResult.gene) {
            // Store in Gene Bank
            await this.geneBank.storeGene(extractionResult.gene);

            return extractionResult.gene;
        }

        return null;
    }

    /**
     * Hook into PGA task execution
     *
     * Call this before executing a task to check for helpful genes
     */
    async onTaskStart(
        genome: Genome,
        taskDescription: string,
        domain?: string
    ): Promise<CognitiveGene[]> {
        // Only auto-adopt if enabled
        if (!this.config.autoAdopt) {
            return [];
        }

        // Get or create adopter for this genome
        let adopter = this.geneAdopters.get(genome.id);
        if (!adopter) {
            adopter = new GeneAdopter(
                this.geneBank,
                this.llm,
                {
                    agentId: genome.id,
                    autoAdopt: true,
                    requireSandboxTest: true,
                },
                this.config.metricsCollector
            );
            this.geneAdopters.set(genome.id, adopter);
        }

        // Search for relevant genes
        const matchContext = {
            task: taskDescription,
            domain: domain || this.inferDomain(genome),
        };

        // Auto-adopt for task (with sandbox testing)
        const testCases = this.generateTestCasesForTask(taskDescription);
        const adoptionResults = await adopter.autoAdoptForTask(matchContext, testCases);

        // Return successfully adopted genes
        const adoptedGenes: CognitiveGene[] = [];
        for (const result of adoptionResults) {
            if (result.success) {
                const gene = await this.geneBank.getGene(result.geneId);
                if (gene) {
                    adoptedGenes.push(gene);
                }
            }
        }

        return adoptedGenes;
    }

    /**
     * Hook into PGA task completion
     *
     * Call this after a task completes to track gene performance
     */
    async onTaskComplete(
        genome: Genome,
        taskSuccess: boolean,
        fitness: number
    ): Promise<void> {
        const adopter = this.geneAdopters.get(genome.id);
        if (!adopter) {
            return;
        }

        // Update performance for all adopted genes
        const adoptedGenes = adopter.getAdoptedGenes();
        for (const geneStatus of adoptedGenes) {
            adopter.updateGenePerformance(geneStatus.geneId, taskSuccess, fitness);
        }
    }

    /**
     * Get enhanced prompt with adopted genes
     *
     * Call this to get a prompt that includes gene instructions
     */
    async getEnhancedPrompt(
        genome: Genome,
        basePrompt: string
    ): Promise<string> {
        const adopter = this.geneAdopters.get(genome.id);
        if (!adopter) {
            return basePrompt;
        }

        return adopter.buildEnhancedPrompt(basePrompt);
    }

    /**
     * Get Gene Bank instance for direct access
     */
    getGeneBank(): GeneBank {
        return this.geneBank;
    }

    /**
     * Get adoption statistics
     */
    async getStats() {
        const geneBankStats = await this.geneBank.getStats();

        const adoptionStats = Array.from(this.geneAdopters.entries()).map(
            ([genomeId, adopter]) => ({
                genomeId,
                adoptedGenes: adopter.getAdoptedGenes().length,
                config: adopter.getConfig(),
            })
        );

        return {
            geneBank: geneBankStats,
            adoptions: adoptionStats,
        };
    }

    // ========================================================================
    // HELPER METHODS (Placeholders - implement based on actual PGA API)
    // ========================================================================

    private extractPromptFromGenome(genome: Genome, version: 'before' | 'after'): string {
        // TODO: Implement based on actual Genome structure
        return version === 'before'
            ? genome.previousPrompt || 'Original prompt'
            : genome.currentPrompt || 'Mutated prompt';
    }

    private extractTaskContext(genome: Genome): string {
        // TODO: Extract task context from genome metadata
        return genome.taskContext || 'General task context';
    }

    private inferDomain(genome: Genome): string {
        // TODO: Infer domain from genome metadata, tags, or usage patterns
        return genome.domain || 'general';
    }

    private convertFitnessMetrics(fitnessMetrics: FitnessMetrics): any {
        // TODO: Convert PGA fitness metrics to gene fitness format
        return {
            taskSuccessRate: fitnessMetrics?.successRate || 0,
            tokenEfficiency: fitnessMetrics?.tokenEfficiency || 0,
            responseQuality: fitnessMetrics?.quality || 0,
            userSatisfaction: fitnessMetrics?.userSatisfaction,
        };
    }

    private generateTestCasesForTask(_taskDescription: string): any[] {
        // TODO: Generate relevant test cases based on task
        // For now, return empty array (sandbox testing will be skipped)
        return [];
    }
}

/**
 * Usage Example:
 *
 * ```typescript
 * // Initialize PGA with Gene Bank
 * const pga = new PGA({
 *   llm: new ClaudeAdapter({ apiKey }),
 *   storage: new PostgresAdapter({ connectionString }),
 * });
 *
 * // Initialize Gene Bank Integration
 * const geneBankIntegration = new PGAGeneBankIntegration(
 *   pga.llm,
 *   {
 *     storage: new PostgresGeneStorage(pgConnection),
 *     autoExtract: true,
 *     autoAdopt: true,
 *     enableTHK: true,
 *   },
 *   'tenant_company_123'
 * );
 *
 * // Hook into PGA lifecycle
 * pga.on('mutation:promoted', async (genome, mutation, oldFitness, newFitness) => {
 *   const gene = await geneBankIntegration.onMutationPromoted(
 *     genome,
 *     mutation,
 *     oldFitness,
 *     newFitness
 *   );
 *
 *   if (gene) {
 *     console.log(`✅ Gene extracted: ${gene.name}`);
 *   }
 * });
 *
 * pga.on('task:start', async (genome, taskDescription, domain) => {
 *   const adoptedGenes = await geneBankIntegration.onTaskStart(
 *     genome,
 *     taskDescription,
 *     domain
 *   );
 *
 *   console.log(`🧬 Adopted ${adoptedGenes.length} genes for this task`);
 * });
 *
 * pga.on('task:complete', async (genome, success, fitness) => {
 *   await geneBankIntegration.onTaskComplete(genome, success, fitness);
 * });
 *
 * // Use in chat with enhanced prompt
 * const genome = await pga.createGenome({ name: 'assistant' });
 * const basePrompt = await genome.getPrompt();
 * const enhancedPrompt = await geneBankIntegration.getEnhancedPrompt(
 *   genome,
 *   basePrompt
 * );
 *
 * const response = await genome.chat({
 *   userId: 'user123',
 *   message: 'Hello!',
 *   prompt: enhancedPrompt, // Uses adopted genes
 * });
 * ```
 */
