import { z } from 'zod';
import {
    CognitiveGene,
    CognitiveGeneSchema,
    GeneType,
    SharingScope,
} from './CognitiveGene';
import type { MetricsCollector } from '../monitoring/MetricsCollector';

/**
 * GeneBank.ts
 *
 * Core repository for storing and managing Cognitive Genes.
 *
 * The Gene Bank serves as:
 * 1. Local storage for agent's successful mutations
 * 2. THK (Horizontal Knowledge Transfer) hub within tenant
 * 3. Interface to marketplace for curated genes
 *
 * Key responsibilities:
 * - Store and retrieve genes
 * - Search genes by domain, type, fitness
 * - Manage gene versions and lineages
 * - Enforce tenant isolation
 * - Track gene adoptions and performance
 *
 * @module gene-bank/GeneBank
 * @version 0.4.0
 */

// ============================================================================
// STORAGE ADAPTER INTERFACE
// ============================================================================

/**
 * Storage adapter for gene persistence
 * (Similar pattern to LLMAdapter, StorageAdapter in PGA)
 */
export interface GeneStorageAdapter {
    /**
     * Store a new gene
     */
    store(gene: CognitiveGene): Promise<void>;

    /**
     * Retrieve gene by ID
     */
    get(geneId: string): Promise<CognitiveGene | null>;

    /**
     * Update existing gene
     */
    update(gene: CognitiveGene): Promise<void>;

    /**
     * Delete gene by ID
     */
    delete(geneId: string): Promise<void>;

    /**
     * Search genes by filters
     */
    search(filters: GeneSearchFilters): Promise<CognitiveGene[]>;

    /**
     * Get all genes for a tenant
     */
    listByTenant(tenantId: string, scope?: SharingScope): Promise<CognitiveGene[]>;

    /**
     * Get gene lineage (ancestors)
     */
    getLineage(geneId: string): Promise<CognitiveGene[]>;

    /**
     * Record gene adoption
     */
    recordAdoption(geneId: string, agentId: string, performance: number): Promise<void>;
}

// ============================================================================
// SEARCH FILTERS
// ============================================================================

/**
 * Filters for gene search
 */
export const GeneSearchFiltersSchema = z.object({
    /** Filter by tenant ID */
    tenantId: z.string().optional(),

    /** Filter by gene type */
    type: z.array(z.string()).optional(),

    /** Filter by domain */
    domain: z.array(z.string()).optional(),

    /** Filter by tags */
    tags: z.array(z.string()).optional(),

    /** Minimum fitness threshold */
    minFitness: z.number().min(0).max(1).optional(),

    /** Minimum adoption count */
    minAdoptions: z.number().int().min(0).optional(),

    /** Sharing scope filter */
    scope: z.array(z.string()).optional(),

    /** Only verified genes */
    verifiedOnly: z.boolean().default(false),

    /** Sort by field */
    sortBy: z.enum(['fitness', 'adoptions', 'createdAt', 'updatedAt']).default('fitness'),

    /** Sort order */
    sortOrder: z.enum(['asc', 'desc']).default('desc'),

    /** Limit results */
    limit: z.number().int().min(1).max(100).default(10),

    /** Offset for pagination */
    offset: z.number().int().min(0).default(0),
});

export type GeneSearchFilters = z.infer<typeof GeneSearchFiltersSchema>;

// ============================================================================
// GENE BANK CONFIGURATION
// ============================================================================

/**
 * Configuration for Gene Bank
 */
export const GeneBankConfigSchema = z.object({
    /** Tenant ID for this gene bank */
    tenantId: z.string(),

    /** Agent ID that owns this gene bank */
    agentId: z.string(),

    /** Minimum fitness threshold for gene storage */
    minFitnessThreshold: z.number().min(0).max(1).default(0.6),

    /** Maximum genes to store per agent */
    maxGenesPerAgent: z.number().int().min(1).default(100),

    /** Enable THK (tenant-wide sharing) */
    enableTHK: z.boolean().default(true),

    /** Enable marketplace access */
    enableMarketplace: z.boolean().default(false),

    /** Auto-adopt high-fitness genes from tenant */
    autoAdoptFromTenant: z.boolean().default(false),

    /** Minimum fitness for auto-adoption */
    autoAdoptMinFitness: z.number().min(0).max(1).default(0.8),

    /** Maximum auto-adoptions per day */
    maxAutoAdoptionsPerDay: z.number().int().min(0).default(3),
});

export type GeneBankConfig = z.infer<typeof GeneBankConfigSchema>;

// ============================================================================
// GENE BANK STATISTICS
// ============================================================================

/**
 * Statistics about the gene bank
 */
export interface GeneBankStats {
    totalGenes: number;
    genesByType: Record<GeneType, number>;
    genesByDomain: Record<string, number>;
    averageFitness: number;
    totalAdoptions: number;
    topGenes: CognitiveGene[];
    recentGenes: CognitiveGene[];
}

// ============================================================================
// GENE BANK CLASS
// ============================================================================

