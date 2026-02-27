/**
 * Genome Contract v2 - Living OS Foundation
 *
 * Transforms PGA from "prompt optimizer" to "Living OS for AI Agents"
 * with cryptographic integrity, cross-agent inheritance, and full auditability.
 *
 * @see RFC-001-GENOME-CONTRACT-V2.md for complete specification
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0
 */

// ─── Core Genome Structure ──────────────────────────────────

/**
 * Genome v2 - Complete organism with integrity protection
 *
 * Key innovations:
 * - Cryptographic C0 immutability (SHA-256 hash)
 * - Cross-agent inheritance via Gene Registry
 * - Multi-dimensional fitness tracking
 * - Full lineage and mutation audit trail
 */
export interface GenomeV2 {
    // ─── Core Identity ───────────────────────────────────────
    id: string; // Unique identifier (UUID v4)
    name: string; // Human-readable name
    familyId: string; // Gene family for inheritance
    version: number; // Monotonic version counter

    createdAt: Date;
    updatedAt: Date;

    // ─── Chromosomal Architecture ────────────────────────────
    chromosomes: {
        c0: Chromosome0; // Immutable core (protected)
        c1: Chromosome1; // Operative genes (validated)
        c2: Chromosome2; // Epigenetic (fast adaptation)
    };

    // ─── Integrity Protection ────────────────────────────────
    integrity: IntegrityMetadata;

    // ─── Lineage & Inheritance ───────────────────────────────
    lineage: LineageMetadata;

    // ─── Multi-Objective Fitness ─────────────────────────────
    fitness: FitnessVector;

    // ─── Operational Metadata ────────────────────────────────
    config: GenomeConfig;
    state: GenomeState;
    tags: string[];
}

// ─── Chromosomes ────────────────────────────────────────────

/**
 * Chromosome 0 (C0) - Immutable Core
 *
 * The "consciousness of species" - rules that NEVER mutate.
 * Protected by SHA-256 cryptographic hash verification.
 *
 * Any modification triggers immediate quarantine.
 */
export interface Chromosome0 {
    identity: {
        role: string; // "You are a helpful AI assistant"
        purpose: string; // Core mission statement
        constraints: string[]; // Ethical boundaries
    };

    security: {
        forbiddenTopics: string[]; // Never discuss
        accessControls: string[]; // Permission boundaries
        safetyRules: string[]; // Unbreakable rules
    };

    attribution: {
        creator: string; // Creator name
        copyright: string; // Copyright notice
        license: string; // License terms
    };

    // Metadata (NOT included in hash)
    metadata: {
        version: string; // C0 schema version
        createdAt: Date;
    };
}

/**
 * Chromosome 1 (C1) - Operative Genes
 *
 * Functional instructions defining agent behavior.
 * Mutations require sandbox validation before promotion.
 */
export interface Chromosome1 {
    operations: OperativeGene[];

    metadata: {
        lastMutated: Date;
        mutationCount: number;
        avgFitnessGain: number;
    };
}

/**
 * Operative Gene - Single functional unit in C1
 */
export interface OperativeGene {
    id: string;
    category: GeneCategory;
    content: string;

    fitness: FitnessVector;

    // Inheritance tracking
    origin: GeneOrigin;
    sourceGeneId?: string; // If inherited from registry

    // Usage statistics
    usageCount: number;
    lastUsed: Date;
    successRate: number;
}

export type GeneCategory =
    | 'tool-usage'
    | 'coding-patterns'
    | 'reasoning'
    | 'communication'
    | 'data-processing'
    | 'error-handling';

export type GeneOrigin = 'mutation' | 'inheritance' | 'initial' | 'manual';

/**
 * Chromosome 2 (C2) - Epigenetic Adaptations
 *
 * Rapid adaptations to user preferences and context.
 * Mutates frequently (hourly) with minimal validation.
 */
export interface Chromosome2 {
    userAdaptations: Map<string, UserEpigenome>;
    contextPatterns: ContextGene[];

