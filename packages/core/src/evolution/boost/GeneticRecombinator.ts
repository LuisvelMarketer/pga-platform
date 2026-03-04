/**
 * Genetic Recombinator - Intelligent Gene Combination
 *
 * Combines successful genes from multiple genomes to create superior offspring.
 * Uses LLM-powered intelligent merging (not just simple crossover).
 *
 * Key Features:
 * - Analyzes gene compatibility
 * - Intelligently merges complementary genes
 * - Preserves best traits from each parent
 * - Creates synergistic combinations
 *
 * This is sexual reproduction with intelligence!
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0 - Evolution Boost
 */

import type { GenomeV2, OperativeGene, GeneCategory, FitnessVector } from '../../types/GenomeV2.js';
import type { LLMAdapter } from '../../interfaces/LLMAdapter.js';
import { generateText } from './utils/llmHelper.js';

/**
 * Parent genome for recombination
 */
export interface RecombinationParent {
    genome: GenomeV2;
    fitness: number;
    strengths: string[]; // What this genome does well
}

/**
 * Recombination result
 */
export interface RecombinationResult {
    offspring: GenomeV2;
    inheritanceMap: Map<string, string>; // gene category → parent ID
    summary: string;
    expectedImprovement: number;
}

/**
 * Genetic Recombinator
 *
 * Intelligently combines genes from multiple high-fitness parents.
 */
export class GeneticRecombinator {
    constructor(private llm?: LLMAdapter) {}

    /**
     * Recombine multiple parent genomes into superior offspring
     */
    async recombine(parents: RecombinationParent[]): Promise<RecombinationResult> {
        if (parents.length < 2) {
            throw new Error('Need at least 2 parents for recombination');
        }

        // Sort parents by fitness (best first)
        const sortedParents = [...parents].sort((a, b) => b.fitness - a.fitness);

        // Use LLM for intelligent recombination if available
        if (this.llm) {
            return await this.intelligentRecombination(sortedParents);
        }

        // Fallback: simple best-gene selection
        return this.simpleRecombination(sortedParents);
    }

    /**
     * Intelligent recombination using LLM
     */
    private async intelligentRecombination(
        parents: RecombinationParent[]
    ): Promise<RecombinationResult> {
        // Build recombination prompt
        const prompt = this.buildRecombinationPrompt(parents);

        const response = await generateText(this.llm!, {
            prompt,
            temperature: 0.6,
            maxTokens: 2000,
        });

        // Parse offspring genes from response
        const { genes, inheritanceMap } = this.parseRecombinationResult(response.content, parents);

        // Create offspring genome
        const offspring = this.createOffspring(parents[0].genome, genes);

        // Estimate improvement
        const avgParentFitness = parents.reduce((sum, p) => sum + p.fitness, 0) / parents.length;
        const expectedImprovement = Math.min(0.35, avgParentFitness * 0.4);

        return {
            offspring,
            inheritanceMap,
            summary: `Recombined ${parents.length} parents using intelligent gene merging`,
            expectedImprovement,
        };
    }

    /**
     * Build prompt for LLM-powered recombination
     */
    private buildRecombinationPrompt(parents: RecombinationParent[]): string {
        const parentsText = parents.map((p, i) => {
            const genesText = p.genome.chromosomes.c1.operations
                .map(g => `  - ${g.category}: ${g.content.substring(0, 200)}...`)
                .join('\n');

            return `PARENT ${i + 1} (Fitness: ${(p.fitness * 100).toFixed(0)}%):
Strengths: ${p.strengths.join(', ')}
Genes:
${genesText}`;
        }).join('\n\n');

        return `You are an expert genetic engineer for AI agents. Combine the best genes from multiple parents.

${parentsText}

TASK: Create an offspring that inherits the BEST traits from each parent.

GUIDELINES:
1. For each gene category, select the best version from any parent
2. If multiple parents excel in the same area, intelligently merge their approaches
3. Preserve complementary strengths
4. Eliminate weaknesses
5. Create synergies where genes work better together

Return the offspring genes in this format:
---GENE:tool-usage---
[Content from best parent or intelligent merge]
[SOURCE: Parent 1] or [SOURCE: Merge of Parent 1 & 2]
---END---

(Continue for all gene categories)

At the end, add:
---SUMMARY---
Brief explanation of inheritance decisions
---END---`;
    }

