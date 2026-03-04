import { z } from 'zod';

/**
 * CognitiveGene.ts
 *
 * Defines the schema and types for Cognitive Genes - extractable behavioral
 * patterns from successful prompt mutations that can be shared horizontally
 * (inspired by bacterial plasmid transfer).
 *
 * A Cognitive Gene represents a successful adaptation that can be:
 * 1. Extracted from high-fitness mutations
 * 2. Stored in a Gene Bank
 * 3. Shared within a tenant (THK - Horizontal Knowledge Transfer)
 * 4. Adopted by other agents after sandbox testing
 *
 * @module gene-bank/CognitiveGene
 * @version 0.4.0
 */

// ============================================================================
// GENE TYPE CLASSIFICATIONS
// ============================================================================

/**
 * Type of cognitive pattern encoded in the gene
 */
export const GeneTypeSchema = z.enum([
    'tool-usage-pattern',      // Pattern for using specific tools effectively
    'reasoning-pattern',       // Reasoning strategy or heuristic
    'communication-pattern',   // User interaction or response style
    'error-recovery-pattern',  // How to handle and recover from errors
    'context-management',      // Memory and context handling strategies
    'multi-step-workflow',     // Complex task decomposition patterns
    'domain-expertise',        // Specialized knowledge for a domain
]);

export type GeneType = z.infer<typeof GeneTypeSchema>;

// ============================================================================
// FITNESS METRICS
// ============================================================================

/**
 * Fitness metrics that measure gene quality and performance
 */
export const FitnessMetricsSchema = z.object({
    /** Overall fitness score (0-1, higher is better) */
    overallFitness: z.number().min(0).max(1),

    /** Task success rate when gene is active (0-1) */
    taskSuccessRate: z.number().min(0).max(1),

    /** User satisfaction score (0-1, optional) */
    userSatisfaction: z.number().min(0).max(1).optional(),

    /** Token efficiency gain vs baseline (percentage) */
    tokenEfficiency: z.number(),

    /** Response quality score (0-1) */
    responseQuality: z.number().min(0).max(1),

    /** Number of successful adoptions by other agents */
    adoptionCount: z.number().int().min(0).default(0),

    /** Average performance after adoption (0-1, null if no adoptions) */
    adoptionPerformance: z.number().min(0).max(1).nullable().default(null),
});

export type FitnessMetrics = z.infer<typeof FitnessMetricsSchema>;

// ============================================================================
// LINEAGE TRACKING
// ============================================================================

/**
 * Tracks the evolutionary lineage of a gene
 */
export const LineageSchema = z.object({
    /** ID of the parent gene (null for original genes) */
    parentGeneId: z.string().nullable().default(null),

    /** Generation number (0 for original, increments with each mutation) */
    generation: z.number().int().min(0).default(0),

    /** List of ancestor gene IDs */
    ancestors: z.array(z.string()).default([]),

    /** Mutation history describing changes from parent */
    mutationHistory: z.array(z.object({
        timestamp: z.string().datetime(),
        change: z.string(),
        fitnessGain: z.number(),
    })).default([]),
});

export type Lineage = z.infer<typeof LineageSchema>;

// ============================================================================
// GENE CONTENT
// ============================================================================

/**
 * The actual content/behavior encoded in the gene
 */
export const GeneContentSchema = z.object({
    /** Main instruction or pattern to inject */
    instruction: z.string(),

    /** Examples demonstrating the pattern */
    examples: z.array(z.object({
        scenario: z.string(),
        expectedBehavior: z.string(),
    })).optional(),

    /** Specific tools or capabilities required */
    requiredCapabilities: z.array(z.string()).default([]),

    /** Context where this gene is most effective */
    applicableContexts: z.array(z.string()).default([]),

    /** Anti-patterns or situations to avoid */
    contraindications: z.array(z.string()).default([]),

    /** Additional metadata in key-value format */
    metadata: z.record(z.unknown()).default({}),
});

export type GeneContent = z.infer<typeof GeneContentSchema>;

// ============================================================================
// MUTATION CONTEXT
// ============================================================================

/**
 * Context information for gene extraction from mutations
 */
export const MutationContextSchema = z.object({
    /** Mutation identifier */
    mutationId: z.string(),

    /** Original prompt before mutation */
    originalPrompt: z.string(),

    /** Mutated prompt */
    mutatedPrompt: z.string(),

    /** Fitness before mutation */
    parentFitness: z.number(),

    /** Fitness after mutation */
    mutatedFitness: z.number(),

    /** Task context/description */
    taskContext: z.string(),

    /** Domain of the task */
    domain: z.string(),

    /** Additional metrics */
    metrics: z.record(z.unknown()).optional(),
});

export type MutationContext = z.infer<typeof MutationContextSchema>;

// ============================================================================
// TENANT & SHARING
// ============================================================================

/**
 * Sharing scope for gene distribution
 */
