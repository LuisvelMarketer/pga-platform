/**
 * InMemoryStorageAdapter — Full StorageAdapter implementation using in-memory Maps
 *
 * Zero-config storage for PGA.wrap() and testing.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { Genome, UserDNA, MutationLog, GeneRegistryEntry } from '../types/index.js';
import type { SemanticFact } from '../memory/LayeredMemory.js';

export class InMemoryStorageAdapter implements StorageAdapter {
    private genomes = new Map<string, Genome>();
    private dna = new Map<string, UserDNA>();
    private mutations: MutationLog[] = [];
    private interactions: Array<Record<string, unknown>> = [];
    private feedbackRecords: Array<Record<string, unknown>> = [];
    private facts = new Map<string, SemanticFact>();
    private factIndex = new Map<string, string[]>(); // userId:genomeId -> factIds
    private geneRegistry: GeneRegistryEntry[] = [];

    async initialize(): Promise<void> {
        // No-op for in-memory storage
    }

    // ─── Genome Operations ──────────────────────────────────

    async saveGenome(genome: Genome): Promise<void> {
        this.genomes.set(genome.id, structuredClone(genome));
    }

    async loadGenome(genomeId: string): Promise<Genome | null> {
        const genome = this.genomes.get(genomeId);
        return genome ? structuredClone(genome) : null;
    }

    async deleteGenome(genomeId: string): Promise<void> {
        this.genomes.delete(genomeId);
    }

    async listGenomes(): Promise<Genome[]> {
        return Array.from(this.genomes.values()).map(g => structuredClone(g));
    }

    // ─── User DNA ───────────────────────────────────────────

    async saveDNA(userId: string, genomeId: string, dna: UserDNA): Promise<void> {
        this.dna.set(`${userId}:${genomeId}`, structuredClone(dna));
    }

    async loadDNA(userId: string, genomeId: string): Promise<UserDNA | null> {
        const dna = this.dna.get(`${userId}:${genomeId}`);
        return dna ? structuredClone(dna) : null;
    }

    // ─── Mutations ──────────────────────────────────────────

    async logMutation(mutation: MutationLog): Promise<void> {
        this.mutations.push(structuredClone(mutation));
    }

    async getMutationHistory(genomeId: string, limit = 100): Promise<MutationLog[]> {
        return this.mutations
            .filter(m => m.genomeId === genomeId)
            .slice(-limit);
    }

    async getGeneMutationHistory(genomeId: string, gene: string, limit = 50): Promise<MutationLog[]> {
        return this.mutations
            .filter(m => m.genomeId === genomeId && m.gene === gene)
            .slice(-limit);
    }

    // ─── Interactions ───────────────────────────────────────

    async recordInteraction(interaction: {
        genomeId: string;
        userId: string;
        userMessage: string;
        assistantResponse: string;
        toolCalls: unknown[];
        score?: number;
        timestamp: Date;
    }): Promise<void> {
        this.interactions.push({ ...interaction });
    }

    async getRecentInteractions(genomeId: string, userId: string, limit = 20): Promise<unknown[]> {
        return this.interactions
            .filter(i => i.genomeId === genomeId && i.userId === userId)
            .slice(-limit);
    }

    // ─── Feedback ───────────────────────────────────────────

    async recordFeedback(feedback: {
        genomeId: string;
        userId: string;
        gene: string;
        sentiment: 'positive' | 'negative' | 'neutral';
        timestamp: Date;
    }): Promise<void> {
        this.feedbackRecords.push({ ...feedback });
    }

    // ─── Analytics ──────────────────────────────────────────

    async getAnalytics(genomeId: string): Promise<{
        totalMutations: number;
        totalInteractions: number;
        avgFitnessImprovement: number;
        userSatisfaction: number;
        topGenes: Array<{ gene: string; fitness: number }>;
    }> {
        const genomeMutations = this.mutations.filter(m => m.genomeId === genomeId);
        const genomeInteractions = this.interactions.filter(i => i.genomeId === genomeId);

        return {
            totalMutations: genomeMutations.length,
            totalInteractions: genomeInteractions.length,
            avgFitnessImprovement: genomeMutations.length > 0
                ? genomeMutations.reduce((sum, m) => sum + (m.fitnessDelta ?? 0), 0) / genomeMutations.length
                : 0,
            userSatisfaction: 0.7,
            topGenes: [],
        };
    }

    // ─── Semantic Facts (Layered Memory) ────────────────────

    async saveFact(fact: SemanticFact, userId: string, genomeId: string): Promise<void> {
        this.facts.set(fact.id, structuredClone(fact));
        const key = `${userId}:${genomeId}`;
        const ids = this.factIndex.get(key) ?? [];
        if (!ids.includes(fact.id)) {
            ids.push(fact.id);
        }
        this.factIndex.set(key, ids);
    }

    async getFacts(userId: string, genomeId: string, includeExpired = false): Promise<SemanticFact[]> {
        const key = `${userId}:${genomeId}`;
        const ids = this.factIndex.get(key) ?? [];
        const facts: SemanticFact[] = [];
        for (const id of ids) {
            const fact = this.facts.get(id);
            if (fact) {
                if (includeExpired || !fact.expiry || fact.expiry > new Date()) {
                    facts.push(structuredClone(fact));
                }
            }
        }
        return facts;
    }

    async getFact(factId: string): Promise<SemanticFact | null> {
        const fact = this.facts.get(factId);
        return fact ? structuredClone(fact) : null;
    }

    async updateFact(factId: string, updates: Partial<SemanticFact>): Promise<void> {
        const existing = this.facts.get(factId);
        if (existing) {
            this.facts.set(factId, { ...existing, ...updates });
        }
    }

    async deleteFact(factId: string): Promise<void> {
        this.facts.delete(factId);
        for (const [key, ids] of this.factIndex.entries()) {
            const filtered = ids.filter(id => id !== factId);
            if (filtered.length !== ids.length) {
                this.factIndex.set(key, filtered);
            }
        }
    }

    async deleteUserFacts(userId: string, genomeId: string): Promise<void> {
        const key = `${userId}:${genomeId}`;
        const ids = this.factIndex.get(key) ?? [];
        for (const id of ids) {
            this.facts.delete(id);
        }
        this.factIndex.delete(key);
    }

    async cleanExpiredFacts(userId: string, genomeId: string): Promise<number> {
        const key = `${userId}:${genomeId}`;
        const ids = this.factIndex.get(key) ?? [];
        let cleaned = 0;
        const now = new Date();
        const remaining: string[] = [];

        for (const id of ids) {
            const fact = this.facts.get(id);
            if (fact?.expiry && fact.expiry <= now) {
                this.facts.delete(id);
                cleaned++;
            } else {
                remaining.push(id);
            }
        }

        this.factIndex.set(key, remaining);
        return cleaned;
    }

    // ─── Gene Registry (Cross-Genome Inheritance) ───────────

    async saveToGeneRegistry(entry: GeneRegistryEntry): Promise<void> {
        this.geneRegistry.push(structuredClone(entry));
    }

    async queryGeneRegistry(familyId: string, gene?: string, minFitness = 0): Promise<GeneRegistryEntry[]> {
        return this.geneRegistry.filter(e =>
            e.familyId === familyId &&
            (!gene || e.gene === gene) &&
            e.fitness >= minFitness,
        );
    }

    async getBestRegistryGene(familyId: string, gene: string): Promise<GeneRegistryEntry | null> {
        const entries = await this.queryGeneRegistry(familyId, gene);
        if (entries.length === 0) return null;
        return entries.sort((a, b) => b.fitness - a.fitness)[0];
    }
}
