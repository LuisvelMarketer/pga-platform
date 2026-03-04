import { z } from 'zod';
import {
    CognitiveGene,
    GeneContent,
    FitnessMetrics,
    Lineage,
    TenantInfo,
    GeneExtractionResult,
    createGeneId,
} from './CognitiveGene';
import type { LLMAdapter } from '../interfaces/LLMAdapter';
import type { MetricsCollector } from '../monitoring/MetricsCollector';

/**
 * GeneExtractor.ts
 *
 * Extracts Cognitive Genes from successful prompt mutations.
 *
 * The Gene Extractor analyzes high-fitness mutations to identify reusable
 * behavioral patterns that can be encoded as genes. It uses the LLM to:
 * 1. Identify the key change that improved fitness
 * 2. Classify the pattern type
 * 3. Generalize the pattern for reuse
 * 4. Generate examples and context
 *
 * This is the "reverse engineering" step that converts a specific successful
 * mutation into a transferable cognitive gene.
 *
 * @module gene-bank/GeneExtractor
 * @version 0.4.0
 */

// ============================================================================
// EXTRACTION CONFIGURATION
// ============================================================================

/**
 * Configuration for gene extraction
 */
export const GeneExtractionConfigSchema = z.object({
    /** Minimum fitness required to consider extraction */
    minFitnessThreshold: z.number().min(0).max(1).default(0.7),

    /** Minimum fitness improvement vs parent required */
    minFitnessGain: z.number().min(0).default(0.1),

    /** Minimum confidence for extraction */
    minConfidence: z.number().min(0).max(1).default(0.6),

    /** Whether to extract genes automatically */
    autoExtract: z.boolean().default(true),

    /** LLM model to use for extraction */
    extractionModel: z.string().optional(),

    /** Maximum tokens for extraction prompt */
    maxTokens: z.number().int().min(100).default(2000),

    /** Temperature for extraction (lower = more focused) */
    temperature: z.number().min(0).max(1).default(0.3),
});

export type GeneExtractionConfig = z.infer<typeof GeneExtractionConfigSchema>;

// ============================================================================
// MUTATION CONTEXT
// ============================================================================

/**
 * Context about a mutation for gene extraction
 */
export interface MutationContext {
    /** Mutation ID */
    mutationId: string;

    /** Original prompt (before mutation) */
    originalPrompt: string;

    /** Mutated prompt (after mutation) */
    mutatedPrompt: string;

    /** Parent fitness score */
    parentFitness: number;

    /** Mutated fitness score */
    mutatedFitness: number;

    /** Task description or context */
    taskContext: string;

    /** Domain or category */
    domain: string;

    /** Performance metrics */
    metrics?: {
        taskSuccessRate?: number;
        tokenEfficiency?: number;
        responseQuality?: number;
        userSatisfaction?: number;
    };

    /** Parent gene ID (if mutation was from adopted gene) */
    parentGeneId?: string;
}

// ============================================================================
// EXTRACTION PROMPT BUILDER
// ============================================================================

/**
 * Build extraction prompt for LLM
 */
function buildExtractionPrompt(context: MutationContext): string {
    return `You are a Gene Extraction AI. Your job is to analyze a successful prompt mutation and extract a reusable "Cognitive Gene" - a behavioral pattern that can be shared with other AI agents.

## Mutation Analysis

**Original Prompt:**
${context.originalPrompt}

**Mutated Prompt (Higher Fitness):**
${context.mutatedPrompt}

**Task Context:**
${context.taskContext}

**Domain:**
${context.domain}

**Fitness Improvement:**
- Parent Fitness: ${context.parentFitness.toFixed(2)}
- Mutated Fitness: ${context.mutatedFitness.toFixed(2)}
- Gain: ${(context.mutatedFitness - context.parentFitness).toFixed(2)}

## Your Task

Analyze the mutation and extract a Cognitive Gene. Return a JSON object with:

\`\`\`json
{
  "canExtract": true/false,
  "confidence": 0.0-1.0,
  "geneType": "tool-usage-pattern" | "reasoning-pattern" | "communication-pattern" | "error-recovery-pattern" | "context-management" | "multi-step-workflow" | "domain-expertise",
  "name": "Short descriptive name",
  "description": "What this gene does and why it works",
  "instruction": "The core pattern/rule to apply",
  "examples": [
    {
      "scenario": "When to use this pattern",
      "expectedBehavior": "What should happen"
    }
  ],
  "requiredCapabilities": ["List of required tools/capabilities"],
  "applicableContexts": ["Contexts where this works best"],
  "contraindications": ["When NOT to use this pattern"],
  "reasoning": "Why you extracted this pattern"
}
\`\`\`

## Guidelines

1. **Identify the Key Change**: What specific change improved fitness?
2. **Generalize**: Make the pattern reusable beyond this specific case
3. **Be Specific**: The instruction should be clear and actionable
4. **Provide Examples**: Show when and how to apply the pattern
5. **Set Confidence**: How confident are you this pattern is generalizable?

Return ONLY the JSON object, no additional text.`;
}

