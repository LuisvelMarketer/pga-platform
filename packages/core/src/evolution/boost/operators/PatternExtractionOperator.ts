/**
 * Pattern Extraction Operator - GENE BANK INTEGRATION
 *
 * Extracts successful patterns from Gene Bank and integrates them.
 * Expected improvement: 50% (leverages collective intelligence!)
 *
 * Strategy:
 * - Queries Gene Bank for high-fitness patterns
 * - Analyzes current genome weaknesses
 * - Extracts and adapts successful patterns from other agents
 * - Integrates patterns intelligently
 *
 * This is HORIZONTAL KNOWLEDGE TRANSFER in action!
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0 - Evolution Boost
 */

import type {
    GenomeV2,
    OperativeGene,
    MutationType,
    MutationRecord,
} from '../../../types/GenomeV2.js';

import type {
    IMutationOperator,
    MutationContext,
    MutationResult,
} from '../../MutationOperator.js';

import type { GeneBank } from '../../../gene-bank/GeneBank.js';
import type { LLMAdapter } from '../../../interfaces/LLMAdapter.js';
import { generateText } from '../utils/llmHelper.js';

/**
 * Pattern Extraction Operator
 *
 * AGGRESSIVE mutation that leverages Gene Bank to extract and integrate
 * successful patterns from other high-performing agents.
 */
export class PatternExtractionOperator implements IMutationOperator {
    name: MutationType = 'pattern_extraction';
    description = 'Extract and integrate successful patterns from Gene Bank';
    targetChromosome: 'c1' = 'c1';

