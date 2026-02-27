/**
 * PromptAssembler — Assembles prompts from three-layer genome
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Handles Layer 0 (Immutable) + Layer 1 (Operative) + Layer 2 (Epigenome)
 * selection and assembly into final system prompt.
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { Genome, SelectionContext } from '../types/index.js';
import { ContextMemory } from './ContextMemory.js';
import { ProactiveSuggestions } from './ProactiveSuggestions.js';

export class PromptAssembler {
    private contextMemory: ContextMemory;
    private proactiveSuggestions: ProactiveSuggestions;

    constructor(
        storage: StorageAdapter,
        private genome: Genome,
    ) {
        this.contextMemory = new ContextMemory(storage);
        this.proactiveSuggestions = new ProactiveSuggestions(storage);
    }

    /**
     * Assemble full prompt from all three layers + intelligence boost
     */
    async assemblePrompt(context?: SelectionContext, currentMessage?: string): Promise<string> {
        const sections: string[] = [];

        // Layer 0: Immutable DNA (security, core identity, ethics)
        for (const allele of this.genome.layers.layer0) {
            if (allele.status === 'active') {
                sections.push(allele.content);
            }
        }

        // Layer 1: Operative Genes (tool usage, coding patterns, etc.)
        const layer1Content = await this.selectBestFromLayer(1, context);
        sections.push(...layer1Content);

        // Layer 2: Epigenomes (user preferences, communication style, etc.)
        const layer2Content = await this.selectBestFromLayer(2, context);
        sections.push(...layer2Content);

        // 🧠 INTELLIGENCE BOOST: Add context memory (if user provided)
        if (context?.userId) {
            const memoryPrompt = await this.contextMemory.getMemoryPrompt(
                context.userId,
                this.genome.id,
            );
            if (memoryPrompt) {
                sections.push(memoryPrompt);
            }

            // 🚀 PROACTIVE SUGGESTIONS: Add intelligent suggestions
            if (currentMessage) {
                const suggestions = await this.proactiveSuggestions.generateSuggestions(
                    context.userId,
                    this.genome.id,
                    currentMessage,
                );

                if (suggestions.length > 0) {
                    const suggestionsPrompt =
                        this.proactiveSuggestions.formatSuggestionsPrompt(suggestions);
                    sections.push(suggestionsPrompt);
                }
            }
        }

        return sections.join('\n\n---\n\n');
    }

    /**
     * Select best alleles from a specific layer using epsilon-greedy
     */
    private async selectBestFromLayer(
        layer: 1 | 2,
        _context?: SelectionContext,
    ): Promise<string[]> {
        const alleles = layer === 1 ? this.genome.layers.layer1 : this.genome.layers.layer2;
        const active = alleles.filter(a => a.status === 'active');

        if (active.length === 0) return [];

        // Group by gene
        const byGene = new Map<string, typeof active>();
        for (const allele of active) {
            if (!byGene.has(allele.gene)) {
                byGene.set(allele.gene, []);
            }
            byGene.get(allele.gene)!.push(allele);
        }

        // Select best variant for each gene
        const selected: string[] = [];
        for (const [_gene, variants] of byGene) {
            const best = this.selectByEpsilonGreedy(
                variants,
                this.genome.config.epsilonExplore || 0.1,
            );
            selected.push(best.content);
        }

        return selected;
    }

    /**
     * Epsilon-greedy selection: exploit best with probability (1-ε), explore random with probability ε
     */
    private selectByEpsilonGreedy<T extends { fitness: number }>(
        candidates: T[],
        epsilon: number,
    ): T {
        if (candidates.length === 0) {
            throw new Error('Cannot select from empty candidates');
        }

        if (candidates.length === 1) {
            return candidates[0];
        }

        // Sort by fitness descending
        const sorted = [...candidates].sort((a, b) => b.fitness - a.fitness);

        // With probability epsilon, explore (select random non-best)
        if (Math.random() < epsilon) {
            const nonBest = sorted.slice(1);
            if (nonBest.length > 0) {
                return nonBest[Math.floor(Math.random() * nonBest.length)];
            }
        }

        // Exploit: select best
        return sorted[0];
    }
}