export const SharingScopeSchema = z.enum([
    'private',      // Only this agent
    'tenant',       // All agents in same tenant (THK)
    'marketplace',  // Public marketplace (curated)
]);

export type SharingScope = z.infer<typeof SharingScopeSchema>;

/**
 * Tenant information for gene isolation
 */
export const TenantInfoSchema = z.object({
    /** Tenant ID that owns this gene */
    tenantId: z.string(),

    /** Agent ID that created this gene */
    createdBy: z.string(),

    /** Sharing scope */
    scope: SharingScopeSchema.default('private'),

    /** Whether gene is verified/curated for marketplace */
    verified: z.boolean().default(false),
});

export type TenantInfo = z.infer<typeof TenantInfoSchema>;

// ============================================================================
// COGNITIVE GENE (Complete Schema)
// ============================================================================

/**
 * Complete Cognitive Gene schema
 */
export const CognitiveGeneSchema = z.object({
    /** Unique gene identifier */
    id: z.string(),

    /** Gene version (semantic versioning) */
    version: z.string().default('1.0.0'),

    /** Human-readable name */
    name: z.string(),

    /** Brief description of what this gene does */
    description: z.string(),

    /** Type of cognitive pattern */
    type: GeneTypeSchema,

    /** Domain or category (e.g., 'coding', 'math', 'customer-support') */
    domain: z.string(),

    /** Fitness metrics */
    fitness: FitnessMetricsSchema,

    /** Evolutionary lineage */
    lineage: LineageSchema,

    /** Gene content and behavior */
    content: GeneContentSchema,

    /** Tenant and sharing information */
    tenant: TenantInfoSchema,

    /** Creation timestamp */
    createdAt: z.string().datetime(),

    /** Last update timestamp */
    updatedAt: z.string().datetime(),

    /** Tags for searchability */
    tags: z.array(z.string()).default([]),
});

export type CognitiveGene = z.infer<typeof CognitiveGeneSchema>;

// ============================================================================
// GENE EXTRACTION RESULT
// ============================================================================

/**
 * Result of gene extraction from a mutation
 */
export const GeneExtractionResultSchema = z.object({
    /** Whether extraction was successful */
    success: z.boolean(),

    /** Extracted gene (if successful) */
    gene: CognitiveGeneSchema.nullable(),

    /** Reason for failure (if unsuccessful) */
    reason: z.string().optional(),

    /** Confidence score (0-1) */
    confidence: z.number().min(0).max(1),

    /** Extraction metadata */
    metadata: z.object({
        sourceMutationId: z.string(),
        extractionMethod: z.string(),
        durationMs: z.number(),
        timestamp: z.string().datetime(),
    }),
});

export type GeneExtractionResult = z.infer<typeof GeneExtractionResultSchema>;

// ============================================================================
// GENE ADOPTION RESULT
// ============================================================================

/**
 * Result of gene adoption/integration
 */
export const GeneAdoptionResultSchema = z.object({
    /** Whether adoption was successful */
    success: z.boolean(),

    /** Gene ID that was adopted */
    geneId: z.string(),

    /** Adopting agent ID */
    agentId: z.string(),

    /** Sandbox test results */
    sandboxResults: z.object({
        passed: z.boolean(),
        testsPassed: z.number().int(),
        testsFailed: z.number().int(),
        performance: z.number().min(0).max(1),
        issues: z.array(z.string()).default([]),
    }),

    /** Whether integration was successful */
    integrated: z.boolean(),

    /** Reason for failure (if unsuccessful) */
    reason: z.string().optional(),

    /** Adoption metadata */
    metadata: z.object({
        adoptionTimestamp: z.string().datetime(),
        durationMs: z.number(),
    }),
});

export type GeneAdoptionResult = z.infer<typeof GeneAdoptionResultSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new gene ID
 */
export function createGeneId(tenantId: string, type: GeneType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `gene_${tenantId}_${type}_${timestamp}_${random}`;
}

/**
 * Check if a gene meets minimum fitness threshold
 */
export function meetsMinimumFitness(gene: CognitiveGene, threshold = 0.6): boolean {
    return gene.fitness.overallFitness >= threshold &&
           gene.fitness.taskSuccessRate >= threshold;
}

/**
 * Calculate fitness delta between parent and child gene
 */
export function calculateFitnessDelta(child: CognitiveGene, parent: CognitiveGene | null): number {
    if (!parent) return child.fitness.overallFitness;
    return child.fitness.overallFitness - parent.fitness.overallFitness;
}

/**
 * Check if gene is shareable in marketplace
 */
export function isMarketplaceReady(gene: CognitiveGene): boolean {
    return gene.tenant.scope === 'marketplace' &&
           gene.tenant.verified &&
           gene.fitness.overallFitness >= 0.8 &&
           gene.fitness.adoptionCount >= 5 &&
           (gene.fitness.adoptionPerformance ?? 0) >= 0.7;
}
