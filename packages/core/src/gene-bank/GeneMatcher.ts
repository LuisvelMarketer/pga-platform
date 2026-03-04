import { z } from 'zod';
import {
    CognitiveGene,
    GeneType,
} from './CognitiveGene';

/**
 * GeneMatcher.ts
 *
 * Finds and matches genes based on similarity, domain, and fitness.
 *
 * The Gene Matcher is responsible for:
 * 1. Finding genes similar to a task/context
 * 2. Ranking genes by relevance and fitness
 * 3. Semantic matching using embeddings (optional)
 * 4. Compatibility checking between genes and agents
 *
 * This is the "gene discovery" component that helps agents find
 * relevant genes from the Gene Bank (either local or via THK).
 *
 * @module gene-bank/GeneMatcher
 * @version 0.4.0
 */

// ============================================================================
// MATCH CONFIGURATION
// ============================================================================

/**
 * Configuration for gene matching
 */
export const GeneMatchConfigSchema = z.object({
    /** Minimum fitness score to consider */
    minFitness: z.number().min(0).max(1).default(0.7),

    /** Minimum match score (0-1) */
    minMatchScore: z.number().min(0).max(1).default(0.5),

    /** Weight for fitness in final score (0-1) */
    fitnessWeight: z.number().min(0).max(1).default(0.4),

    /** Weight for domain match in final score (0-1) */
    domainWeight: z.number().min(0).max(1).default(0.3),

    /** Weight for type match in final score (0-1) */
    typeWeight: z.number().min(0).max(1).default(0.2),

    /** Weight for adoption count in final score (0-1) */
    adoptionWeight: z.number().min(0).max(1).default(0.1),

    /** Maximum results to return */
    maxResults: z.number().int().min(1).default(10),

    /** Boost genes from same domain */
    domainBoost: z.number().min(1).default(1.5),

    /** Boost genes with high adoption */
    adoptionBoost: z.number().min(1).default(1.2),
});

export type GeneMatchConfig = z.infer<typeof GeneMatchConfigSchema>;

// ============================================================================
// MATCH CONTEXT
// ============================================================================

/**
 * Context for gene matching
 */
export interface MatchContext {
    /** Task description */
    task: string;

    /** Domain or category */
    domain: string;

    /** Preferred gene types (optional) */
    preferredTypes?: GeneType[];

    /** Required capabilities (optional) */
    requiredCapabilities?: string[];

    /** Tags to match (optional) */
    tags?: string[];

    /** Current context/situation */
    currentContext?: string;
}

// ============================================================================
// MATCH RESULT
// ============================================================================

/**
 * Result of gene matching
 */
export interface GeneMatchResult {
    /** The matched gene */
    gene: CognitiveGene;

    /** Overall match score (0-1) */
    matchScore: number;

    /** Breakdown of score components */
    scoreBreakdown: {
        fitnessScore: number;
        domainScore: number;
        typeScore: number;
        adoptionScore: number;
        semanticScore?: number;
    };

    /** Reason for match */
    reason: string;

    /** Confidence in this match */
    confidence: number;
}

// ============================================================================
// GENE MATCHER CLASS
// ============================================================================

/**
 * Gene Matcher - Finds and ranks relevant genes
 */
export class GeneMatcher {
    private config: GeneMatchConfig;

    constructor(config?: Partial<GeneMatchConfig>) {
        this.config = GeneMatchConfigSchema.parse(config || {});
    }

    // ========================================================================
    // CORE MATCHING
    // ========================================================================

    /**
     * Find matching genes for a context
     */
    async findMatches(
        context: MatchContext,
        candidates: CognitiveGene[]
    ): Promise<GeneMatchResult[]> {
        // Filter by minimum fitness
        const fitGenes = candidates.filter(
            gene => gene.fitness.overallFitness >= this.config.minFitness
        );

        // Score each gene
        const scoredGenes: GeneMatchResult[] = [];

        for (const gene of fitGenes) {
            const matchResult = this.scoreGene(gene, context);

            // Only include if above minimum match score
            if (matchResult.matchScore >= this.config.minMatchScore) {
                scoredGenes.push(matchResult);
            }
        }

        // Sort by match score (descending)
        scoredGenes.sort((a, b) => b.matchScore - a.matchScore);

        // Return top N results
        return scoredGenes.slice(0, this.config.maxResults);
    }

