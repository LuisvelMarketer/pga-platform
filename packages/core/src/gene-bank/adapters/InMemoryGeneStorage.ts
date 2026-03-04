/**
 * InMemoryGeneStorage
 *
 * Simple in-memory storage for Cognitive Genes.
 * Perfect for development, testing, and prototyping.
 *
 * ⚠️ Data is lost when process exits.
 * For production, use PostgresGeneStorage or implement a persistent adapter.
 *
 * @module gene-bank/adapters/InMemoryGeneStorage
 * @version 0.4.0
 */

import type { CognitiveGene } from '../CognitiveGene';
import type { GeneStorageAdapter, GeneSearchFilters } from '../GeneBank';
import type { SharingScope } from '../CognitiveGene';

/**
 * In-memory storage adapter for Cognitive Genes
 *
 * @example
 * ```typescript
 * import { GeneBank, InMemoryGeneStorage } from '@pga-ai/core';
 *
 * const storage = new InMemoryGeneStorage();
 * const geneBank = new GeneBank(storage, {
 *   tenantId: 'my-app',
 *   agentId: 'agent-001',
 * });
 * ```
 */
export class InMemoryGeneStorage implements GeneStorageAdapter {
    private genes: Map<string, CognitiveGene> = new Map();
    private adoptions: Map<string, Array<{ agentId: string; performance: number }>> = new Map();

    /**
     * Store a new gene
     */
    async store(gene: CognitiveGene): Promise<void> {
        this.genes.set(gene.id, gene);
    }

    /**
     * Retrieve gene by ID
     */
    async get(geneId: string): Promise<CognitiveGene | null> {
        return this.genes.get(geneId) || null;
    }

    /**
     * Update existing gene
     */
    async update(gene: CognitiveGene): Promise<void> {
        if (!this.genes.has(gene.id)) {
            throw new Error(`Gene not found: ${gene.id}`);
        }
        this.genes.set(gene.id, gene);
    }

    /**
     * Delete gene by ID
     */
    async delete(geneId: string): Promise<void> {
        this.genes.delete(geneId);
        this.adoptions.delete(geneId);
    }

    /**
     * Search genes by filters
     */
    async search(filters: GeneSearchFilters): Promise<CognitiveGene[]> {
        let results = Array.from(this.genes.values());

        // Filter by tenant
        if (filters.tenantId) {
            results = results.filter(g => g.tenant.tenantId === filters.tenantId);
        }

        // Filter by type
        if (filters.type && filters.type.length > 0) {
            results = results.filter(g => filters.type!.includes(g.type));
        }

        // Filter by domain
        if (filters.domain && filters.domain.length > 0) {
            results = results.filter(g => filters.domain!.includes(g.domain));
        }

        // Filter by tags
        if (filters.tags && filters.tags.length > 0) {
            results = results.filter(g =>
                filters.tags!.some(tag => g.tags.includes(tag))
            );
        }

        // Filter by minimum fitness
        if (filters.minFitness !== undefined) {
            results = results.filter(g =>
                g.fitness.overallFitness >= filters.minFitness!
            );
        }

        // Sort by fitness (descending) by default
        const sortBy = filters.sortBy || 'fitness';
        const sortOrder = filters.sortOrder || 'desc';

        if (sortBy === 'fitness') {
            results.sort((a, b) => {
                const diff = a.fitness.overallFitness - b.fitness.overallFitness;
                return sortOrder === 'desc' ? -diff : diff;
            });
        } else if (sortBy === 'adoptions') {
            results.sort((a, b) => {
                const diff = a.fitness.adoptionCount - b.fitness.adoptionCount;
                return sortOrder === 'desc' ? -diff : diff;
            });
        } else if (sortBy === 'createdAt') {
            results.sort((a, b) => {
                const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                return sortOrder === 'desc' ? -diff : diff;
            });
        } else if (sortBy === 'updatedAt') {
            results.sort((a, b) => {
                const diff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                return sortOrder === 'desc' ? -diff : diff;
            });
        }

        // Apply limit
        const limit = filters.limit || 10;
        return results.slice(0, limit);
    }

    /**
     * Get all genes for a tenant
     */
    async listByTenant(tenantId: string, scope?: SharingScope): Promise<CognitiveGene[]> {
        let results = Array.from(this.genes.values())
            .filter(g => g.tenant.tenantId === tenantId);

        if (scope) {
            results = results.filter(g => g.tenant.scope === scope);
        }

        return results;
    }

    /**
     * Get gene lineage (ancestors)
     */
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

    /**
     * Record gene adoption
     */
    async recordAdoption(geneId: string, agentId: string, performance: number): Promise<void> {
        // Track adoption
        if (!this.adoptions.has(geneId)) {
            this.adoptions.set(geneId, []);
        }
        this.adoptions.get(geneId)!.push({ agentId, performance });

        // Update gene fitness
        const gene = this.genes.get(geneId);
        if (gene) {
            gene.fitness.adoptionCount++;

            const adoptions = this.adoptions.get(geneId)!;
            const avgPerformance = adoptions.reduce((sum, a) => sum + a.performance, 0) / adoptions.length;
            gene.fitness.adoptionPerformance = avgPerformance;

            // Update timestamp
            gene.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Get storage statistics
     */
    getStats(): {
        totalGenes: number;
        totalAdoptions: number;
    } {
        return {
            totalGenes: this.genes.size,
            totalAdoptions: Array.from(this.adoptions.values())
                .reduce((sum, adoptions) => sum + adoptions.length, 0),
        };
    }

    /**
     * Clear all data (useful for testing)
     */
    clear(): void {
        this.genes.clear();
        this.adoptions.clear();
    }
}