// ============================================================================
// EXTRACTION RESPONSE SCHEMA
// ============================================================================

/**
 * Schema for LLM extraction response
 */
const ExtractionResponseSchema = z.object({
    canExtract: z.boolean(),
    confidence: z.number().min(0).max(1),
    geneType: z.enum([
        'tool-usage-pattern',
        'reasoning-pattern',
        'communication-pattern',
        'error-recovery-pattern',
        'context-management',
        'multi-step-workflow',
        'domain-expertise',
    ]),
    name: z.string(),
    description: z.string(),
    instruction: z.string(),
    examples: z.array(z.object({
        scenario: z.string(),
        expectedBehavior: z.string(),
    })),
    requiredCapabilities: z.array(z.string()),
    applicableContexts: z.array(z.string()),
    contraindications: z.array(z.string()),
    reasoning: z.string(),
});

type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>;

// ============================================================================
// GENE EXTRACTOR CLASS
// ============================================================================

/**
 * Gene Extractor - Extracts Cognitive Genes from Mutations
 */
export class GeneExtractor {
    private config: GeneExtractionConfig;

    constructor(
        private llm: LLMAdapter,
        config?: Partial<GeneExtractionConfig>,
        private metricsCollector?: MetricsCollector
    ) {
        this.config = GeneExtractionConfigSchema.parse(config || {});
    }

    // ========================================================================
    // CORE EXTRACTION
    // ========================================================================

