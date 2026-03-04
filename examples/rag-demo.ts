/**
 * RAG Engine Demo
 *
 * Demonstrates:
 * - Document indexing with vector embeddings
 * - Semantic search and retrieval
 * - Context augmentation
 * - Full RAG pipeline with LLM
 * - Metrics tracking
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-01
 */

import { RAGEngine, InMemoryVectorStore, MetricsCollector } from '../packages/core/src/index.js';
import type { LLMAdapter, Message, ChatResponse } from '../packages/core/src/interfaces/LLMAdapter.js';
import type { RAGDocument } from '../packages/core/src/rag/RAGEngine.js';

// ─── Mock LLM Adapter ──────────────────────────────────────

class MockLLMAdapter implements LLMAdapter {
    readonly name = 'mock-llm';
    readonly model = 'mock-model';

    async chat(messages: Message[]): Promise<ChatResponse> {
        const lastMessage = messages[messages.length - 1];
        const systemMessage = messages.find(m => m.role === 'system');

        // Check if context was provided
        const hasContext = systemMessage?.content.includes('Retrieved Knowledge Context');

        let response = '';
        if (hasContext) {
            response = `Based on the provided documentation, ${lastMessage.content.toLowerCase().replace('?', '')}.`;
        } else {
            response = `I don't have specific information about that, but generally speaking...`;
        }

        return {
            content: response,
            usage: {
                inputTokens: messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0),
                outputTokens: Math.ceil(response.length / 4),
            },
        };
    }
}

