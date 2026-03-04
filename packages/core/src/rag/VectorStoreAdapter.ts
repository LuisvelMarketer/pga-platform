/**
 * Vector Store Adapter Interface
 *
 * Abstraction for vector databases (Pinecone, Weaviate, Qdrant, Chroma, etc.)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-01
 */

import type { RAGDocument, RAGSearchResult } from './RAGEngine.js';

// ─── Vector Store Interface ────────────────────────────────

export interface VectorStoreAdapter {
    /**
     * Initialize the vector store connection
     */
    initialize(): Promise<void>;

    /**
     * Search for similar vectors
     */
    search(
        queryEmbedding: number[],
        options: {
            topK: number;
            minScore?: number;
            filter?: Record<string, any>;
        }
    ): Promise<RAGSearchResult[]>;

    /**
     * Insert or update documents
     */
    upsert(documents: RAGDocument[]): Promise<void>;

    /**
     * Delete documents by IDs
     */
    delete(documentIds: string[]): Promise<void>;

    /**
     * Generate embedding for text
     * (Can delegate to external embedding service)
     */
    generateEmbedding(text: string): Promise<number[]>;

    /**
     * Get collection/index statistics
     */
    getStats(): Promise<{
        totalDocuments: number;
        dimensions: number;
        indexSize: number;
    }>;
}

// ─── In-Memory Vector Store (for testing) ──────────────────

export class InMemoryVectorStore implements VectorStoreAdapter {
    private documents: Map<string, RAGDocument> = new Map();
    private embeddingService?: (text: string) => Promise<number[]>;

    constructor(embeddingService?: (text: string) => Promise<number[]>) {
        this.embeddingService = embeddingService;
    }

    async initialize(): Promise<void> {
        // No-op for in-memory
    }

    async search(
        queryEmbedding: number[],
        options: { topK: number; minScore?: number; filter?: Record<string, any> }
    ): Promise<RAGSearchResult[]> {
        const results: RAGSearchResult[] = [];

        for (const doc of this.documents.values()) {
            if (!doc.embedding) continue;

            // Calculate cosine similarity
            const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);

            if (options.minScore && similarity < options.minScore) {
                continue;
            }

            // Apply metadata filters if provided
            if (options.filter && !this.matchesFilter(doc.metadata, options.filter)) {
                continue;
            }

            results.push({
                document: doc,
                score: similarity,
                relevance: similarity,
            });
        }

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        // Return top K
        return results.slice(0, options.topK);
    }

    async upsert(documents: RAGDocument[]): Promise<void> {
        for (const doc of documents) {
            this.documents.set(doc.id, doc);
        }
    }

    async delete(documentIds: string[]): Promise<void> {
        for (const id of documentIds) {
            this.documents.delete(id);
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        if (this.embeddingService) {
            return await this.embeddingService(text);
        }

        // Fallback: simple hash-based embedding (NOT for production)
        return this.simpleEmbedding(text);
    }

    async getStats(): Promise<{ totalDocuments: number; dimensions: number; indexSize: number }> {
        const firstDoc = Array.from(this.documents.values())[0];
        const dimensions = firstDoc?.embedding?.length || 0;

        return {
            totalDocuments: this.documents.size,
            dimensions,
            indexSize: this.documents.size * dimensions * 4, // Rough estimate in bytes
        };
    }

    // ─── Helper Methods ────────────────────────────────────────

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Vectors must have same dimensions');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    private matchesFilter(metadata: Record<string, any>, filter: Record<string, any>): boolean {
        for (const [key, value] of Object.entries(filter)) {
            if (metadata[key] !== value) {
                return false;
            }
        }
        return true;
    }

    private simpleEmbedding(text: string): number[] {
        // Improved keyword-based embedding for testing (NOT for production)
        // This simulates semantic similarity by extracting keywords
        const dim = 128;
        const embedding = new Array(dim).fill(0);

        // Extract keywords (simple tokenization)
        const keywords = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2); // Filter out short words

        // Create embedding based on keyword hashes
        for (const word of keywords) {
            let hash = 0;
            for (let i = 0; i < word.length; i++) {
                hash = ((hash << 5) - hash) + word.charCodeAt(i);
                hash = hash & hash; // Convert to 32-bit integer
            }
            const index = Math.abs(hash) % dim;
            embedding[index] += 1;
        }

        // Add character-level features for additional signal
        for (let i = 0; i < text.length && i < 100; i++) {
            const charCode = text.charCodeAt(i);
            embedding[(charCode + i) % dim] += 0.1;
        }

        // Normalize to unit vector
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return norm > 0 ? embedding.map(val => val / norm) : embedding;
    }
}
