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