    /**
     * Find best matching gene for a context
     */
    async findBestMatch(
        context: MatchContext,
        candidates: CognitiveGene[]
    ): Promise<GeneMatchResult | null> {
        const matches = await this.findMatches(context, candidates);
        return matches.length > 0 ? matches[0] : null;
    }

    /**
     * Find genes by domain
     */
    async findByDomain(
        domain: string,
        candidates: CognitiveGene[]
    ): Promise<GeneMatchResult[]> {
        return this.findMatches(
            { task: '', domain },
            candidates
        );
    }

    /**
     * Find genes by type
     */
    async findByType(
        type: GeneType,
        candidates: CognitiveGene[]
    ): Promise<GeneMatchResult[]> {
        return this.findMatches(
            { task: '', domain: '', preferredTypes: [type] },
            candidates
        );
    }

    // ========================================================================
    // SCORING
    // ========================================================================

    /**
     * Score a gene against a context
     */
    private scoreGene(gene: CognitiveGene, context: MatchContext): GeneMatchResult {
        // 1. Fitness score (normalized)
        const fitnessScore = gene.fitness.overallFitness;

        // 2. Domain score
        const domainScore = this.scoreDomain(gene, context);

        // 3. Type score
        const typeScore = this.scoreType(gene, context);

        // 4. Adoption score (normalized)
        const adoptionScore = this.scoreAdoption(gene);

        // 5. Semantic score (if context provided)
        const semanticScore = context.currentContext
            ? this.scoreSemanticMatch(gene, context)
            : 0;

        // Apply weights
        let weightedScore =
            fitnessScore * this.config.fitnessWeight +
            domainScore * this.config.domainWeight +
            typeScore * this.config.typeWeight +
            adoptionScore * this.config.adoptionWeight;

        // Apply boosts
        if (domainScore > 0.8) {
            weightedScore *= this.config.domainBoost;
        }
        if (gene.fitness.adoptionCount > 10) {
            weightedScore *= this.config.adoptionBoost;
        }

        // Normalize to 0-1
        const matchScore = Math.min(1, weightedScore);

        // Build reason
        const reason = this.buildMatchReason(gene, context, {
            fitnessScore,
            domainScore,
            typeScore,
            adoptionScore,
            semanticScore,
        });

        // Calculate confidence
        const confidence = this.calculateConfidence({
            fitnessScore,
            domainScore,
            typeScore,
            adoptionScore,
            semanticScore,
        });

        return {
            gene,
            matchScore,
            scoreBreakdown: {
                fitnessScore,
                domainScore,
                typeScore,
                adoptionScore,
                semanticScore,
            },
            reason,
            confidence,
        };
    }

    /**
     * Score domain match
     */
    private scoreDomain(gene: CognitiveGene, context: MatchContext): number {
        // Exact domain match
        if (gene.domain.toLowerCase() === context.domain.toLowerCase()) {
            return 1.0;
        }

        // Partial domain match (e.g., "coding" matches "python-coding")
        if (
            gene.domain.toLowerCase().includes(context.domain.toLowerCase()) ||
            context.domain.toLowerCase().includes(gene.domain.toLowerCase())
        ) {
            return 0.7;
        }

        // Tag match
        if (context.tags && gene.tags.some(tag => context.tags!.includes(tag))) {
            return 0.5;
        }

        return 0.1;
    }

    /**
     * Score type match
     */
    private scoreType(gene: CognitiveGene, context: MatchContext): number {
        if (!context.preferredTypes || context.preferredTypes.length === 0) {
            return 0.5; // Neutral if no type preference
        }

        if (context.preferredTypes.includes(gene.type)) {
            return 1.0;
        }

        return 0.0;
    }

    /**
     * Score adoption count
     */
    private scoreAdoption(gene: CognitiveGene): number {
        const count = gene.fitness.adoptionCount;
        const performance = gene.fitness.adoptionPerformance ?? 0.5;

        // Combine adoption count with adoption performance
        // More adoptions with good performance = higher score
        const countScore = Math.min(1, count / 20); // Saturates at 20 adoptions
        const performanceScore = performance;

        return (countScore + performanceScore) / 2;
    }

