/**
 * Gene Bank Unit Tests
 *
 * Comprehensive test suite for the Gene Bank system
 *
 * @version 0.4.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    GeneBank,
    CognitiveGene,
    GeneStorageAdapter,
    GeneSearchFilters,
    createGeneId,
    meetsMinimumFitness,
    calculateFitnessDelta,
} from '../index';

// ============================================================================
// MOCK STORAGE ADAPTER
// ============================================================================

class MockGeneStorage implements GeneStorageAdapter {
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

    reset() {
        this.genes.clear();
        this.adoptions.clear();
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createMockGene(overrides?: Partial<CognitiveGene>): CognitiveGene {
    const tenantId = overrides?.tenant?.tenantId || 'tenant_test';
    const type = overrides?.type || 'error-recovery-pattern';

    return {
        id: createGeneId(tenantId, type),
        version: '1.0.0',
        name: 'Test Gene',
        description: 'A test gene for unit testing',
        type,
        domain: 'testing',
        fitness: {
            overallFitness: 0.85,
            taskSuccessRate: 0.87,
            userSatisfaction: 0.88,
            tokenEfficiency: 0.82,
            responseQuality: 0.89,
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
            instruction: 'Test instruction',
            examples: [],
            requiredCapabilities: [],
            applicableContexts: [],
            contraindications: [],
            metadata: {},
        },
        tenant: {
            tenantId,
            createdBy: 'agent_test',
            scope: 'tenant',
            verified: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['test'],
        ...overrides,
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe('GeneBank', () => {
    let storage: MockGeneStorage;
    let geneBank: GeneBank;

    beforeEach(() => {
        storage = new MockGeneStorage();
        geneBank = new GeneBank(storage, {
            tenantId: 'tenant_test',
            agentId: 'agent_test',
            minFitnessThreshold: 0.7,
            maxGenesPerAgent: 3,
            enableTHK: true,
        });
    });

    describe('storeGene', () => {
        it('should store a valid gene', async () => {
            const gene = createMockGene();

            await geneBank.storeGene(gene);

            const retrieved = await geneBank.getGene(gene.id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(gene.id);
        });

        it('should reject gene below fitness threshold', async () => {
            const gene = createMockGene({
                fitness: {
                    overallFitness: 0.5, // Below 0.7 threshold
                    taskSuccessRate: 0.5,
                    tokenEfficiency: 0,
                    responseQuality: 0.5,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });

            await expect(geneBank.storeGene(gene)).rejects.toThrow('below threshold');
        });

        it('should reject gene from different tenant', async () => {
            const gene = createMockGene({
                tenant: {
                    tenantId: 'different_tenant',
                    createdBy: 'agent_other',
                    scope: 'tenant',
                    verified: false,
                },
            });

            await expect(geneBank.storeGene(gene)).rejects.toThrow('different tenant');
        });

        it('should evict lowest fitness gene when capacity reached', async () => {
            // Store 3 genes (max capacity)
            const gene1 = createMockGene({
                fitness: {
                    overallFitness: 0.75,
                    taskSuccessRate: 0.75,
                    tokenEfficiency: 0,
                    responseQuality: 0.75,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });

            const gene2 = createMockGene({
                fitness: {
                    overallFitness: 0.85,
                    taskSuccessRate: 0.85,
                    tokenEfficiency: 0,
                    responseQuality: 0.85,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });

            const gene3 = createMockGene({
                fitness: {
                    overallFitness: 0.80,
                    taskSuccessRate: 0.80,
                    tokenEfficiency: 0,
                    responseQuality: 0.80,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });

            await geneBank.storeGene(gene1);
            await geneBank.storeGene(gene2);
            await geneBank.storeGene(gene3);

            // Store 4th gene (should evict gene1 with lowest fitness)
            const gene4 = createMockGene({
                fitness: {
                    overallFitness: 0.90,
                    taskSuccessRate: 0.90,
                    tokenEfficiency: 0,
                    responseQuality: 0.90,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });

            await geneBank.storeGene(gene4);

            const gene1Retrieved = await geneBank.getGene(gene1.id);
            const gene4Retrieved = await geneBank.getGene(gene4.id);

            expect(gene1Retrieved).toBeNull(); // Evicted
            expect(gene4Retrieved).toBeDefined(); // Stored
        });
    });

    describe('searchGenes', () => {
        beforeEach(async () => {
            // Populate with test genes
            await geneBank.storeGene(createMockGene({
                type: 'error-recovery-pattern',
                domain: 'customer-support',
                fitness: {
                    overallFitness: 0.9,
                    taskSuccessRate: 0.9,
                    tokenEfficiency: 0,
                    responseQuality: 0.9,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            }));

            await geneBank.storeGene(createMockGene({
                type: 'reasoning-pattern',
                domain: 'coding',
                fitness: {
                    overallFitness: 0.85,
                    taskSuccessRate: 0.85,
                    tokenEfficiency: 0,
                    responseQuality: 0.85,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            }));
        });

        it('should search by type', async () => {
            const results = await geneBank.searchGenes({
                type: ['error-recovery-pattern'],
            });

            expect(results.length).toBeGreaterThan(0);
            expect(results.every(g => g.type === 'error-recovery-pattern')).toBe(true);
        });

        it('should search by domain', async () => {
            const results = await geneBank.searchGenes({
                domain: ['customer-support'],
            });

            expect(results.length).toBeGreaterThan(0);
            expect(results.every(g => g.domain === 'customer-support')).toBe(true);
        });

        it('should filter by minimum fitness', async () => {
            const results = await geneBank.searchGenes({
                minFitness: 0.88,
            });

            expect(results.length).toBeGreaterThan(0);
            expect(results.every(g => g.fitness.overallFitness >= 0.88)).toBe(true);
        });
    });

    describe('recordAdoption', () => {
        it('should track gene adoptions', async () => {
            const gene = createMockGene();
            await geneBank.storeGene(gene);

            await geneBank.recordAdoption(gene.id, 'agent_bob', 0.87);

            const retrieved = await geneBank.getGene(gene.id);
            expect(retrieved?.fitness.adoptionCount).toBe(1);
            expect(retrieved?.fitness.adoptionPerformance).toBe(0.87);
        });

        it('should calculate average adoption performance', async () => {
            const gene = createMockGene();
            await geneBank.storeGene(gene);

            await geneBank.recordAdoption(gene.id, 'agent_bob', 0.8);
            await geneBank.recordAdoption(gene.id, 'agent_carol', 0.9);

            const retrieved = await geneBank.getGene(gene.id);
            expect(retrieved?.fitness.adoptionCount).toBe(2);
            expect(retrieved?.fitness.adoptionPerformance).toBeCloseTo(0.85, 2);
        });
    });

    describe('getStats', () => {
        it('should return gene bank statistics', async () => {
            await geneBank.storeGene(createMockGene());

            const stats = await geneBank.getStats();

            expect(stats.totalGenes).toBeGreaterThan(0);
            expect(stats.averageFitness).toBeGreaterThan(0);
        });
    });
});

describe('Helper Functions', () => {
    describe('createGeneId', () => {
        it('should create unique gene IDs', () => {
            const id1 = createGeneId('tenant1', 'error-recovery-pattern');
            const id2 = createGeneId('tenant1', 'error-recovery-pattern');

            expect(id1).not.toBe(id2);
            expect(id1).toContain('gene_tenant1_error-recovery-pattern');
        });
    });

    describe('meetsMinimumFitness', () => {
        it('should validate fitness threshold', () => {
            const highFitnessGene = createMockGene({
                fitness: {
                    overallFitness: 0.8,
                    taskSuccessRate: 0.8,
                    tokenEfficiency: 0,
                    responseQuality: 0.8,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });

            const lowFitnessGene = createMockGene({
                fitness: {
                    overallFitness: 0.5,
                    taskSuccessRate: 0.5,
                    tokenEfficiency: 0,
                    responseQuality: 0.5,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });

            expect(meetsMinimumFitness(highFitnessGene, 0.7)).toBe(true);
            expect(meetsMinimumFitness(lowFitnessGene, 0.7)).toBe(false);
        });
    });

    describe('calculateFitnessDelta', () => {
        it('should calculate fitness improvement', () => {
            const parent = createMockGene({
                fitness: {
                    overallFitness: 0.7,
                    taskSuccessRate: 0.7,
                    tokenEfficiency: 0,
                    responseQuality: 0.7,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });

            const child = createMockGene({
                fitness: {
                    overallFitness: 0.9,
                    taskSuccessRate: 0.9,
                    tokenEfficiency: 0,
                    responseQuality: 0.9,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });

            const delta = calculateFitnessDelta(child, parent);
            expect(delta).toBeCloseTo(0.2, 1);
        });

        it('should return child fitness when no parent', () => {
            const child = createMockGene({
                fitness: {
                    overallFitness: 0.9,
                    taskSuccessRate: 0.9,
                    tokenEfficiency: 0,
                    responseQuality: 0.9,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });

            const delta = calculateFitnessDelta(child, null);
            expect(delta).toBe(0.9);
        });
    });
});