    metadata: {
        lastMutated: Date;
        adaptationRate: number; // Mutations per hour
        totalUsers: number;
    };
}

/**
 * User Epigenome - Per-user adaptations
 */
export interface UserEpigenome {
    userId: string;

    preferences: UserPreferences;
    learned: LearnedPatterns;
    fitness: FitnessVector;

    // Metadata
    firstInteraction: Date;
    lastInteraction: Date;
    interactionCount: number;
}

export interface UserPreferences {
    communicationStyle: 'formal' | 'casual' | 'technical' | 'creative';
    verbosity: 'terse' | 'balanced' | 'detailed';
    tone: 'professional' | 'friendly' | 'direct';
}

export interface LearnedPatterns {
    preferredTools: string[];
    commonTopics: string[];
    peakHours: number[]; // Hours of day (0-23)
    domainExpertise: Map<string, number>; // domain → skill level (0-1)
}

/**
 * Context Gene - Learned contextual patterns
 */
export interface ContextGene {
    id: string;
    pattern: string; // Pattern description
    trigger: string; // When to activate
    adaptation: string; // How to adapt
    fitness: number;
    usageCount: number;
}

// ─── Integrity & Security ───────────────────────────────────

/**
 * Integrity Metadata - Cryptographic protection for C0
 */
export interface IntegrityMetadata {
    c0Hash: string; // SHA-256 of C0 content
    lastVerified: Date; // Last integrity check
    violations: number; // Count of integrity failures
    quarantined: boolean; // Safety lockdown state
    quarantineReason?: string; // Why quarantined
}

// ─── Lineage & Inheritance ──────────────────────────────────

/**
 * Lineage Metadata - Full ancestry tracking
 */
export interface LineageMetadata {
    parentVersion?: number; // Previous genome version
    originGenome?: string; // If forked from another genome
    inheritedGenes: InheritedGene[]; // Genes from registry
    mutations: MutationRecord[]; // Complete mutation history
}

/**
 * Inherited Gene - Cross-genome knowledge transfer
 */
export interface InheritedGene {
    geneId: string; // Gene Registry ID
    inheritedFrom: string; // Source genome family
    inheritedAt: Date;

    // Impact tracking
    fitnessBeforeInheritance: number;
    fitnessAfterInheritance: number;
    fitnessGain: number;

    // Status
    active: boolean;
    validated: boolean;
    validationResults?: ValidationResults;
}

/**
 * Mutation Record - Complete audit trail
 */
export interface MutationRecord {
    id: string;
    timestamp: Date;

    chromosome: 'c0' | 'c1' | 'c2';
    operation: MutationType;

    // What changed
    before: string; // JSON snapshot before
    after: string; // JSON snapshot after
    diff: string; // Human-readable diff

    // Why it changed
    trigger: MutationTrigger;
    reason: string;

    // Validation
    sandboxTested: boolean;
    testResults?: EvaluationResult;

    // Outcome
    promoted: boolean;
    rollbackAt?: Date; // If later reverted
    rollbackReason?: string;

    // Attribution
    proposer: 'system' | 'user' | 'inheritance';
}

export type MutationTrigger =
    | 'drift-detected'
    | 'feedback'
    | 'inheritance'
    | 'manual'
    | 'scheduled'
    | 'emergency-rollback';

export type MutationType =
    | 'compress_instructions'
    | 'reorder_constraints'
    | 'safety_reinforcement'
    | 'tool_selection_bias'
    | 'inherit_gene'
    | 'rollback'
    | 'manual_edit'
    | 'emergency_fix';

// ─── Multi-Objective Fitness ────────────────────────────────

/**
 * Fitness Vector - Multi-dimensional genome evaluation
 *
 * Replaces single fitness score with comprehensive metrics.
 */
export interface FitnessVector {
    // Quality dimensions
    quality: number; // 0-1: Output coherence and correctness
    successRate: number; // 0-1: Tasks completed successfully