// ─── Main Demo ─────────────────────────────────────────────

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  RAG ENGINE DEMO                                          ║');
    console.log('║  Retrieval-Augmented Generation with Observability       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // ─── 1. Setup ──────────────────────────────────────────────
    console.log('📋 Setting up RAG Engine with observability...\n');

    const metricsCollector = new MetricsCollector({
        enabled: true,
        enableAuditLogs: true,
    });

    const vectorStore = new InMemoryVectorStore();
    const llm = new MockLLMAdapter();

    const ragEngine = new RAGEngine(
        llm,
        {
            enabled: true,
            vectorStore,
            embeddings: {
                model: 'text-embedding-3-small',
                dimensions: 128,
            },
            search: {
                topK: 3,
                minScore: 0.5,
                hybridSearch: false,
            },
            context: {
                maxTokens: 1000,
                includeMetadata: true,
            },
        },
        metricsCollector
    );

    // ─── 2. Index Documents ────────────────────────────────────
    console.log('📚 Indexing knowledge base documents...\n');

    const documents: RAGDocument[] = [
        {
            id: 'doc-1',
            content: 'PGA (Progressive Genomic Algorithms) is a self-evolving prompt system that uses genetic algorithms to optimize AI agent prompts through continuous evolution and learning.',
            metadata: { category: 'overview', topic: 'pga-basics' },
        },
        {
            id: 'doc-2',
            content: 'Layered Memory in PGA provides a three-tier architecture: short-term (recent messages), medium-term (summarized context), and long-term (semantic facts). This achieves 85-95% token reduction.',
            metadata: { category: 'features', topic: 'layered-memory' },
        },
        {
            id: 'doc-3',
            content: 'RAG Engine combines vector search with LLM generation for knowledge-grounded responses. It uses semantic embeddings to retrieve relevant documents and augment prompts.',
            metadata: { category: 'features', topic: 'rag-engine' },
        },
        {
            id: 'doc-4',
            content: 'The Reasoning Engine in PGA supports multiple strategies: Chain of Thought, Self-Consistency, Tree of Thoughts, and Analogical Reasoning for complex problem solving.',
            metadata: { category: 'features', topic: 'reasoning-engine' },
        },
        {
            id: 'doc-5',
            content: 'PGA uses PostgreSQL for persistent storage of genomes, user DNA, interactions, mutations, and semantic facts. All data includes proper indexing for performance.',
            metadata: { category: 'architecture', topic: 'storage' },
        },
        {
            id: 'doc-6',
            content: 'MetricsCollector in PGA tracks performance metrics, cost metrics, health status, and audit logs. It provides automatic alerting when thresholds are exceeded.',
            metadata: { category: 'features', topic: 'observability' },
        },
    ];

    await ragEngine.indexDocuments(documents);
    console.log(`✅ Indexed ${documents.length} documents\n`);

    // ─── 3. Semantic Search Demo ───────────────────────────────
    console.log('🔍 SEMANTIC SEARCH DEMO:\n');
    console.log('─'.repeat(80));

    const queries = [
        'How does memory work in PGA?',
        'Tell me about database storage',
        'What metrics are tracked?',
    ];

    for (const query of queries) {
        console.log(`\nQuery: "${query}"`);

        const results = await ragEngine.retrieve(query);

        console.log(`Found ${results.length} relevant documents:`);
        for (const result of results) {
            console.log(`  - ${result.document.metadata.topic} (relevance: ${(result.relevance * 100).toFixed(0)}%)`);
            console.log(`    "${result.document.content.substring(0, 80)}..."`);
        }
    }

    console.log('\n' + '─'.repeat(80));

    // ─── 4. Context Augmentation Demo ──────────────────────────
    console.log('\n📝 CONTEXT AUGMENTATION DEMO:\n');
    console.log('─'.repeat(80));

    const testQuery = 'How does Layered Memory achieve token reduction?';
    console.log(`\nQuery: "${testQuery}"\n`);

    const basePrompt = 'You are a helpful AI assistant that answers questions about PGA.';
    const context = await ragEngine.augment(testQuery, basePrompt);

    console.log('Augmented Prompt Preview:');
    console.log(context.augmentedPrompt.substring(0, 300) + '...\n');
    console.log(`Retrieved Documents: ${context.results.length}`);
    console.log(`Total Tokens: ${context.totalTokens}`);

    console.log('\n' + '─'.repeat(80));

    // ─── 5. Full RAG Pipeline Demo ─────────────────────────────
    console.log('\n🤖 FULL RAG PIPELINE DEMO:\n');
    console.log('─'.repeat(80));

    const ragQuestions = [
        'What is PGA?',
        'How does Layered Memory reduce tokens?',
        'What database does PGA use?',
    ];

    for (const question of ragQuestions) {
        console.log(`\n❓ Question: "${question}"`);

        const answer = await ragEngine.generate(
            question,
            'You are a knowledgeable assistant about PGA (Progressive Genomic Algorithms).'
        );

        console.log(`✅ Answer: ${answer}`);
    }

    console.log('\n' + '─'.repeat(80));

    // ─── 6. Display Metrics ────────────────────────────────────
    console.log('\n📊 METRICS & OBSERVABILITY:\n');
    console.log('─'.repeat(80));

    const auditLogs = metricsCollector.getAuditLogs();

    console.log(`\nTotal Operations Logged: ${auditLogs.length}\n`);

    // Group by operation
    const operations: Record<string, any[]> = {};
    for (const log of auditLogs) {
        const key = log.operation;
        if (!operations[key]) operations[key] = [];
        operations[key].push(log);
    }

    for (const [operation, logs] of Object.entries(operations)) {
        const avgDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length;
        const successCount = logs.filter(l => l.level === 'info').length;
        const errorCount = logs.filter(l => l.level === 'error').length;

        console.log(`📈 ${operation}:`);
        console.log(`   Calls: ${logs.length}`);
        console.log(`   Success: ${successCount} | Errors: ${errorCount}`);
        console.log(`   Avg Duration: ${avgDuration.toFixed(2)}ms`);

        if (logs[0].metadata) {
            const metadata = logs[0].metadata as Record<string, any>;
            if (metadata.documentsIndexed) {
                console.log(`   Documents Indexed: ${metadata.documentsIndexed}`);
            }
            if (metadata.resultsFound !== undefined) {
                const avgResults = logs.reduce((sum, l) => sum + ((l.metadata as any).resultsFound || 0), 0) / logs.length;
                console.log(`   Avg Results Found: ${avgResults.toFixed(1)}`);
            }
        }
        console.log('');
    }

    // ─── 7. Vector Store Stats ─────────────────────────────────
    console.log('─'.repeat(80));
    console.log('\n💾 VECTOR STORE STATISTICS:\n');

    const stats = await vectorStore.getStats();
    console.log(`Total Documents: ${stats.totalDocuments}`);
    console.log(`Embedding Dimensions: ${stats.dimensions}`);
    console.log(`Index Size: ${(stats.indexSize / 1024).toFixed(2)} KB`);

    // ─── 8. Summary ────────────────────────────────────────────
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ RAG ENGINE DEMO COMPLETED                             ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Demonstrated:                                            ║');
    console.log('║  ✓ Document indexing with vector embeddings              ║');
    console.log('║  ✓ Semantic search and retrieval                         ║');
    console.log('║  ✓ Context augmentation for prompts                      ║');
    console.log('║  ✓ Full RAG pipeline with LLM generation                 ║');
    console.log('║  ✓ Metrics tracking and audit logging                    ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Next: Create evaluation suite for RAG KPIs              ║');
    console.log('║  KPIs to measure:                                         ║');
    console.log('║  - Retrieval Precision & Recall                           ║');
    console.log('║  - Answer Quality (with vs without RAG)                  ║');
    console.log('║  - Latency Impact                                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
