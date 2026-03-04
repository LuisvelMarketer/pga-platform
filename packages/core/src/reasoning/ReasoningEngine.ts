/**
 * Reasoning Engine — Multi-Strategy Reasoning System
 *
 * Implements multiple reasoning strategies:
 * - Chain of Thought (CoT): Step-by-step reasoning
 * - Self-Consistency: Multiple paths with voting
 * - Tree of Thoughts: Explore multiple reasoning branches
 * - Reflection: Self-critique and improve
 * - Auto: Automatically select best strategy
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-01
 */

import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { MetricsCollector } from '../monitoring/MetricsCollector.js';

// ─── Reasoning Types ───────────────────────────────────────

export type ReasoningStrategy =
    | 'direct'              // No reasoning (fast)
    | 'chain-of-thought'    // Step-by-step (balanced)
    | 'self-consistency'    // Multiple paths + vote (accurate)
    | 'tree-of-thoughts'    // Explore branches (creative)
    | 'reflection'          // Self-improve (quality)
    | 'auto';               // Auto-select

export interface ReasoningResult {
    strategy: ReasoningStrategy;
    answer: string;
    reasoning: string[];
    confidence: number; // 0-1
    tokensUsed: number;
    durationMs: number;
}

// ─── Configuration ─────────────────────────────────────────

export interface ReasoningConfig {
    defaultStrategy: ReasoningStrategy;

    chainOfThought?: {
        minSteps: number;      // Default: 3
        maxSteps: number;      // Default: 10
        showSteps: boolean;    // Include steps in response
    };

    selfConsistency?: {
        numPaths: number;      // Default: 3
        votingMethod: 'majority' | 'weighted'; // Default: 'majority'
    };

    treeOfThoughts?: {
        maxDepth: number;      // Default: 3
        branchingFactor: number; // Default: 3
    };

    reflection?: {
        maxIterations: number; // Default: 3
        improvementThreshold: number; // Default: 0.1
    };

    auto?: {
        costThreshold: number; // Max cost willing to pay
        qualityTarget: number; // Target quality (0-1)
    };
}

// ─── Reasoning Engine ──────────────────────────────────────

export class ReasoningEngine {
    private config: ReasoningConfig;

    constructor(
        private llm: LLMAdapter,
        config?: Partial<ReasoningConfig>,
        private metricsCollector?: MetricsCollector
    ) {
        this.config = {
            defaultStrategy: config?.defaultStrategy || 'chain-of-thought',
            chainOfThought: {
                minSteps: 3,
                maxSteps: 10,
                showSteps: true,
                ...config?.chainOfThought,
            },
            selfConsistency: {
                numPaths: 3,
                votingMethod: 'majority',
                ...config?.selfConsistency,
            },
            treeOfThoughts: {
                maxDepth: 3,
                branchingFactor: 3,
                ...config?.treeOfThoughts,
            },
            reflection: {
                maxIterations: 3,
                improvementThreshold: 0.1,
                ...config?.reflection,
            },
            auto: {
                costThreshold: 0.01,
                qualityTarget: 0.8,
                ...config?.auto,
            },
        };
    }

