/**
 * Reasoning Engine Demo
 *
 * Demonstrates:
 * - Multiple reasoning strategies (CoT, Self-Consistency, ToT, Reflection, Auto)
 * - Strategy comparison and selection
 * - Performance vs quality trade-offs
 * - Metrics tracking
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-01
 */

import { ReasoningEngine, MetricsCollector } from '../packages/core/src/index.js';
import type { LLMAdapter, Message, ChatResponse } from '../packages/core/src/interfaces/LLMAdapter.js';
import type { ReasoningStrategy } from '../packages/core/src/reasoning/ReasoningEngine.js';

// ─── Mock LLM Adapter ──────────────────────────────────────

class MockLLMAdapter implements LLMAdapter {
    readonly name = 'mock-llm';
    readonly model = 'mock-model';

    async chat(messages: Message[]): Promise<ChatResponse> {
        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        const userMessage = messages.find(m => m.role === 'user')?.content || '';

        // Simulate different responses based on reasoning strategy
        let response = '';

        if (systemMessage.includes('step by step')) {
            // Chain of Thought
            response = `Step 1: Understand the problem - We need to solve ${userMessage}
Step 2: Analyze the components - Break down into smaller parts
Step 3: Apply logic - Use appropriate reasoning method
Step 4: Verify result - Check if answer makes sense
Final Answer: Based on the step-by-step analysis, the answer is correct.`;
        } else if (systemMessage.includes('different approaches')) {
            // Tree of Thoughts
            response = `Approach 1: Direct calculation - Quick but may miss edge cases
Approach 2: Systematic analysis - Slower but more thorough
Approach 3: Heuristic method - Balanced approach

Evaluating approaches:
- Approach 1: Fast (✓), Accurate (-)
- Approach 2: Fast (-), Accurate (✓)
- Approach 3: Fast (✓), Accurate (✓)

Best approach: Approach 3 (heuristic method)
Final Answer: Using the heuristic method yields the most reliable result.`;
        } else if (systemMessage.includes('Critique')) {
            // Reflection
            response = `Reviewing the current answer, I notice it could be more precise.
The reasoning can be strengthened by considering additional factors.
Final Answer: An improved answer with better justification.`;
        } else {
            // Direct
            response = `The answer to your question is: Direct response without detailed reasoning.`;
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
    console.log('║  REASONING ENGINE DEMO                                    ║');
    console.log('║  Multi-Strategy Reasoning with Observability             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // ─── 1. Setup ──────────────────────────────────────────────
    console.log('📋 Setting up Reasoning Engine with observability...\n');

    const metricsCollector = new MetricsCollector({
        enabled: true,
        enableAuditLogs: true,
    });

    const llm = new MockLLMAdapter();

    const reasoningEngine = new ReasoningEngine(
        llm,
        {
            defaultStrategy: 'chain-of-thought',
            chainOfThought: {
                minSteps: 3,
                maxSteps: 10,
                showSteps: true,
            },
            selfConsistency: {
                numPaths: 3,
                votingMethod: 'majority',
            },
            treeOfThoughts: {
                maxDepth: 3,
                branchingFactor: 3,
            },
            reflection: {
                maxIterations: 3,
                improvementThreshold: 0.1,
            },
        },
        metricsCollector
    );

    // ─── 2. Test Question ──────────────────────────────────────
    const testQuestion = 'What is the best approach to solve complex optimization problems?';
    const testContext = 'You are an expert in algorithm design and optimization.';

    // ─── 3. Strategy Comparison ────────────────────────────────
    console.log('🧠 REASONING STRATEGY COMPARISON:\n');
    console.log('─'.repeat(80));

    const strategies: ReasoningStrategy[] = [
        'direct',
        'chain-of-thought',
        'self-consistency',
        'tree-of-thoughts',
        'reflection',
    ];

    const results = [];

    for (const strategy of strategies) {
        console.log(`\n📊 Testing: ${strategy.toUpperCase()}`);
        console.log('─'.repeat(40));

        const result = await reasoningEngine.reason(testQuestion, testContext, strategy);

        console.log(`Strategy: ${result.strategy}`);
        console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
        console.log(`Tokens Used: ${result.tokensUsed}`);
        console.log(`Duration: ${result.durationMs}ms`);
        console.log(`Reasoning Steps: ${result.reasoning.length}`);

        if (result.reasoning.length > 0) {
            console.log('\nReasoning Process:');
            result.reasoning.slice(0, 3).forEach((step, i) => {
                console.log(`  ${i + 1}. ${step.substring(0, 70)}...`);
            });
        }

        console.log(`\nAnswer Preview: ${result.answer.substring(0, 100)}...`);

        results.push(result);
    }

    console.log('\n' + '─'.repeat(80));

    // ─── 4. Strategy Performance Summary ───────────────────────
    console.log('\n📈 PERFORMANCE SUMMARY:\n');
    console.log('─'.repeat(80));

    console.log('\n┌─────────────────────┬────────────┬─────────┬──────────┬─────────┐');
    console.log('│ Strategy            │ Confidence │ Tokens  │ Duration │ Steps   │');
    console.log('├─────────────────────┼────────────┼─────────┼──────────┼─────────┤');

    for (const result of results) {
        const name = result.strategy.padEnd(19);
        const confidence = `${(result.confidence * 100).toFixed(0)}%`.padStart(10);
        const tokens = result.tokensUsed.toString().padStart(7);
        const duration = `${result.durationMs}ms`.padStart(8);
        const steps = result.reasoning.length.toString().padStart(7);

        console.log(`│ ${name} │ ${confidence} │ ${tokens} │ ${duration} │ ${steps} │`);
    }

    console.log('└─────────────────────┴────────────┴─────────┴──────────┴─────────┘');

    // ─── 5. Auto Strategy Selection Demo ──────────────────────
    console.log('\n\n🤖 AUTO STRATEGY SELECTION:\n');
    console.log('─'.repeat(80));

    const testQuestions = [
        {
            question: 'What is 2 + 2?',
            expectedStrategy: 'direct',
        },
        {
            question: 'How can we improve team collaboration?',
            expectedStrategy: 'chain-of-thought',
        },
        {
            question: 'Explain the philosophical implications of artificial consciousness.',
            expectedStrategy: 'reflection',
        },
    ];

    for (const test of testQuestions) {
        console.log(`\nQuestion: "${test.question}"`);
        console.log(`Expected: ${test.expectedStrategy}`);

        const result = await reasoningEngine.reason(test.question, testContext, 'auto');

        console.log(`Selected: ${result.strategy}`);
        console.log(`Match: ${result.strategy === test.expectedStrategy ? '✅' : '⚠️'}`);
    }

    console.log('\n' + '─'.repeat(80));

    // ─── 6. Trade-offs Analysis ────────────────────────────────
    console.log('\n\n⚖️ STRATEGY TRADE-OFFS:\n');
    console.log('─'.repeat(80));

    console.log(`
┌─────────────────────┬──────────────────────────────────────────────────┐
│ Strategy            │ Best For                                         │
├─────────────────────┼──────────────────────────────────────────────────┤
│ Direct              │ Simple questions, fast responses needed          │
│ Chain-of-Thought    │ Medium complexity, balanced quality/speed        │
│ Self-Consistency    │ High accuracy needed, verify correctness         │
│ Tree-of-Thoughts    │ Creative solutions, exploring alternatives       │
│ Reflection          │ Highest quality, self-improvement, complex tasks │
│ Auto                │ Unknown complexity, automatic optimization       │
└─────────────────────┴──────────────────────────────────────────────────┘

Quality:    Direct < CoT < ToT < Self-Consistency < Reflection
Speed:      Reflection < Self-Consistency < ToT < CoT < Direct
Tokens:     Reflection > Self-Consistency > ToT > CoT > Direct
`);

    // ─── 7. Display Metrics ────────────────────────────────────
    console.log('─'.repeat(80));
    console.log('\n📊 METRICS & OBSERVABILITY:\n');
    console.log('─'.repeat(80));

    const auditLogs = metricsCollector.getAuditLogs();

    console.log(`\nTotal Reasoning Operations: ${auditLogs.length}\n`);

    // Group by strategy
    const strategyStats: Record<string, any[]> = {};
    for (const log of auditLogs) {
        if (log.metadata && typeof log.metadata === 'object' && 'strategy' in log.metadata) {
            const strategy = (log.metadata as any).strategy;
            if (!strategyStats[strategy]) strategyStats[strategy] = [];
            strategyStats[strategy].push(log);
        }
    }

    for (const [strategy, logs] of Object.entries(strategyStats)) {
        const avgDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length;
        const avgTokens = logs.reduce((sum, l) => sum + ((l.metadata as any).tokensUsed || 0), 0) / logs.length;
        const avgConfidence = logs.reduce((sum, l) => sum + ((l.metadata as any).confidence || 0), 0) / logs.length;
        const avgSteps = logs.reduce((sum, l) => sum + ((l.metadata as any).reasoningSteps || 0), 0) / logs.length;

        console.log(`📈 ${strategy}:`);
        console.log(`   Calls: ${logs.length}`);
        console.log(`   Avg Duration: ${avgDuration.toFixed(2)}ms`);
        console.log(`   Avg Tokens: ${avgTokens.toFixed(0)}`);
        console.log(`   Avg Confidence: ${(avgConfidence * 100).toFixed(0)}%`);
        console.log(`   Avg Steps: ${avgSteps.toFixed(1)}`);
        console.log('');
    }

    // ─── 8. Summary ────────────────────────────────────────────
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ REASONING ENGINE DEMO COMPLETED                       ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Demonstrated:                                            ║');
    console.log('║  ✓ 5 reasoning strategies (Direct, CoT, SC, ToT, Reflect) ║');
    console.log('║  ✓ Strategy comparison and performance analysis          ║');
    console.log('║  ✓ Auto strategy selection based on complexity           ║');
    console.log('║  ✓ Quality vs speed trade-offs                           ║');
    console.log('║  ✓ Metrics tracking and audit logging                    ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Next: Create evaluation suite for Reasoning KPIs        ║');
    console.log('║  KPIs to measure:                                         ║');
    console.log('║  - Reasoning Quality (correctness)                        ║');
    console.log('║  - Answer Consistency (self-consistency voting)           ║');
    console.log('║  - Performance vs Complexity                              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