    constructor(
        private geneBank: GeneBank,
        private llm: LLMAdapter
    ) {}

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);

        // Identify weaknesses in current genome
        const weaknesses = this.identifyWeaknesses(context);

        // Search Gene Bank for patterns that address these weaknesses
        const relevantPatterns = await this.findRelevantPatterns(weaknesses, context);

        if (relevantPatterns.length === 0) {
            // No patterns found - fall back to no mutation
            return {
                success: false,
                mutant: context.genome,
                mutation: this.createEmptyMutation(),
                description: 'No relevant patterns found in Gene Bank',
                expectedImprovement: 0,
            };
        }

        // Integrate patterns into genome
        mutant.chromosomes.c1.operations = await this.integratePatterns(
            mutant.chromosomes.c1.operations,
            relevantPatterns,
            context
        );

        // Create mutation record
        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: JSON.stringify(context.genome.chromosomes.c1),
            after: JSON.stringify(mutant.chromosomes.c1),
            diff: `Integrated ${relevantPatterns.length} patterns from Gene Bank`,
            trigger: 'drift-detected',
            reason: context.reason,
            sandboxTested: false,
            promoted: false,
            proposer: 'system',
        };

        return {
            success: true,
            mutant,
            mutation,
            description: `Integrated ${relevantPatterns.length} successful patterns from Gene Bank`,
            expectedImprovement: 0.50, // 50% improvement expected! 🚀
        };
    }

    estimateImprovement(context: MutationContext): number {
        // Pattern extraction is VERY powerful when there are weaknesses
        const fitness = context.genome.fitness;

        // Calculate overall gap (room for improvement)
        const gaps = [
            1 - fitness.quality,
            1 - fitness.successRate,
            1 - fitness.tokenEfficiency,
            fitness.interventionRate, // Higher is worse
        ];

        const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;

        // Base: 50%, can go up to 70% if lots of room for improvement
        return 0.50 + (avgGap * 0.20);
    }

    /**
     * Identify weaknesses in current genome
     */
    private identifyWeaknesses(context: MutationContext): string[] {
        const weaknesses: string[] = [];
        const fitness = context.genome.fitness;

        if (fitness.quality < 0.7) {
            weaknesses.push('low-quality-responses');
        }

        if (fitness.successRate < 0.8) {
            weaknesses.push('low-success-rate');
        }

        if (fitness.tokenEfficiency < 0.6) {
            weaknesses.push('inefficient-token-usage');
        }

        if (fitness.interventionRate > 0.15) {
            weaknesses.push('high-intervention-rate');
        }

        if (fitness.latency > 2000) {
            weaknesses.push('high-latency');
        }

        // Add reason-based weaknesses
        if (context.reason.toLowerCase().includes('error')) {
            weaknesses.push('error-handling');
        }

        if (context.reason.toLowerCase().includes('tool')) {
            weaknesses.push('tool-usage');
        }

        return weaknesses;
    }

    /**
     * Find relevant patterns in Gene Bank
     */
    private async findRelevantPatterns(
        weaknesses: string[],
        context: MutationContext
    ): Promise<Array<{ pattern: string; fitness: number; category: string }>> {
        const patterns: Array<{ pattern: string; fitness: number; category: string }> = [];

        try {
            // Search for genes that address these weaknesses
            for (const weakness of weaknesses) {
                const genes = await this.geneBank.searchGenes({
                    type: [this.mapWeaknessToGeneType(weakness)],
                    minFitness: 0.75, // Only get high-quality patterns
                    limit: 3,
                });

                for (const gene of genes) {
                    if (gene.fitness.overallFitness > context.genome.fitness.composite) {
                        patterns.push({
                            pattern: gene.content.instruction,
                            fitness: gene.fitness.overallFitness,
                            category: gene.type,
                        });
                    }
                }
            }
        } catch (error) {
            // Gene Bank might not be available - that's ok
            console.warn('Gene Bank not available for pattern extraction:', error);
        }

        // Sort by fitness (best first)
        return patterns.sort((a, b) => b.fitness - a.fitness).slice(0, 5);
    }

    /**
     * Map weakness to gene type
     */
    private mapWeaknessToGeneType(weakness: string): string {
        const mapping: Record<string, string> = {
            'low-quality-responses': 'reasoning-pattern',
            'low-success-rate': 'tool-usage-pattern',
            'inefficient-token-usage': 'cognitive-compression',
            'high-intervention-rate': 'safety-constraint',
            'high-latency': 'performance-optimization',
            'error-handling': 'error-recovery-pattern',
            'tool-usage': 'tool-usage-pattern',
        };

        return mapping[weakness] || 'reasoning-pattern';
    }

    /**
     * Integrate patterns into genome
     */
    private async integratePatterns(
        genes: OperativeGene[],
        patterns: Array<{ pattern: string; fitness: number; category: string }>,
        context: MutationContext
    ): Promise<OperativeGene[]> {
        // Use LLM to intelligently integrate patterns
        const integrationPrompt = this.buildIntegrationPrompt(genes, patterns, context);

        const response = await generateText(this.llm, {
            prompt: integrationPrompt,
            temperature: 0.5,
            maxTokens: 2000,
        });

        // Parse enhanced genes from response
        const enhancedGenes = this.parseEnhancedGenes(response.content, genes);

        return enhancedGenes;
    }

    /**
     * Build prompt for LLM to integrate patterns
     */
    private buildIntegrationPrompt(
        genes: OperativeGene[],
        patterns: Array<{ pattern: string; fitness: number; category: string }>,
        context: MutationContext
    ): string {
        const genesText = genes.map((g, i) => `Gene ${i + 1} (${g.category}):\n${g.content}`).join('\n\n');
        const patternsText = patterns.map((p, i) =>
            `Pattern ${i + 1} (${p.category}, fitness: ${(p.fitness * 100).toFixed(0)}%):\n${p.pattern}`
        ).join('\n\n');

        return `You are an expert AI agent optimizer. Integrate successful patterns into existing genes.

CURRENT GENES:
${genesText}

SUCCESSFUL PATTERNS TO INTEGRATE (from high-performing agents):
${patternsText}

CURRENT PERFORMANCE:
- Quality: ${(context.genome.fitness.quality * 100).toFixed(1)}%
- Success Rate: ${(context.genome.fitness.successRate * 100).toFixed(1)}%
- Token Efficiency: ${(context.genome.fitness.tokenEfficiency * 100).toFixed(1)}%

TASK: Enhance the current genes by intelligently integrating these successful patterns.

GUIDELINES:
1. Preserve core functionality of existing genes
2. Integrate pattern techniques that address weaknesses
3. Maintain clarity and actionability
4. Don't duplicate - merge intelligently
5. Keep each gene focused on its category

Return the enhanced genes in this EXACT format:
---GENE:${genes[0]?.category || 'tool-usage'}---
[Enhanced content here]
---END---

For each gene, use the separator format above.`;
    }

    /**
     * Parse enhanced genes from LLM response
     */
    private parseEnhancedGenes(response: string, originalGenes: OperativeGene[]): OperativeGene[] {
        const enhanced: OperativeGene[] = [];
        const geneMatches = response.matchAll(/---GENE:(\S+)---([\s\S]*?)---END---/g);

        for (const match of geneMatches) {
            const category = match[1];
            const content = match[2].trim();

            // Find original gene with this category
            const original = originalGenes.find(g => g.category === category);

            if (original) {
                enhanced.push({
                    ...original,
                    content,
                    version: (original.version ?? 0) + 1,
                    lastModified: new Date(),
                    mutationHistory: [
                        ...(original.mutationHistory || []),
                        {
                            operation: this.name,
                            timestamp: new Date(),
                            reason: 'Pattern integration from Gene Bank',
                        },
                    ],
                });
            }
        }

        // If parsing failed, return originals
        return enhanced.length > 0 ? enhanced : originalGenes;
    }

    private deepClone(genome: GenomeV2): GenomeV2 {
        return JSON.parse(JSON.stringify(genome));
    }

    private generateId(): string {
        return `mut_pattern_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    private createEmptyMutation(): MutationRecord {
        return {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: '',
            after: '',
            diff: '',
            trigger: 'drift-detected',
            reason: 'No patterns found',
            sandboxTested: false,
            promoted: false,
            proposer: 'system',
        };
    }
}