    // Efficiency dimensions
    tokenEfficiency: number; // 0-1: Cognitive compression
    latency: number; // milliseconds (raw value, not normalized)

    // Economic dimension
    costPerSuccess: number; // USD per successful interaction

    // Human-in-loop dimension
    interventionRate: number; // 0-1: Corrections needed

    // Composite score (weighted average)
    composite: number; // 0-1: Overall fitness

    // Metadata
    sampleSize: number; // Number of interactions
    lastUpdated: Date;
    confidence: number; // 0-1: Statistical confidence
}

/**
 * Fitness Weights - Configurable optimization priorities
 */
export interface FitnessWeights {
    quality: number; // Default: 0.30 (30%)
    successRate: number; // Default: 0.25 (25%)
    tokenEfficiency: number; // Default: 0.20 (20%)
    latency: number; // Default: 0.10 (10%)
    costPerSuccess: number; // Default: 0.10 (10%)
    interventionRate: number; // Default: 0.05 (5%)
}

// ─── Genome State Machine ───────────────────────────────────

/**
 * Genome State - Operational status
 */
export type GenomeState =
    | 'active' // Normal operation
    | 'quarantined' // C0 integrity violation
    | 'testing' // In sandbox evaluation
    | 'archived' // No longer in use
    | 'migrating'; // v1 → v2 migration in progress

// ─── Validation & Evaluation ────────────────────────────────

/**
 * Validation Results - Gene/mutation validation outcome
 */
export interface ValidationResults {
    passed: boolean;
    score: number; // 0-1
    errors: string[];
    warnings: string[];
    testDuration: number; // milliseconds
    testedAt: Date;
}

/**
 * Evaluation Result - Full evaluation from Evaluator
 */
export interface EvaluationResult {
    success: boolean;
    fitness: FitnessVector;
    tasks: TaskResult[];
    duration: number;
    timestamp: Date;
}

export interface TaskResult {
    taskId: string;
    success: boolean;
    quality: number;
    tokens: number;
    latency: number;
    error?: string;
}

// ─── Genome Configuration ───────────────────────────────────

/**
 * Genome Config - Operational parameters
 */
export interface GenomeConfig {
    // Evolution settings
    mutationRate: 'conservative' | 'balanced' | 'aggressive';
    epsilonExplore: number; // 0-1: Exploration vs exploitation

    // Sandbox settings
    enableSandbox: boolean;
    sandboxModel?: string; // Default: 'claude-haiku-3'

    // Fitness settings
    fitnessWeights?: FitnessWeights;
    minFitnessImprovement: number; // Default: 0.05 (5%)

    // Safety settings
    enableIntegrityCheck: boolean; // Default: true
    autoRollbackThreshold: number; // Default: 0.15 (15% drop)

    // Inheritance settings
    allowInheritance: boolean; // Default: true
    minCompatibilityScore: number; // Default: 0.6
}

// ─── Utility Types ──────────────────────────────────────────

/**
 * Genome Snapshot - Point-in-time capture
 */
export interface GenomeSnapshot {
    genomeId: string;
    version: number;
    snapshot: GenomeV2;
    createdAt: Date;
    reason: string;
}

/**
 * Genome Diff - Comparison between versions
 */
export interface GenomeDiff {
    from: number; // Version number
    to: number; // Version number
    changes: GenomeChange[];
    impactScore: number; // 0-1: Magnitude of changes
}

export interface GenomeChange {
    path: string; // JSON path (e.g., "chromosomes.c1.operations[0].content")
    operation: 'add' | 'remove' | 'modify';
    before?: unknown;
    after?: unknown;
}

/**
 * Genome Family - Related genomes for inheritance
 */
export interface GenomeFamily {
    id: string;
    name: string;
    description: string;
    genomes: string[]; // Genome IDs
    sharedGenes: string[]; // Validated gene IDs
    createdAt: Date;
}

// ─── Export All ─────────────────────────────────────────────

export type {
    // Keep existing exports for compatibility
    GenomeV2 as Genome,
};
