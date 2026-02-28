/**
 * Multi-Model Router - Cost Optimization Engine
 *
 * Routes tasks to optimal models (Haiku/Sonnet/Opus) based on:
 * - Task complexity/difficulty
 * - Cost constraints
 * - Performance requirements
 * - Historical success rates
 *
 * Living OS v1.0 Must-Have: Autonomous cost optimization
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';

// ─── Model Definitions ──────────────────────────────────────

export interface ModelSpec {
    id: string;
    name: string;
    provider: 'anthropic' | 'openai' | 'google';
    tier: 'basic' | 'advanced' | 'expert';

    // Pricing (per 1M tokens)
    inputCostPer1M: number;
    outputCostPer1M: number;

    // Capabilities
    maxContextTokens: number;
    capabilities: {
        reasoning: number;       // 0-1
        creativity: number;      // 0-1
        speed: number;           // 0-1
        accuracy: number;        // 0-1
    };

    // Performance
    avgLatencyMs: number;
}

// ─── Task Classification ────────────────────────────────────

export interface TaskClassification {
    complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';
    risk: 'low' | 'medium' | 'high' | 'critical';
    requiresReasoning: boolean;
    requiresCreativity: boolean;
    requiresSpeed: boolean;
    estimatedTokens: number;
}

// ─── Routing Decision ───────────────────────────────────────

export interface RoutingDecision {
    selectedModel: string;
    reason: string;
    estimatedCost: number;
    confidence: number;
    alternatives: Array<{
        model: string;
        cost: number;
        score: number;
    }>;
}

// ─── Router Configuration ───────────────────────────────────

export interface ModelRouterConfig {
    // Cost constraints
    maxCostPerTask?: number;
    targetCostPerTask?: number;

    // Performance requirements
    maxLatencyMs?: number;
    minAccuracy?: number;

    // Routing strategy
    strategy?: 'cost-optimized' | 'performance-optimized' | 'balanced';

    // Fallback behavior
    fallbackToAdvanced?: boolean; // If basic model fails, try advanced

    // A/B testing
    enableExperimentation?: boolean;
    experimentationRate?: number; // 0-1, % of requests for testing
}

// ─── Model Router ───────────────────────────────────────────

export class ModelRouter {
    private static readonly MODELS: Record<string, ModelSpec> = {
        // Anthropic Models
        'claude-haiku-4.5': {
            id: 'claude-haiku-4.5',
            name: 'Claude Haiku 4.5',
            provider: 'anthropic',
            tier: 'basic',
            inputCostPer1M: 0.25,
            outputCostPer1M: 1.25,
            maxContextTokens: 200000,
            capabilities: {
                reasoning: 0.75,
                creativity: 0.70,
                speed: 0.95,
                accuracy: 0.80,
            },
            avgLatencyMs: 800,
        },
        'claude-sonnet-4.5': {
            id: 'claude-sonnet-4.5',
            name: 'Claude Sonnet 4.5',
            provider: 'anthropic',
            tier: 'advanced',
            inputCostPer1M: 3.0,
            outputCostPer1M: 15.0,
            maxContextTokens: 200000,
            capabilities: {
                reasoning: 0.95,
                creativity: 0.90,
                speed: 0.85,
                accuracy: 0.95,
            },
            avgLatencyMs: 1500,
        },
        'claude-opus-4.6': {
            id: 'claude-opus-4.6',
            name: 'Claude Opus 4.6',
            provider: 'anthropic',
            tier: 'expert',
            inputCostPer1M: 15.0,
            outputCostPer1M: 75.0,
            maxContextTokens: 200000,
            capabilities: {
                reasoning: 1.0,
                creativity: 0.95,
                speed: 0.70,
                accuracy: 0.99,
            },
            avgLatencyMs: 2500,
        },

        // OpenAI Models
        'gpt-4-turbo': {
            id: 'gpt-4-turbo',
            name: 'GPT-4 Turbo',
            provider: 'openai',
            tier: 'advanced',
            inputCostPer1M: 10.0,
            outputCostPer1M: 30.0,
            maxContextTokens: 128000,
            capabilities: {
                reasoning: 0.90,
                creativity: 0.85,
                speed: 0.90,
                accuracy: 0.90,
            },
            avgLatencyMs: 1800,
        },
        'gpt-3.5-turbo': {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            provider: 'openai',
            tier: 'basic',
            inputCostPer1M: 0.5,
            outputCostPer1M: 1.5,
            maxContextTokens: 16000,
            capabilities: {
                reasoning: 0.70,
                creativity: 0.65,
                speed: 0.95,
                accuracy: 0.75,
            },
            avgLatencyMs: 700,
        },
    };

    private config: Required<ModelRouterConfig>;
    private performanceHistory: Map<string, {
        successRate: number;
        avgCost: number;
        avgLatency: number;
        samples: number;
    }> = new Map();

    constructor(
        storage: StorageAdapter,
        config: ModelRouterConfig = {},
    ) {
        // Storage adapter ready for future persistence
        void storage;
        this.config = {
            maxCostPerTask: config.maxCostPerTask ?? 0.10,
            targetCostPerTask: config.targetCostPerTask ?? 0.05,
            maxLatencyMs: config.maxLatencyMs ?? 5000,
            minAccuracy: config.minAccuracy ?? 0.80,
            strategy: config.strategy ?? 'balanced',
            fallbackToAdvanced: config.fallbackToAdvanced ?? true,
            enableExperimentation: config.enableExperimentation ?? false,
            experimentationRate: config.experimentationRate ?? 0.05,
        };
    }

    /**
     * Route task to optimal model
     *
     * Core routing logic with cost optimization
     */
    async routeTask(task: {
        userMessage: string;
        context?: string;
        classification?: TaskClassification;
        genomeId?: string;
    }): Promise<RoutingDecision> {
        // Step 1: Classify task if not provided
        const classification = task.classification || this.classifyTask(task.userMessage, task.context);

        // Step 2: Get candidate models
        const candidates = this.getCandidateModels(classification);

        // Step 3: Score each candidate
        const scoredCandidates = candidates.map(model => ({
            model: model.id,
            score: this.scoreModel(model, classification),
            cost: this.estimateCost(model, classification.estimatedTokens),
        })).sort((a, b) => b.score - a.score);

        // Step 4: Apply strategy
        const selectedModel = this.applyStrategy(scoredCandidates, classification);

        // Step 5: Experimentation (A/B testing)
        const finalModel = this.applyExperimentation(selectedModel, scoredCandidates);

        return {
            selectedModel: finalModel,
            reason: this.getRoutingReason(finalModel, classification),
            estimatedCost: scoredCandidates.find(c => c.model === finalModel)?.cost || 0,
            confidence: scoredCandidates.find(c => c.model === finalModel)?.score || 0,
            alternatives: scoredCandidates.slice(0, 3),
        };
    }

    /**
     * Classify task complexity and requirements
     */
    private classifyTask(userMessage: string, context?: string): TaskClassification {
        const combined = `${userMessage} ${context || ''}`.toLowerCase();

        // Estimate tokens (rough: 4 chars per token)
        const estimatedTokens = (userMessage.length + (context?.length || 0)) / 4;

        // Detect complexity indicators
        const complexityIndicators = {
            trivial: /^(hi|hello|yes|no|thanks|ok)\b/i.test(userMessage),
            expert: /(implement|architecture|design|refactor|optimize|algorithm|system design)/i.test(combined),
            reasoning: /(why|how|explain|analyze|compare|evaluate)/i.test(combined),
            creative: /(create|design|brainstorm|imagine|innovate)/i.test(combined),
            speed: /(quick|fast|urgent|asap)/i.test(combined),
        };

        // Determine complexity
        let complexity: TaskClassification['complexity'] = 'moderate';
        if (complexityIndicators.trivial) complexity = 'trivial';
        else if (complexityIndicators.expert) complexity = 'expert';
        else if (combined.length < 100) complexity = 'simple';
        else if (combined.length > 500) complexity = 'complex';

        // Determine risk (based on keywords)
        let risk: TaskClassification['risk'] = 'medium';
        if (/(delete|remove|drop|destroy|format)/i.test(combined)) risk = 'critical';
        else if (/(security|auth|payment|credentials)/i.test(combined)) risk = 'high';
        else if (/(read|get|list|show)/i.test(combined)) risk = 'low';

        return {
            complexity,
            risk,
            requiresReasoning: complexityIndicators.reasoning,
            requiresCreativity: complexityIndicators.creative,
            requiresSpeed: complexityIndicators.speed,
            estimatedTokens: Math.ceil(estimatedTokens),
        };
    }

    /**
     * Get candidate models for task
     */
    private getCandidateModels(classification: TaskClassification): ModelSpec[] {
        const allModels = Object.values(ModelRouter.MODELS);

        // Filter by complexity requirements
        if (classification.complexity === 'trivial') {
            return allModels.filter(m => m.tier === 'basic');
        } else if (classification.complexity === 'expert') {
            return allModels.filter(m => m.tier === 'expert' || m.tier === 'advanced');
        }

        // Filter by risk
        if (classification.risk === 'critical') {
            return allModels.filter(m => m.tier === 'expert');
        }

        return allModels;
    }

    /**
     * Score model for task
     */
    private scoreModel(model: ModelSpec, classification: TaskClassification): number {
        let score = 0;

        // Base capability score
        if (classification.requiresReasoning) {
            score += model.capabilities.reasoning * 0.4;
        }
        if (classification.requiresCreativity) {
            score += model.capabilities.creativity * 0.3;
        }
        if (classification.requiresSpeed) {
            score += model.capabilities.speed * 0.2;
        }

        // Accuracy bonus
        score += model.capabilities.accuracy * 0.1;

        // Cost penalty (higher cost = lower score for cost-sensitive tasks)
        const costScore = 1 - (model.inputCostPer1M / 100); // Normalize
        score += costScore * 0.2;

        // Historical performance boost
        const history = this.performanceHistory.get(model.id);
        if (history && history.samples > 10) {
            score += history.successRate * 0.1;
        }

        return Math.min(1, score);
    }

    /**
     * Estimate cost for model and tokens
     */
    private estimateCost(model: ModelSpec, estimatedTokens: number): number {
        // Assume 2:1 output to input ratio
        const inputTokens = estimatedTokens;
        const outputTokens = estimatedTokens * 2;

        const inputCost = (inputTokens / 1_000_000) * model.inputCostPer1M;
        const outputCost = (outputTokens / 1_000_000) * model.outputCostPer1M;

        return inputCost + outputCost;
    }

    /**
     * Apply routing strategy
     */
    private applyStrategy(
        scoredCandidates: Array<{ model: string; score: number; cost: number }>,
        _classification: TaskClassification,
    ): string {
        // Classification may be used in future for strategy refinement
        void _classification;
        if (this.config.strategy === 'cost-optimized') {
            // Pick cheapest that meets minimum accuracy
            const viable = scoredCandidates.filter(c => c.score >= this.config.minAccuracy);
            return viable.sort((a, b) => a.cost - b.cost)[0]?.model || scoredCandidates[0].model;
        } else if (this.config.strategy === 'performance-optimized') {
            // Pick highest score regardless of cost
            return scoredCandidates[0].model;
        } else {
            // Balanced: Best value (score / cost ratio)
            const valued = scoredCandidates
                .map(c => ({
                    ...c,
                    value: c.cost > 0 ? c.score / c.cost : c.score,
                }))
                .sort((a, b) => b.value - a.value);

            return valued[0].model;
        }
    }

    /**
     * Apply experimentation (A/B testing)
     */
    private applyExperimentation(
        selectedModel: string,
        alternatives: Array<{ model: string; score: number; cost: number }>,
    ): string {
        if (!this.config.enableExperimentation) {
            return selectedModel;
        }

        // Random selection for experimentation
        if (Math.random() < this.config.experimentationRate) {
            // Pick random alternative
            const experimentModels = alternatives.filter(a => a.model !== selectedModel);
            if (experimentModels.length > 0) {
                const randomIndex = Math.floor(Math.random() * experimentModels.length);
                return experimentModels[randomIndex].model;
            }
        }

        return selectedModel;
    }

    /**
     * Get routing reason explanation
     */
    private getRoutingReason(modelId: string, classification: TaskClassification): string {
        const model = ModelRouter.MODELS[modelId];
        if (!model) return 'Model selected by default';

        const reasons: string[] = [];

        if (classification.complexity === 'trivial') {
            reasons.push('Trivial task → basic model sufficient');
        } else if (classification.complexity === 'expert') {
            reasons.push('Expert-level task → advanced model required');
        }

        if (classification.risk === 'critical') {
            reasons.push('Critical risk → highest accuracy model');
        }

        if (this.config.strategy === 'cost-optimized') {
            reasons.push('Cost-optimized strategy');
        } else if (this.config.strategy === 'performance-optimized') {
            reasons.push('Performance-optimized strategy');
        } else {
            reasons.push('Balanced cost-performance strategy');
        }

        return reasons.join(' | ');
    }

    /**
     * Record routing performance
     */
    recordPerformance(modelId: string, metrics: {
        success: boolean;
        cost: number;
        latency: number;
    }): void {
        const history = this.performanceHistory.get(modelId) || {
            successRate: 0.5,
            avgCost: 0,
            avgLatency: 0,
            samples: 0,
        };

        // Exponential moving average
        const alpha = 0.1;
        history.successRate = history.successRate * (1 - alpha) + (metrics.success ? 1 : 0) * alpha;
        history.avgCost = history.avgCost * (1 - alpha) + metrics.cost * alpha;
        history.avgLatency = history.avgLatency * (1 - alpha) + metrics.latency * alpha;
        history.samples += 1;

        this.performanceHistory.set(modelId, history);
    }

    /**
     * Get routing analytics
     */
    getRoutingAnalytics(): {
        modelPerformance: Record<string, {
            successRate: number;
            avgCost: number;
            avgLatency: number;
            samples: number;
        }>;
        totalRoutings: number;
        strategy: string;
    } {
        const modelPerformance: Record<string, any> = {};
        let totalSamples = 0;

        for (const [modelId, history] of this.performanceHistory.entries()) {
            modelPerformance[modelId] = { ...history };
            totalSamples += history.samples;
        }

        return {
            modelPerformance,
            totalRoutings: totalSamples,
            strategy: this.config.strategy,
        };
    }

    /**
     * Get available models
     */
    static getAvailableModels(): ModelSpec[] {
        return Object.values(ModelRouter.MODELS);
    }
}