/**
 * Gene Bank - Repository for Cognitive Genes
 */
export class GeneBank {
    private config: GeneBankConfig;
    private adoptionCountToday: number = 0;
    private lastAdoptionReset: Date = new Date();

    constructor(
        private storage: GeneStorageAdapter,
        config: Partial<GeneBankConfig> & { tenantId: string; agentId: string },
        private metricsCollector?: MetricsCollector
    ) {
        this.config = GeneBankConfigSchema.parse({
            ...config,
        });
    }

    // ========================================================================
    // CORE OPERATIONS
    // ========================================================================

    /**
     * Store a new gene in the bank
     */
    async storeGene(gene: CognitiveGene): Promise<void> {
        const startTime = Date.now();

        try {
            // Validate gene
            const validatedGene = CognitiveGeneSchema.parse(gene);

            // Check fitness threshold
            if (validatedGene.fitness.overallFitness < this.config.minFitnessThreshold) {
                throw new Error(
                    `Gene fitness ${validatedGene.fitness.overallFitness} below threshold ${this.config.minFitnessThreshold}`
                );
            }

            // Check tenant isolation
            if (validatedGene.tenant.tenantId !== this.config.tenantId) {
                throw new Error('Cannot store gene from different tenant');
            }

            // Check capacity
            const existingGenes = await this.storage.listByTenant(this.config.tenantId);
            let evicted = false;
            if (existingGenes.length >= this.config.maxGenesPerAgent) {
                // Remove lowest fitness gene
                const lowestFitness = existingGenes.sort(
                    (a, b) => a.fitness.overallFitness - b.fitness.overallFitness
                )[0];
                await this.storage.delete(lowestFitness.id);
                evicted = true;
            }

            // Store gene
            await this.storage.store(validatedGene);

            // Track audit log
            this.metricsCollector?.logAudit({
                level: 'info',
                component: 'GeneBank',
                operation: 'storeGene',
                message: `Stored gene ${validatedGene.name} (${validatedGene.type}) with fitness ${validatedGene.fitness.overallFitness.toFixed(2)}`,
                duration: Date.now() - startTime,
                metadata: {
                    geneId: validatedGene.id,
                    geneType: validatedGene.type,
                    domain: validatedGene.domain,
                    fitness: validatedGene.fitness.overallFitness,
                    tenantId: this.config.tenantId,
                    evicted,
                },
            });
        } catch (error) {
            // Track error
            this.metricsCollector?.logAudit({
                level: 'error',
                component: 'GeneBank',
                operation: 'storeGene',
                message: `Failed to store gene: ${error instanceof Error ? error.message : 'Unknown error'}`,
                duration: Date.now() - startTime,
                metadata: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            });

            throw error;
        }
    }

    /**
     * Retrieve gene by ID
     */
    async getGene(geneId: string): Promise<CognitiveGene | null> {
        return this.storage.get(geneId);
    }

    /**
     * Update existing gene
     */
    async updateGene(gene: CognitiveGene): Promise<void> {
        const validatedGene = CognitiveGeneSchema.parse(gene);

        // Verify ownership
        const existing = await this.storage.get(validatedGene.id);
        if (!existing) {
            throw new Error(`Gene ${validatedGene.id} not found`);
        }
        if (existing.tenant.tenantId !== this.config.tenantId) {
            throw new Error('Cannot update gene from different tenant');
        }

        await this.storage.update(validatedGene);
    }

    /**
     * Delete gene by ID
     */
    async deleteGene(geneId: string): Promise<void> {
        const existing = await this.storage.get(geneId);
        if (!existing) {
            throw new Error(`Gene ${geneId} not found`);
        }
        if (existing.tenant.tenantId !== this.config.tenantId) {
            throw new Error('Cannot delete gene from different tenant');
        }

        await this.storage.delete(geneId);
    }

    // ========================================================================
    // SEARCH & DISCOVERY
    // ========================================================================

