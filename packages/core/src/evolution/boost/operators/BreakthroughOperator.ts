/**
 * Breakthrough Operator - RADICAL INNOVATION
 *
 * Generates radical mutations that can produce breakthrough improvements.
 * Expected improvement: 60-80% (highest risk, highest reward!)
 *
 * Strategy:
 * - Analyzes current genome comprehensively
 * - Identifies fundamental limitations
 * - Uses LLM self-reflection to propose radical redesign
 * - Creates completely new approaches to solving problems
 *
 * This is the "hail mary" mutation - high risk but can produce 10x improvements!
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

import type { LLMAdapter } from '../../../interfaces/LLMAdapter.js';
import type { GeneCategory, FitnessVector } from '../../../types/GenomeV2.js';
import { generateText } from '../utils/llmHelper.js';

/**
 * Breakthrough Operator
 *
 * MOST AGGRESSIVE mutation that uses deep LLM reflection to propose
 * radical redesigns that can produce breakthrough improvements.
 *
 * Use sparingly - this is high-risk, high-reward!
 */
export class BreakthroughOperator implements IMutationOperator {
    name: MutationType = 'breakthrough';
    description = 'Radical redesign using deep LLM reflection';
    targetChromosome: 'c1' = 'c1';

    constructor(private llm: LLMAdapter) {}