    /**
     * Extract a gene from a mutation
     */
    async extractGene(
        context: MutationContext,
        tenantInfo: TenantInfo
    ): Promise<GeneExtractionResult> {
        const startTime = Date.now();

        try {
            // Check if mutation meets extraction criteria
            const fitnessGain = context.mutatedFitness - context.parentFitness;

            if (context.mutatedFitness < this.config.minFitnessThreshold) {
                return {
                    success: false,
                    gene: null,
                    reason: `Fitness ${context.mutatedFitness} below threshold ${this.config.minFitnessThreshold}`,
                    confidence: 0,
                    metadata: {
                        sourceMutationId: context.mutationId,
                        extractionMethod: 'threshold-check',
                        durationMs: Date.now() - startTime,
                        timestamp: new Date().toISOString(),
                    },
                };
            }

            if (fitnessGain < this.config.minFitnessGain) {
                return {
                    success: false,
                    gene: null,
                    reason: `Fitness gain ${fitnessGain} below threshold ${this.config.minFitnessGain}`,
                    confidence: 0,
                    metadata: {
                        sourceMutationId: context.mutationId,
                        extractionMethod: 'threshold-check',
                        durationMs: Date.now() - startTime,
                        timestamp: new Date().toISOString(),
                    },
                };
            }

            // Build extraction prompt
            const prompt = buildExtractionPrompt(context);

            // Call LLM for extraction
            const response = await this.llm.chat([{ role: 'user', content: prompt }], {
                maxTokens: this.config.maxTokens,
                temperature: this.config.temperature,
            });

            // Parse LLM response
            const extractionData = this.parseExtractionResponse(response.content);

            // Check extraction confidence
            if (!extractionData.canExtract) {
                return {
                    success: false,
                    gene: null,
                    reason: extractionData.reasoning || 'LLM determined gene cannot be extracted',
                    confidence: extractionData.confidence,
                    metadata: {
                        sourceMutationId: context.mutationId,
                        extractionMethod: 'llm-analysis',
                        durationMs: Date.now() - startTime,
                        timestamp: new Date().toISOString(),
                    },
                };
            }

            if (extractionData.confidence < this.config.minConfidence) {
                return {
                    success: false,
                    gene: null,
                    reason: `Confidence ${extractionData.confidence} below threshold ${this.config.minConfidence}`,
                    confidence: extractionData.confidence,
                    metadata: {
                        sourceMutationId: context.mutationId,
                        extractionMethod: 'llm-analysis',
                        durationMs: Date.now() - startTime,
                        timestamp: new Date().toISOString(),
                    },
                };
            }

            // Build gene
            const gene = this.buildGene(extractionData, context, tenantInfo);

            // Track successful extraction
            this.metricsCollector?.logAudit({
                level: 'info',
                component: 'GeneExtractor',
                operation: 'extractGene',
                message: `Successfully extracted gene ${gene.name} (${gene.type}) with confidence ${extractionData.confidence.toFixed(2)}`,
                duration: Date.now() - startTime,
                metadata: {
                    geneId: gene.id,
                    geneType: gene.type,
                    domain: gene.domain,
                    sourceMutationId: context.mutationId,
                    confidence: extractionData.confidence,
                    fitnessGain,
                },
            });

            return {
                success: true,
                gene,
                confidence: extractionData.confidence,
                metadata: {
                    sourceMutationId: context.mutationId,
                    extractionMethod: 'llm-analysis',
                    durationMs: Date.now() - startTime,
                    timestamp: new Date().toISOString(),
                },
            };
        } catch (error) {
            // Track extraction error
            this.metricsCollector?.logAudit({
                level: 'error',
                component: 'GeneExtractor',
                operation: 'extractGene',
                message: `Gene extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                duration: Date.now() - startTime,
                metadata: {
                    sourceMutationId: context.mutationId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            });

            return {
                success: false,
                gene: null,
                reason: error instanceof Error ? error.message : 'Unknown error during extraction',
                confidence: 0,
                metadata: {
                    sourceMutationId: context.mutationId,
                    extractionMethod: 'error',
                    durationMs: Date.now() - startTime,
                    timestamp: new Date().toISOString(),
                },
            };
        }
    }

    /**
     * Extract genes from multiple mutations (batch)
     */
    async extractBatch(
        contexts: MutationContext[],
        tenantInfo: TenantInfo
    ): Promise<GeneExtractionResult[]> {
        const results: GeneExtractionResult[] = [];

        for (const context of contexts) {
            const result = await this.extractGene(context, tenantInfo);
            results.push(result);
        }

        return results;
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Parse LLM extraction response
     */
    private parseExtractionResponse(responseText: string): ExtractionResponse {
        try {
            // Try to extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const json = JSON.parse(jsonMatch[0]);
            return ExtractionResponseSchema.parse(json);
        } catch (error) {
            throw new Error(
                `Failed to parse extraction response: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Build a CognitiveGene from extraction data
     */
    private buildGene(
        extractionData: ExtractionResponse,
        context: MutationContext,
        tenantInfo: TenantInfo
    ): CognitiveGene {
        const now = new Date().toISOString();
        const geneId = createGeneId(tenantInfo.tenantId, extractionData.geneType);

        // Build fitness metrics
        const fitness: FitnessMetrics = {
            overallFitness: context.mutatedFitness,
            taskSuccessRate: context.metrics?.taskSuccessRate || context.mutatedFitness,
            userSatisfaction: context.metrics?.userSatisfaction,
            tokenEfficiency: context.metrics?.tokenEfficiency || 0,
            responseQuality: context.metrics?.responseQuality || context.mutatedFitness,
            adoptionCount: 0,
            adoptionPerformance: null,
        };

        // Build lineage
        const lineage: Lineage = {
            parentGeneId: context.parentGeneId || null,
            generation: context.parentGeneId ? 1 : 0,
            ancestors: context.parentGeneId ? [context.parentGeneId] : [],
            mutationHistory: [
                {
                    timestamp: now,
                    change: `Extracted from mutation ${context.mutationId}`,
                    fitnessGain: context.mutatedFitness - context.parentFitness,
                },
            ],
        };

        // Build content
        const content: GeneContent = {
            instruction: extractionData.instruction,
            examples: extractionData.examples,
            requiredCapabilities: extractionData.requiredCapabilities,
            applicableContexts: extractionData.applicableContexts,
            contraindications: extractionData.contraindications,
            metadata: {
                extractionReasoning: extractionData.reasoning,
                sourceMutationId: context.mutationId,
                originalPrompt: context.originalPrompt,
                mutatedPrompt: context.mutatedPrompt,
            },
        };

        // Build gene
        const gene: CognitiveGene = {
            id: geneId,
            version: '1.0.0',
            name: extractionData.name,
            description: extractionData.description,
            type: extractionData.geneType,
            domain: context.domain,
            fitness,
            lineage,
            content,
            tenant: tenantInfo,
            createdAt: now,
            updatedAt: now,
            tags: [
                context.domain,
                extractionData.geneType,
                'extracted',
            ],
        };

        return gene;
    }

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /**
     * Get current configuration
     */
    getConfig(): GeneExtractionConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<GeneExtractionConfig>): void {
        this.config = GeneExtractionConfigSchema.parse({
            ...this.config,
            ...updates,
        });
    }
}
