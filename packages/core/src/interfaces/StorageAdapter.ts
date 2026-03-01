/**
 * Storage Adapter Interface
 *
 * Makes PGA work with any database (Postgres, MongoDB, Redis, SQLite, etc.)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2025
 */

import type { Genome, UserDNA, MutationLog } from '../types/index.js';
import type { SemanticFact } from '../memory/LayeredMemory.js';

/**
 * Storage Adapter Interface
 *
 * Implement this interface to use PGA with your preferred database.
 */
export interface StorageAdapter {
    /**
     * Initialize storage (create tables, indexes, etc.)
     */
    initialize(): Promise<void>;

    /**
     * Save genome state
     */
    saveGenome(genome: Genome): Promise<void>;

    /**
     * Load genome by ID
     */
    loadGenome(genomeId: string): Promise<Genome | null>;

    /**
     * Delete genome
     */
    deleteGenome(genomeId: string): Promise<void>;

    /**
     * List all genomes
     */
    listGenomes(): Promise<Genome[]>;

    /**
     * Save user DNA profile
     */
    saveDNA(userId: string, genomeId: string, dna: UserDNA): Promise<void>;

    /**
     * Load user DNA
     */
    loadDNA(userId: string, genomeId: string): Promise<UserDNA | null>;

    /**
     * Log mutation
     */
    logMutation(mutation: MutationLog): Promise<void>;

    /**
     * Get mutation history for a genome
     */
    getMutationHistory(genomeId: string, limit?: number): Promise<MutationLog[]>;

    /**
     * Get mutation history for a specific gene
     */
    getGeneMutationHistory(genomeId: string, gene: string, limit?: number): Promise<MutationLog[]>;

    /**
     * Record interaction
     */
    recordInteraction(interaction: {
        genomeId: string;
        userId: string;
        userMessage: string;
        assistantResponse: string;
        toolCalls: unknown[];
        score?: number;
        timestamp: Date;
    }): Promise<void>;

    /**
     * Get recent interactions
     */
    getRecentInteractions(genomeId: string, userId: string, limit?: number): Promise<unknown[]>;

    /**
     * Record feedback
     */
    recordFeedback(feedback: {
        genomeId: string;
        userId: string;
        gene: string;
        sentiment: 'positive' | 'negative' | 'neutral';
        timestamp: Date;
    }): Promise<void>;

    /**
     * Get analytics for genome
     */
    getAnalytics(genomeId: string): Promise<{
        totalMutations: number;
        totalInteractions: number;
        avgFitnessImprovement: number;
        userSatisfaction: number;
        topGenes: Array<{ gene: string; fitness: number }>;
    }>;

    // ─── Semantic Facts (Layered Memory) ────────────────────

    /**
     * Save semantic fact
     */
    saveFact(fact: SemanticFact, userId: string, genomeId: string): Promise<void>;

    /**
     * Get all facts for a user/genome
     */
    getFacts(userId: string, genomeId: string, includeExpired?: boolean): Promise<SemanticFact[]>;

    /**
     * Get specific fact by ID
     */
    getFact(factId: string): Promise<SemanticFact | null>;

    /**
     * Update existing fact
     */
    updateFact(factId: string, updates: Partial<SemanticFact>): Promise<void>;

    /**
     * Delete specific fact
     */
    deleteFact(factId: string): Promise<void>;

    /**
     * Delete all facts for a user/genome
     */
    deleteUserFacts(userId: string, genomeId: string): Promise<void>;

    /**
     * Clean expired facts (returns count of deleted facts)
     */
    cleanExpiredFacts(userId: string, genomeId: string): Promise<number>;
}