    async mutate(context: MutationContext): Promise<MutationResult> {
        // Perform deep analysis of current genome
        const analysis = await this.analyzeGenome(context);

        // Generate radical redesign
        const redesign = await this.generateBreakthrough(context, analysis);

        // Create mutant with redesigned genes
        const mutant = this.deepClone(context.genome);
        mutant.chromosomes.c1.operations = redesign.genes;

        // Create mutation record
        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: JSON.stringify(context.genome.chromosomes.c1),
            after: JSON.stringify(mutant.chromosomes.c1),
            diff: redesign.summary,
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
            description: redesign.summary,
            expectedImprovement: redesign.expectedImprovement,
        };
    }

    estimateImprovement(context: MutationContext): number {
        // Breakthrough is most valuable when:
        // 1. Current fitness is low (lots of room for improvement)
        // 2. Recent mutations haven't helped much

        const fitness = context.genome.fitness;
        const currentFitness = fitness.composite;

        // If fitness is low, breakthrough can help a lot
        if (currentFitness < 0.5) {
            return 0.80; // 80% improvement possible!
        } else if (currentFitness < 0.7) {
            return 0.60; // 60% improvement
        } else {
            return 0.40; // Still 40% even with decent fitness
        }
    }

    /**
     * Deep analysis of current genome
     */
    private async analyzeGenome(context: MutationContext): Promise<{
        strengths: string[];
        weaknesses: string[];
        rootCauses: string[];
        opportunities: string[];
    }> {
        const analysisPrompt = this.buildAnalysisPrompt(context);

        const response = await generateText(this.llm, {
            prompt: analysisPrompt,
            temperature: 0.3, // Lower temp for analysis
            maxTokens: 1500,
        });

        return this.parseAnalysis(response.content);
    }

    /**
     * Build deep analysis prompt
     */
    private buildAnalysisPrompt(context: MutationContext): string {
        const genes = context.genome.chromosomes.c1.operations
            .map((g, i) => `${i + 1}. ${g.category}:\n${g.content}`)
            .join('\n\n');

        return `You are an expert AI agent architect. Perform a DEEP analysis of this agent's genome.

CURRENT GENOME:
${genes}

PERFORMANCE METRICS:
- Quality: ${(context.genome.fitness.quality * 100).toFixed(1)}%
- Success Rate: ${(context.genome.fitness.successRate * 100).toFixed(1)}%
- Token Efficiency: ${(context.genome.fitness.tokenEfficiency * 100).toFixed(1)}%
- Latency: ${context.genome.fitness.latency}ms
- Intervention Rate: ${(context.genome.fitness.interventionRate * 100).toFixed(1)}%
- Cost Per Success: $${context.genome.fitness.costPerSuccess.toFixed(4)}

CONTEXT: ${context.reason}

TASK: Analyze this genome comprehensively:

1. STRENGTHS: What's working well?
2. WEAKNESSES: What's limiting performance?
3. ROOT CAUSES: Why are these weaknesses happening?
4. OPPORTUNITIES: What radical changes could 10x performance?

Format your response as:
STRENGTHS:
- [strength 1]
- [strength 2]

WEAKNESSES:
- [weakness 1]
- [weakness 2]

ROOT_CAUSES:
- [root cause 1]
- [root cause 2]

OPPORTUNITIES:
- [opportunity 1]
- [opportunity 2]`;
    }

    /**
     * Parse analysis response
     */
    private parseAnalysis(response: string): {
        strengths: string[];
        weaknesses: string[];
        rootCauses: string[];
        opportunities: string[];
    } {
        const sections = {
            strengths: this.extractSection(response, 'STRENGTHS'),
            weaknesses: this.extractSection(response, 'WEAKNESSES'),
            rootCauses: this.extractSection(response, 'ROOT_CAUSES'),
            opportunities: this.extractSection(response, 'OPPORTUNITIES'),
        };

        return sections;
    }

    /**
     * Extract bulleted section from response
     */
    private extractSection(response: string, sectionName: string): string[] {
        const regex = new RegExp(`${sectionName}:([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, 'i');
        const match = response.match(regex);

        if (!match) return [];

        const content = match[1];
        const items = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('-'))
            .map(line => line.substring(1).trim());

        return items;
    }

    /**
     * Generate breakthrough redesign
     */
    private async generateBreakthrough(
        context: MutationContext,
        analysis: {
            strengths: string[];
            weaknesses: string[];
            rootCauses: string[];
            opportunities: string[];
        }
    ): Promise<{
        genes: OperativeGene[];
        summary: string;
        expectedImprovement: number;
    }> {
        const breakthroughPrompt = this.buildBreakthroughPrompt(context, analysis);

        const response = await generateText(this.llm, {
            prompt: breakthroughPrompt,
            temperature: 0.8, // Higher temp for creativity!
            maxTokens: 2500,
        });

        return this.parseBreakthrough(response.content, context);
    }

    /**
     * Build breakthrough redesign prompt
     */
    private buildBreakthroughPrompt(
        context: MutationContext,
        analysis: {
            strengths: string[];
            weaknesses: string[];
            rootCauses: string[];
            opportunities: string[];
        }
    ): string {
        const currentGenes = context.genome.chromosomes.c1.operations;

        return `You are a visionary AI agent architect. Design a BREAKTHROUGH redesign.

CURRENT PERFORMANCE:
- Quality: ${(context.genome.fitness.quality * 100).toFixed(1)}%
- Success Rate: ${(context.genome.fitness.successRate * 100).toFixed(1)}%
- Token Efficiency: ${(context.genome.fitness.tokenEfficiency * 100).toFixed(1)}%

ANALYSIS:
Strengths: ${analysis.strengths.join(', ')}
Weaknesses: ${analysis.weaknesses.join(', ')}
Root Causes: ${analysis.rootCauses.join(', ')}
Opportunities: ${analysis.opportunities.join(', ')}

TASK: Design a RADICAL redesign that addresses root causes and seizes opportunities.

GUIDELINES:
1. Think BIG - aim for 2-10x improvement
2. Don't be conservative - this is breakthrough time
3. Leverage the opportunities identified
4. Address root causes fundamentally
5. Keep what works (strengths)
6. Be bold and innovative

CATEGORIES TO REDESIGN:
${currentGenes.map(g => `- ${g.category}`).join('\n')}

Return redesigned genes in this format:
---GENE:tool-usage---
[Radically improved content]
---END---

---GENE:reasoning---
[Radically improved content]
---END---

(Continue for all categories)

After all genes, add:
---SUMMARY---
[Brief summary of breakthrough changes and expected improvement]
---END---`;
    }

    /**
     * Parse breakthrough redesign
     */
    private parseBreakthrough(
        response: string,
        context: MutationContext
    ): {
        genes: OperativeGene[];
        summary: string;
        expectedImprovement: number;
    } {
        const genes: OperativeGene[] = [];
        const geneMatches = response.matchAll(/---GENE:(\S+)---([\s\S]*?)---END---/g);

        for (const match of geneMatches) {
            const category = match[1];
            const content = match[2].trim();

            // Find original gene to preserve metadata
            const original = context.genome.chromosomes.c1.operations.find(
                g => g.category === category
            );

            const defaultFitness: FitnessVector = {
                quality: 0.5, successRate: 0.5, tokenEfficiency: 0.5,
                latency: 1000, costPerSuccess: 0.01, interventionRate: 0.1,
                composite: 0.5, sampleSize: 0, lastUpdated: new Date(), confidence: 0,
            };

            genes.push({
                id: original?.id || `gene_${category}_${Date.now()}`,
                category: category as GeneCategory,
                content,
                fitness: original?.fitness || defaultFitness,
                origin: 'mutation',
                usageCount: original?.usageCount || 0,
                lastUsed: new Date(),
                successRate: original?.successRate || 0.5,
                version: (original?.version ?? 0) + 1,
                lastModified: new Date(),
                mutationHistory: [
                    ...(original?.mutationHistory || []),
                    {
                        operation: this.name,
                        timestamp: new Date(),
                        reason: 'Breakthrough redesign',
                    },
                ],
            });
        }

        // Extract summary
        const summaryMatch = response.match(/---SUMMARY---([\s\S]*?)---END---/);
        const summary = summaryMatch ? summaryMatch[1].trim() : 'Radical breakthrough redesign';

        // Estimate improvement based on current fitness gap
        const currentFitness = context.genome.fitness.composite;
        const gap = 1 - currentFitness;
        const expectedImprovement = 0.60 + (gap * 0.20); // 60-80%

        return {
            genes: genes.length > 0 ? genes : context.genome.chromosomes.c1.operations,
            summary,
            expectedImprovement,
        };
    }

    private deepClone(genome: GenomeV2): GenomeV2 {
        return JSON.parse(JSON.stringify(genome));
    }

    private generateId(): string {
        return `mut_breakthrough_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}