    /**
     * Reason about a question using configured strategy
     */
    async reason(
        question: string,
        context: string,
        strategy?: ReasoningStrategy
    ): Promise<ReasoningResult> {
        const selectedStrategy = strategy || this.config.defaultStrategy;
        const startTime = Date.now();

        try {
            let result: ReasoningResult;

            switch (selectedStrategy) {
                case 'direct':
                    result = await this.directReasoning(question, context);
                    break;
                case 'chain-of-thought':
                    result = await this.chainOfThoughtReasoning(question, context);
                    break;
                case 'self-consistency':
                    result = await this.selfConsistencyReasoning(question, context);
                    break;
                case 'tree-of-thoughts':
                    result = await this.treeOfThoughtsReasoning(question, context);
                    break;
                case 'reflection':
                    result = await this.reflectionReasoning(question, context);
                    break;
                case 'auto':
                    result = await this.autoSelectStrategy(question, context);
                    break;
                default:
                    result = await this.chainOfThoughtReasoning(question, context);
            }

            result.durationMs = Date.now() - startTime;

            // Track metrics
            this.metricsCollector?.logAudit({
                level: 'info',
                component: 'ReasoningEngine',
                operation: 'reason',
                message: `Completed ${result.strategy} reasoning`,
                duration: result.durationMs,
                metadata: {
                    strategy: result.strategy,
                    questionLength: question.length,
                    contextLength: context.length,
                    confidence: result.confidence,
                    tokensUsed: result.tokensUsed,
                    reasoningSteps: result.reasoning.length,
                    answerLength: result.answer.length,
                },
            });

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;

            this.metricsCollector?.logAudit({
                level: 'error',
                component: 'ReasoningEngine',
                operation: 'reason',
                message: 'Failed to complete reasoning',
                duration,
                metadata: {
                    strategy: selectedStrategy,
                    questionLength: question.length,
                },
                error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                } : {
                    name: 'UnknownError',
                    message: String(error),
                },
            });

            throw error;
        }
    }

    // ─── Reasoning Strategies ──────────────────────────────────

    /**
     * Direct reasoning: No intermediate steps
     */
    private async directReasoning(question: string, context: string): Promise<ReasoningResult> {
        const prompt = `${context}\n\nQuestion: ${question}\n\nAnswer:`;

        const response = await this.llm.chat([
            { role: 'system', content: prompt },
            { role: 'user', content: question },
        ]);

        return {
            strategy: 'direct',
            answer: response.content,
            reasoning: [],
            confidence: 0.7,
            tokensUsed: this.estimateTokens(prompt + response.content),
            durationMs: 0,
        };
    }

    /**
     * Chain of Thought: Step-by-step reasoning
     */
    private async chainOfThoughtReasoning(question: string, context: string): Promise<ReasoningResult> {
        const prompt = `${context}

Question: ${question}

IMPORTANT: Think step by step before providing your final answer.

Format your response as:
Step 1: [First reasoning step]
Step 2: [Second reasoning step]
...
Final Answer: [Your answer]`;

        const response = await this.llm.chat([
            { role: 'system', content: prompt },
            { role: 'user', content: question },
        ]);

        // Parse reasoning steps
        const steps = this.extractReasoningSteps(response.content);
        const finalAnswer = this.extractFinalAnswer(response.content);

        return {
            strategy: 'chain-of-thought',
            answer: finalAnswer,
            reasoning: steps,
            confidence: 0.85,
            tokensUsed: this.estimateTokens(prompt + response.content),
            durationMs: 0,
        };
    }

    /**
     * Self-Consistency: Multiple reasoning paths with voting
     */
    private async selfConsistencyReasoning(question: string, context: string): Promise<ReasoningResult> {
        const numPaths = this.config.selfConsistency!.numPaths;
        const paths: ReasoningResult[] = [];

        // Generate multiple reasoning paths
        for (let i = 0; i < numPaths; i++) {
            const result = await this.chainOfThoughtReasoning(question, context);
            paths.push(result);
        }

        // Vote on answers
        const votedAnswer = this.voteOnAnswers(paths);
        const allSteps = paths.flatMap(p => p.reasoning);

        return {
            strategy: 'self-consistency',
            answer: votedAnswer,
            reasoning: allSteps,
            confidence: 0.9,
            tokensUsed: paths.reduce((sum, p) => sum + p.tokensUsed, 0),
            durationMs: 0,
        };
    }

    /**
     * Tree of Thoughts: Explore multiple reasoning branches
     */
    private async treeOfThoughtsReasoning(question: string, context: string): Promise<ReasoningResult> {
        const prompt = `${context}

Question: ${question}

Generate 3 different approaches to solve this problem:
Approach 1: [Description]
Approach 2: [Description]
Approach 3: [Description]

For each approach, evaluate its pros and cons, then select the best one.`;

        const response = await this.llm.chat([
            { role: 'system', content: prompt },
            { role: 'user', content: question },
        ]);

        const approaches = this.extractApproaches(response.content);

        return {
            strategy: 'tree-of-thoughts',
            answer: response.content,
            reasoning: approaches,
            confidence: 0.88,
            tokensUsed: this.estimateTokens(prompt + response.content),
            durationMs: 0,
        };
    }

    /**
     * Reflection: Self-critique and improve
     */
    private async reflectionReasoning(question: string, context: string): Promise<ReasoningResult> {
        let currentAnswer = '';
        let iterations = 0;
        const maxIterations = this.config.reflection!.maxIterations;
        const reasoning: string[] = [];

        // Initial answer
        const initial = await this.chainOfThoughtReasoning(question, context);
        currentAnswer = initial.answer;
        reasoning.push(`Initial answer: ${currentAnswer}`);

        // Iterate with self-critique
        for (let i = 0; i < maxIterations; i++) {
            const critiquePrompt = `${context}

Question: ${question}
Current Answer: ${currentAnswer}

Critique the above answer. What could be improved? Provide a better answer.`;

            const critique = await this.llm.chat([
                { role: 'system', content: critiquePrompt },
                { role: 'user', content: question },
            ]);

            const improved = this.extractFinalAnswer(critique.content);
            reasoning.push(`Iteration ${i + 1}: ${improved}`);

            // Check if improvement is significant
            if (this.isSimilar(currentAnswer, improved)) {
                break;
            }

            currentAnswer = improved;
            iterations++;
        }

        return {
            strategy: 'reflection',
            answer: currentAnswer,
            reasoning,
            confidence: 0.92,
            tokensUsed: this.estimateTokens(context + currentAnswer) * (iterations + 1),
            durationMs: 0,
        };
    }

    /**
     * Auto-select best strategy based on question complexity
     */
    private async autoSelectStrategy(question: string, context: string): Promise<ReasoningResult> {
        const complexity = this.analyzeQuestionComplexity(question);

        let selectedStrategy: ReasoningStrategy;

        if (complexity < 0.3) {
            selectedStrategy = 'direct';
        } else if (complexity < 0.6) {
            selectedStrategy = 'chain-of-thought';
        } else if (complexity < 0.8) {
            selectedStrategy = 'self-consistency';
        } else {
            selectedStrategy = 'reflection';
        }

        return await this.reason(question, context, selectedStrategy);
    }

    // ─── Helper Methods ────────────────────────────────────────

    private extractReasoningSteps(response: string): string[] {
        const steps: string[] = [];
        const lines = response.split('\n');

        for (const line of lines) {
            if (line.match(/^Step \d+:/i)) {
                steps.push(line);
            }
        }

        return steps;
    }

    private extractFinalAnswer(response: string): string {
        const match = response.match(/Final Answer:(.+?)(?:\n|$)/is);
        if (match) {
            return match[1].trim();
        }

        // Fallback: return last paragraph
        const paragraphs = response.split('\n\n');
        return paragraphs[paragraphs.length - 1].trim();
    }

    private extractApproaches(response: string): string[] {
        const approaches: string[] = [];
        const lines = response.split('\n');

        for (const line of lines) {
            if (line.match(/^Approach \d+:/i)) {
                approaches.push(line);
            }
        }

        return approaches;
    }

    private voteOnAnswers(paths: ReasoningResult[]): string {
        // Simple majority voting
        const answerCounts = new Map<string, number>();

        for (const path of paths) {
            const normalized = this.normalizeAnswer(path.answer);
            answerCounts.set(normalized, (answerCounts.get(normalized) || 0) + 1);
        }

        let maxCount = 0;
        let winner = '';

        for (const [answer, count] of answerCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                winner = answer;
            }
        }

        return winner;
    }

    private normalizeAnswer(answer: string): string {
        return answer.toLowerCase().trim();
    }

    private isSimilar(a: string, b: string): boolean {
        // Simple similarity check
        const normalized_a = this.normalizeAnswer(a);
        const normalized_b = this.normalizeAnswer(b);

        return normalized_a === normalized_b;
    }

    private analyzeQuestionComplexity(question: string): number {
        // Simple heuristic for question complexity (0-1)
        let complexity = 0;

        // Length factor
        complexity += Math.min(question.length / 500, 0.3);

        // Keyword complexity
        const complexKeywords = ['why', 'how', 'explain', 'analyze', 'compare', 'evaluate'];
        for (const keyword of complexKeywords) {
            if (question.toLowerCase().includes(keyword)) {
                complexity += 0.2;
            }
        }

        // Mathematical notation
        if (question.match(/\d+\s*[+\-*/]\s*\d+/)) {
            complexity += 0.1;
        }

        return Math.min(complexity, 1.0);
    }

    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }
}
