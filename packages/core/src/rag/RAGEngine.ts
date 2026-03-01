/**
 * RAG Engine — Retrieval-Augmented Generation
 *
 * Combines vector search with LLM generation for knowledge-grounded responses.
 *
 * Features:
 * - Vector store abstraction (Pinecone, Weaviate, Qdrant, etc.)
 * - Embedding generation
 * - Semantic search
 * - Context augmentation
 * - Hybrid search (vector + keyword)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-01
 */

import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { VectorStoreAdapter } from './VectorStoreAdapter.js';

// ─── RAG Types ─────────────────────────────────────────────

export interface RAGDocument {
    id: string;
    content: string;
    metadata: Record<string, any>;
    embedding?: number[];
}

export interface RAGSearchResult {
    document: RAGDocument;
    score: number;
    relevance: number; // 0-1
}

export interface RAGContext {
    query: string;
    results: RAGSearchResult[];
    augmentedPrompt: string;
    totalTokens: number;
}

// ─── Configuration ─────────────────────────────────────────

export interface RAGConfig {
    enabled: boolean;

    vectorStore: VectorStoreAdapter;

    embeddings: {
        model: string;  // e.g., 'text-embedding-3-small'
        dimensions: number; // e.g., 1536
    };

    search: {
        topK: number;           // Default: 5
        minScore: number;       // Default: 0.7
        hybridSearch: boolean;  // Use both vector + keyword
    };

    context: {
        maxTokens: number;      // Max tokens for RAG context
        includeMetadata: boolean;
    };
}

// ─── RAG Engine ────────────────────────────────────────────

export class RAGEngine {
    private config: RAGConfig;

    constructor(
        private llm: LLMAdapter,
        config: RAGConfig
    ) {
        this.config = config;
    }

    /**
     * Retrieve relevant documents for a query
     */
    async retrieve(query: string): Promise<RAGSearchResult[]> {
        // Generate embedding for query
        const queryEmbedding = await this.generateEmbedding(query);

        // Search vector store
        const results = await this.config.vectorStore.search(queryEmbedding, {
            topK: this.config.search.topK,
            minScore: this.config.search.minScore,
        });

        // Filter by minimum score
        return results.filter(r => r.score >= this.config.search.minScore);
    }

    /**
     * Augment prompt with retrieved context
     */
    async augment(query: string, basePrompt: string): Promise<RAGContext> {
        // Retrieve relevant documents
        const results = await this.retrieve(query);

        // Build augmented prompt
        const augmentedPrompt = this.buildAugmentedPrompt(basePrompt, results);

        // Estimate tokens
        const totalTokens = this.estimateTokens(augmentedPrompt);

        return {
            query,
            results,
            augmentedPrompt,
            totalTokens,
        };
    }

    /**
     * Complete RAG pipeline: retrieve + augment + generate
     */
    async generate(query: string, basePrompt: string): Promise<string> {
        // Augment prompt with context
        const context = await this.augment(query, basePrompt);

        // Generate response with LLM
        const response = await this.llm.chat([
            { role: 'system', content: context.augmentedPrompt },
            { role: 'user', content: query },
        ]);

        return response.content;
    }

    /**
     * Index a document in the vector store
     */
    async indexDocument(document: RAGDocument): Promise<void> {
        // Generate embedding if not provided
        if (!document.embedding) {
            document.embedding = await this.generateEmbedding(document.content);
        }

        // Store in vector store
        await this.config.vectorStore.upsert([document]);
    }

    /**
     * Index multiple documents in batch
     */
    async indexDocuments(documents: RAGDocument[]): Promise<void> {
        // Generate embeddings for documents without them
        const documentsWithEmbeddings = await Promise.all(
            documents.map(async doc => {
                if (!doc.embedding) {
                    doc.embedding = await this.generateEmbedding(doc.content);
                }
                return doc;
            })
        );

        // Batch upsert
        await this.config.vectorStore.upsert(documentsWithEmbeddings);
    }

    /**
     * Delete document from index
     */
    async deleteDocument(documentId: string): Promise<void> {
        await this.config.vectorStore.delete([documentId]);
    }

    // ─── Private Methods ───────────────────────────────────────

    private async generateEmbedding(text: string): Promise<number[]> {
        // This would use OpenAI, Anthropic, or other embedding API
        // For now, we'll use a placeholder that delegates to the adapter
        return await this.config.vectorStore.generateEmbedding(text);
    }

    private buildAugmentedPrompt(basePrompt: string, results: RAGSearchResult[]): string {
        if (results.length === 0) {
            return basePrompt;
        }

        const contextSection = this.formatRetrievedContext(results);

        return `${basePrompt}

# Retrieved Knowledge Context

${contextSection}

IMPORTANT: Use the above context to inform your response. If the context contains relevant information, incorporate it. If not, rely on your general knowledge.`;
    }

    private formatRetrievedContext(results: RAGSearchResult[]): string {
        return results
            .map((result, index) => {
                const metadata = this.config.context.includeMetadata
                    ? `\nMetadata: ${JSON.stringify(result.document.metadata)}`
                    : '';

                return `
## Document ${index + 1} (Relevance: ${(result.relevance * 100).toFixed(0)}%)

${result.document.content}${metadata}
`;
            })
            .join('\n---\n');
    }

    private estimateTokens(text: string): number {
        // Rough estimation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }
}