    /**
     * Score semantic match (simple keyword-based for now)
     * TODO: Implement embeddings-based semantic matching in future
     */
    private scoreSemanticMatch(gene: CognitiveGene, context: MatchContext): number {
        if (!context.currentContext) return 0;

        const contextLower = context.currentContext.toLowerCase();
        const instruction = gene.content.instruction.toLowerCase();
        const description = gene.description.toLowerCase();

        // Check if key terms appear
        const terms = contextLower.split(/\s+/).filter(t => t.length > 3);
        const instructionMatches = terms.filter(t =>
            instruction.includes(t) || description.includes(t)
        ).length;

        return Math.min(1, instructionMatches / Math.max(1, terms.length));
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Build match reason
     */
    private buildMatchReason(
        gene: CognitiveGene,
        _context: MatchContext,
        scores: {
            fitnessScore: number;
            domainScore: number;
            typeScore: number;
            adoptionScore: number;
            semanticScore?: number;
        }
    ): string {
        const reasons: string[] = [];

        if (scores.fitnessScore >= 0.8) {
            reasons.push(`high fitness (${(scores.fitnessScore * 100).toFixed(0)}%)`);
        }

        if (scores.domainScore >= 0.9) {
            reasons.push(`exact domain match (${gene.domain})`);
        } else if (scores.domainScore >= 0.6) {
            reasons.push(`similar domain (${gene.domain})`);
        }

        if (scores.typeScore >= 0.9) {
            reasons.push(`preferred type (${gene.type})`);
        }

        if (gene.fitness.adoptionCount > 5) {
            reasons.push(`proven adoption (${gene.fitness.adoptionCount} times)`);
        }

        if (scores.semanticScore && scores.semanticScore >= 0.6) {
            reasons.push('semantic match with context');
        }

        return reasons.length > 0
            ? `Match: ${reasons.join(', ')}`
            : 'General match based on fitness';
    }

    /**
     * Calculate confidence in match
     */
    private calculateConfidence(scores: {
        fitnessScore: number;
        domainScore: number;
        typeScore: number;
        adoptionScore: number;
        semanticScore?: number;
    }): number {
        const weights = {
            fitness: 0.3,
            domain: 0.3,
            type: 0.2,
            adoption: 0.1,
            semantic: 0.1,
        };

        const confidence =
            scores.fitnessScore * weights.fitness +
            scores.domainScore * weights.domain +
            scores.typeScore * weights.type +
            scores.adoptionScore * weights.adoption +
            (scores.semanticScore ?? 0) * weights.semantic;

        return Math.min(1, confidence);
    }

    // ========================================================================
    // COMPATIBILITY CHECKING
    // ========================================================================

    /**
     * Check if gene is compatible with agent capabilities
     */
    checkCompatibility(
        gene: CognitiveGene,
        agentCapabilities: string[]
    ): {
        compatible: boolean;
        missingCapabilities: string[];
        reason: string;
    } {
        const required = gene.content.requiredCapabilities || [];
        const missing = required.filter(cap => !agentCapabilities.includes(cap));

        if (missing.length === 0) {
            return {
                compatible: true,
                missingCapabilities: [],
                reason: 'All required capabilities available',
            };
        }

        return {
            compatible: false,
            missingCapabilities: missing,
            reason: `Missing capabilities: ${missing.join(', ')}`,
        };
    }

    /**
     * Check if gene is applicable to current context
     */
    checkApplicability(
        gene: CognitiveGene,
        currentContext: string
    ): {
        applicable: boolean;
        reason: string;
    } {
        const applicable = gene.content.applicableContexts || [];
        const contraindications = gene.content.contraindications || [];

        // Check contraindications first
        const hasContraindication = contraindications.some(contra =>
            currentContext.toLowerCase().includes(contra.toLowerCase())
        );

        if (hasContraindication) {
            return {
                applicable: false,
                reason: 'Context matches contraindication',
            };
        }

        // If no specific contexts defined, assume generally applicable
        if (applicable.length === 0) {
            return {
                applicable: true,
                reason: 'Generally applicable',
            };
        }

        // Check if matches applicable contexts
        const isApplicable = applicable.some(ctx =>
            currentContext.toLowerCase().includes(ctx.toLowerCase())
        );

        return {
            applicable: isApplicable,
            reason: isApplicable
                ? 'Context matches applicable contexts'
                : 'Context does not match applicable contexts',
        };
    }

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /**
     * Get current configuration
     */
    getConfig(): GeneMatchConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<GeneMatchConfig>): void {
        this.config = GeneMatchConfigSchema.parse({
            ...this.config,
            ...updates,
        });
    }
}
