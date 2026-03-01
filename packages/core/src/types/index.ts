/**
 * PGA Core Types
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2025
 */

// ─── Genome Types ───────────────────────────────────────

export interface Genome {
    id: string;
    name: string;
    config: GenomeConfig;
    layers: {
        layer0: GeneAllele[]; // Immutable
        layer1: GeneAllele[]; // Slow mutation
        layer2: GeneAllele[]; // Fast mutation
    };
    // Living OS v1.0 - Lineage tracking
    familyId?: string;
    version?: number;
    lineage?: {
        parentVersion?: number;
        mutationOps?: string[];
        promotedBy?: string;
    };
    c0IntegrityHash?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface GenomeConfig {
    enableSandbox: boolean;
    mutationRate: 'slow' | 'balanced' | 'aggressive';
    epsilonExplore?: number;
    enableAutoML?: boolean;
    enableMultiModel?: boolean;
    evolutionGuardrails?: EvolutionGuardrails;

    // Advanced Features (v0.3.0)
    layeredMemory?: {
        enabled: boolean;
        shortTermMaxMessages?: number;
        mediumTermMaxMessages?: number;
        autoCompact?: boolean;
    };

    rag?: {
        enabled: boolean;
        topK?: number;
        minScore?: number;
        maxTokens?: number;
    };

    reasoning?: {
        enabled: boolean;
        defaultStrategy?: 'direct' | 'chain-of-thought' | 'self-consistency' | 'tree-of-thoughts' | 'reflection' | 'auto';
        showSteps?: boolean;
    };
}

/**
 * Evolution Guardrails - Multi-gate promotion system
 *
 * Living OS v1.0 Must-Have: Economic + Quality + Sandbox gates
 */
export interface EvolutionGuardrails {
    // Quality Gate
    minQualityScore: number;        // Min fitness to promote (0-1)

    // Sandbox Gate
    minSandboxScore: number;        // Min sandbox pass rate (0-1)

    // Economic Gate
    minCompressionScore: number;    // Min tokens per success threshold (0-1)
    maxCostPerTask: number;         // Max $ per successful task

    // Stability Gate
    minStabilityWindow: number;     // Min interactions before promotion
    maxRollbackRate: number;        // Max acceptable rollback rate (0-1)

    // Gate Logic
    gateMode: 'AND' | 'OR';        // How to combine gates (default: AND)
}

export interface GeneAllele {
    gene: string;
    variant: string;
    content: string;
    fitness: number;
    sampleCount?: number;
    parentVariant?: string;
    generation?: number;
    sandboxTested?: boolean;
    sandboxScore?: number;
    recentScores?: number[];
    status: 'active' | 'retired';
    createdAt: Date;
}

// ─── User DNA Types ─────────────────────────────────────

export interface UserDNA {
    userId: string;
    genomeId: string;
    traits: UserTraits;
    confidence: Record<string, number>;
    generation: number;
    lastEvolved: Date;
}

export interface UserTraits {
    // Communication Style
    communicationStyle: 'formal' | 'casual' | 'technical' | 'creative';
    verbosity: 'terse' | 'balanced' | 'detailed';
    tone: 'professional' | 'friendly' | 'direct';

    // Preferences
    preferredTools: string[];
    preferredFormats: string[];
    preferredLanguage: string;

    // Expertise
    domainExpertise: Record<string, number>;
    taskSuccessRates: Record<string, number>;

    // Patterns
    peakProductivityHours: number[];
    averageTurnsToSuccess: number;
    retryPatterns: Record<string, number>;

    // Evolution
    adaptationRate: number;
    stabilityScore: number;
}

// ─── Mutation Types ─────────────────────────────────────

export interface MutationLog {
    id?: string;
    genomeId: string;
    layer?: number;
    gene: string;
    variant: string;
    mutationType: 'targeted' | 'exploratory' | 'user_feedback' | 'rollback';
    parentVariant: string | null;
    triggerReason?: string;
    fitnessDelta?: number;
    sandboxScore?: number;
    deployed: boolean;
    details?: Record<string, unknown>;
    fitnessImprovement?: number;
    reason?: string;
    createdAt: Date;
    timestamp?: Date;
}

export interface MutationProposal {
    layer: 0 | 1 | 2;
    gene: string;
    reason: string;
    confidence: number;
    evidence: Record<string, unknown>;
    priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Promotion Gate Result - Multi-gate validation
 *
 * Living OS v1.0 Must-Have: Track each gate separately
 */
export interface PromotionGateResult {
    passed: boolean;
    gates: {
        quality: { passed: boolean; score: number; threshold: number };
        sandbox: { passed: boolean; score: number; threshold: number };
        economic: { passed: boolean; score: number; threshold: number };
        stability: { passed: boolean; score: number; threshold: number };
    };
    finalDecision: 'promote' | 'reject' | 'canary';
    reason: string;
}

// ─── Interaction Types ──────────────────────────────────

export interface Interaction {
    genomeId: string;
    userId: string;
    userMessage: string;
    assistantResponse: string;
    toolCalls: ToolCall[];
    score?: number;
    userSatisfied?: boolean;
    taskType?: string;
    timestamp: Date;
}

export interface ToolCall {
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
    success: boolean;
}

// ─── Fitness Types ──────────────────────────────────────

export interface FitnessMetrics {
    cognitiveCompression: number;  // Efficiency
    interventionRate: number;       // Autonomy
    executionPrecision: number;     // Reliability
    overall: number;                // Weighted average
}

/**
 * Economic Metrics - Cost optimization tracking
 *
 * Living OS v1.0 Must-Have: Track $ per value
 */
export interface EconomicMetrics {
    // Token efficiency
    tokensPerSuccess: number;       // Avg tokens used per successful task
    compressionScore: number;       // 0-1: Lower tokens = higher score

    // Cost tracking
    costPerTask: number;            // $ per task (based on model pricing)
    costPerSuccess: number;         // $ per successful task

    // Latency
    avgLatencyMs: number;           // Average response time
    p95LatencyMs: number;           // 95th percentile latency

    // North Star
    valuePerDollar: number;         // Successful outcomes / $
}

// ─── Selection Context ──────────────────────────────────

export interface SelectionContext {
    userId?: string;
    model?: string;
    taskType?: string;
    metadata?: Record<string, unknown>;
}

// ─── Gene Registry Types ────────────────────────────────

export interface GeneRegistryEntry {
    id: string;
    familyId: string;
    gene: string;
    variant: string;
    content: string;
    layer: Layer;
    fitness: number;
    sampleCount: number;
    successRate: number;
    metadata: {
        sourceGenomeId: string;
        sourceVersion: number;
        publishedBy: string;
        description?: string;
        tags?: string[];
    };
    createdAt: Date;
}

// ─── Export All ─────────────────────────────────────────

export type Layer = 0 | 1 | 2;
export type MutationRate = 'slow' | 'balanced' | 'aggressive';
export type Sentiment = 'positive' | 'negative' | 'neutral';