    /**
     * Parse LLM recombination result
     */
    private parseRecombinationResult(
        response: string,
        parents: RecombinationParent[]
    ): {
        genes: OperativeGene[];
        inheritanceMap: Map<string, string>;
    } {
        const genes: OperativeGene[] = [];
        const inheritanceMap = new Map<string, string>();

        const geneMatches = response.matchAll(/---GENE:(\S+)---([\s\S]*?)---END---/g);

        for (const match of geneMatches) {
            const category = match[1];
            const fullContent = match[2].trim();

            // Extract source parent
            const sourceMatch = fullContent.match(/\[SOURCE:\s*([^\]]+)\]/i);
            const source = sourceMatch ? sourceMatch[1].trim() : 'Parent 1';

            // Remove source annotation from content
            const content = fullContent.replace(/\[SOURCE:[^\]]+\]/gi, '').trim();

            // Find original gene from any parent
            const originalGene = this.findOriginalGene(category, parents);

            const defaultFitness: FitnessVector = {
                quality: 0.5, successRate: 0.5, tokenEfficiency: 0.5,
                latency: 1000, costPerSuccess: 0.01, interventionRate: 0.1,
                composite: 0.5, sampleSize: 0, lastUpdated: new Date(), confidence: 0,
            };

            genes.push({
                id: originalGene?.id || `gene_${category}_${Date.now()}`,
                category: category as GeneCategory,
                content,
                fitness: originalGene?.fitness || defaultFitness,
                origin: 'mutation',
                usageCount: originalGene?.usageCount || 0,
                lastUsed: new Date(),
                successRate: originalGene?.successRate || 0.5,
                version: (originalGene?.version ?? 0) + 1,
                lastModified: new Date(),
                mutationHistory: [
                    ...(originalGene?.mutationHistory || []),
                    {
                        operation: 'genetic_recombination',
                        timestamp: new Date(),
                        reason: `Recombined from ${source}`,
                    },
                ],
            });

            inheritanceMap.set(category, source);
        }

        return { genes, inheritanceMap };
    }

    /**
     * Find original gene from parents
     */
    private findOriginalGene(
        category: string,
        parents: RecombinationParent[]
    ): OperativeGene | null {
        for (const parent of parents) {
            const gene = parent.genome.chromosomes.c1.operations.find(
                g => g.category === category
            );
            if (gene) return gene;
        }
        return null;
    }

    /**
     * Simple recombination (fallback without LLM)
     */
    private simpleRecombination(parents: RecombinationParent[]): RecombinationResult {
        const genes: OperativeGene[] = [];
        const inheritanceMap = new Map<string, string>();

        // Get all unique gene categories
        const categories = new Set<string>();
        for (const parent of parents) {
            for (const gene of parent.genome.chromosomes.c1.operations) {
                categories.add(gene.category);
            }
        }

        // For each category, select best gene
        for (const category of categories) {
            let bestGene: OperativeGene | null = null;
            let bestParentId = '';
            let bestFitness = -1;

            for (const parent of parents) {
                const gene = parent.genome.chromosomes.c1.operations.find(
                    g => g.category === category
                );

                if (gene && parent.fitness > bestFitness) {
                    bestGene = gene;
                    bestParentId = parent.genome.id;
                    bestFitness = parent.fitness;
                }
            }

            if (bestGene) {
                genes.push({
                    ...bestGene,
                    version: (bestGene.version ?? 0) + 1,
                    lastModified: new Date(),
                });
                inheritanceMap.set(category, bestParentId);
            }
        }

        // Create offspring
        const offspring = this.createOffspring(parents[0].genome, genes);

        const avgParentFitness = parents.reduce((sum, p) => sum + p.fitness, 0) / parents.length;
        const expectedImprovement = avgParentFitness * 0.2; // Conservative estimate

        return {
            offspring,
            inheritanceMap,
            summary: `Selected best genes from ${parents.length} parents (simple recombination)`,
            expectedImprovement,
        };
    }

    /**
     * Create offspring genome
     */
    private createOffspring(template: GenomeV2, genes: OperativeGene[]): GenomeV2 {
        return {
            ...template,
            id: `offspring_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            chromosomes: {
                ...template.chromosomes,
                c1: {
                    ...template.chromosomes.c1,
                    operations: genes,
                },
            },
            version: template.version + 1,
            createdAt: new Date(),
        };
    }

    /**
     * Analyze gene compatibility
     *
     * Some genes work well together, others conflict
     */
    analyzeCompatibility(gene1: OperativeGene, gene2: OperativeGene): number {
        // Simple heuristic: genes in same category are less compatible
        // (choose one or the other, not both)
        if (gene1.category === gene2.category) {
            return 0.3; // Low compatibility
        }

        // Complementary categories are highly compatible
        const complementary: Record<string, string[]> = {
            'tool-usage': ['reasoning', 'error-handling'],
            'reasoning': ['tool-usage', 'data-processing'],
            'communication': ['reasoning', 'coding-patterns'],
        };

        const comp1 = complementary[gene1.category] || [];
        if (comp1.includes(gene2.category)) {
            return 0.9; // High compatibility
        }

        // Default: moderate compatibility
        return 0.6;
    }
}