    /**
     * Search genes by filters
     */
    async searchGenes(filters: Partial<GeneSearchFilters>): Promise<CognitiveGene[]> {
        const startTime = Date.now();

        try {
            const validatedFilters = GeneSearchFiltersSchema.parse(filters);

            // Add tenant filter for THK scope
            const finalFilters: GeneSearchFilters = {
                ...validatedFilters,
                tenantId: this.config.enableTHK ? this.config.tenantId : undefined,
            };

            const results = await this.storage.search(finalFilters);

            // Track audit log
            this.metricsCollector?.logAudit({
                level: 'info',
                component: 'GeneBank',
                operation: 'searchGenes',
                message: `Found ${results.length} genes matching filters`,
                duration: Date.now() - startTime,
                metadata: {
                    resultsFound: results.length,
                    filters: finalFilters,
                },
            });

            return results;
        } catch (error) {
            this.metricsCollector?.logAudit({
                level: 'error',
                component: 'GeneBank',
                operation: 'searchGenes',
                message: `Gene search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                duration: Date.now() - startTime,
                metadata: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            });

            throw error;
        }
    }

    /**
     * Find genes matching a domain and minimum fitness
     */
    async findByDomain(
        domain: string,
        minFitness: number = 0.7
    ): Promise<CognitiveGene[]> {
        return this.searchGenes({
            domain: [domain],
            minFitness,
            sortBy: 'fitness',
            sortOrder: 'desc',
        });
    }

    /**
     * Find genes by type
     */
    async findByType(
        type: GeneType,
        minFitness: number = 0.7
    ): Promise<CognitiveGene[]> {
        return this.searchGenes({
            type: [type],
            minFitness,
            sortBy: 'fitness',
            sortOrder: 'desc',
        });
    }

    /**
     * Get top performing genes
     */
    async getTopGenes(limit: number = 10): Promise<CognitiveGene[]> {
        return this.searchGenes({
            sortBy: 'fitness',
            sortOrder: 'desc',
            limit,
        });
    }

    /**
     * Get genes from same tenant (THK scope)
     */
    async getTenantGenes(): Promise<CognitiveGene[]> {
        if (!this.config.enableTHK) {
            throw new Error('THK is disabled');
        }

        return this.storage.listByTenant(this.config.tenantId, 'tenant');
    }

    /**
     * Get marketplace genes (curated, verified)
     */
    async getMarketplaceGenes(filters?: Partial<GeneSearchFilters>): Promise<CognitiveGene[]> {
        if (!this.config.enableMarketplace) {
            throw new Error('Marketplace is disabled');
        }

        return this.searchGenes({
            ...filters,
            scope: ['marketplace'],
            verifiedOnly: true,
            minFitness: 0.8,
        });
    }

    // ========================================================================
    // LINEAGE & EVOLUTION
    // ========================================================================

    /**
     * Get gene lineage (ancestors)
     */
    async getLineage(geneId: string): Promise<CognitiveGene[]> {
        return this.storage.getLineage(geneId);
    }

    /**
     * Get gene descendants (children)
     */
    async getDescendants(geneId: string): Promise<CognitiveGene[]> {
        const allGenes = await this.storage.listByTenant(this.config.tenantId);
        return allGenes.filter(gene => gene.lineage.parentGeneId === geneId);
    }

    // ========================================================================
    // ADOPTION TRACKING
    // ========================================================================

    /**
     * Record gene adoption
     */
    async recordAdoption(
        geneId: string,
        agentId: string,
        performance: number
    ): Promise<void> {
        const startTime = Date.now();

        // Reset daily counter if needed
        const now = new Date();
        if (now.getDate() !== this.lastAdoptionReset.getDate()) {
            this.adoptionCountToday = 0;
            this.lastAdoptionReset = now;
        }

        this.adoptionCountToday++;

        await this.storage.recordAdoption(geneId, agentId, performance);

        // Track audit log
        this.metricsCollector?.logAudit({
            level: 'info',
            component: 'GeneBank',
            operation: 'recordAdoption',
            message: `Gene ${geneId} adopted by agent ${agentId} with performance ${performance.toFixed(2)}`,
            duration: Date.now() - startTime,
            metadata: {
                geneId,
                agentId,
                performance,
                adoptionCountToday: this.adoptionCountToday,
            },
        });
    }

    /**
     * Check if auto-adoption is allowed
     */
    canAutoAdopt(): boolean {
        return this.config.autoAdoptFromTenant &&
               this.adoptionCountToday < this.config.maxAutoAdoptionsPerDay;
    }

    // ========================================================================
    // STATISTICS
    // ========================================================================

    /**
     * Get gene bank statistics
     */
    async getStats(): Promise<GeneBankStats> {
        const allGenes = await this.storage.listByTenant(this.config.tenantId);

        const genesByType: Record<string, number> = {};
        const genesByDomain: Record<string, number> = {};
        let totalFitness = 0;
        let totalAdoptions = 0;

        for (const gene of allGenes) {
            // Count by type
            genesByType[gene.type] = (genesByType[gene.type] || 0) + 1;

            // Count by domain
            genesByDomain[gene.domain] = (genesByDomain[gene.domain] || 0) + 1;

            // Sum fitness
            totalFitness += gene.fitness.overallFitness;

            // Sum adoptions
            totalAdoptions += gene.fitness.adoptionCount;
        }

        const topGenes = await this.getTopGenes(5);
        const recentGenes = await this.searchGenes({
            sortBy: 'createdAt',
            sortOrder: 'desc',
            limit: 5,
        });

        return {
            totalGenes: allGenes.length,
            genesByType: genesByType as Record<GeneType, number>,
            genesByDomain,
            averageFitness: allGenes.length > 0 ? totalFitness / allGenes.length : 0,
            totalAdoptions,
            topGenes,
            recentGenes,
        };
    }

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /**
     * Get current configuration
     */
    getConfig(): GeneBankConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<GeneBankConfig>): void {
        this.config = GeneBankConfigSchema.parse({
            ...this.config,
            ...updates,
        });
    }
}
