/**
 * GenomeBuilder — Parses WrapOptions into a valid Genome object
 *
 * Converts systemPrompt + protect/evolve/adapt into the three-layer
 * chromosome architecture (C0/C1/C2) that PGA uses internally.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { Genome, GeneAllele, GenomeConfig, AutonomousConfig } from '../types/index.js';
import type { GeneCategory } from '../types/GenomeV2.js';
import type { WrapOptions } from './WrapOptions.js';

export class GenomeBuilder {
    /**
     * Build a Genome from WrapOptions.
     *
     * Strategy:
     * 1. If protect/evolve/adapt are explicitly provided, use them directly
     * 2. Otherwise, auto-parse systemPrompt into C0/C1/C2 layers
     */
    static build(options: WrapOptions): Genome {
        const now = new Date();
        const genomeId = `wrap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const layer0 = GenomeBuilder.buildLayer0(options);
        const layer1 = GenomeBuilder.buildLayer1(options);
        const layer2 = GenomeBuilder.buildLayer2(options);

        const autonomous: AutonomousConfig = {
            continuousEvolution: true,
            evolveEveryN: options.evolution?.evolveEveryN ?? 10,
            autoMutateOnDrift: options.evolution?.autoMutateOnDrift ?? true,
            autoCompressOnPressure: options.evolution?.autoCompressOnPressure ?? true,
            enableSwarm: options.evolution?.enableSwarm ?? false,
            enableSelfModel: options.enableSelfModel ?? false,
            enableMetacognition: options.enableMetacognition ?? false,
            enableEmotionalModel: options.enableEmotionalModel ?? false,
            agentPurpose: options.agentPurpose ?? options.systemPrompt.split('\n')[0].slice(0, 200),
        };

        const config: GenomeConfig = {
            enableSandbox: true,
            mutationRate: GenomeBuilder.mapMutationRate(options.evolution?.mode),
            autonomous,
        };

        return {
            id: genomeId,
            name: options.name ?? 'wrapped-agent',
            config,
            layers: { layer0, layer1, layer2 },
            familyId: options.familyId,
            version: 1,
            createdAt: now,
            updatedAt: now,
        };
    }

    /** Build C0 (immutable core) from protect[] or auto-parse */
    static buildLayer0(options: WrapOptions): GeneAllele[] {
        const now = new Date();
        const alleles: GeneAllele[] = [];

        if (options.protect && options.protect.length > 0) {
            for (const [i, rule] of options.protect.entries()) {
                alleles.push({
                    gene: i === 0 ? 'core-identity' : `security-rule-${i}`,
                    variant: 'default',
                    content: rule,
                    fitness: 0.5,
                    status: 'active' as const,
                    createdAt: now,
                });
            }
        } else {
            // Auto-parse: first paragraph → identity, NEVER/ALWAYS → security
            const firstParagraph = options.systemPrompt.split('\n\n')[0] || options.systemPrompt;
            alleles.push({
                gene: 'core-identity',
                variant: 'default',
                content: firstParagraph,
                fitness: 0.5,
                status: 'active' as const,
                createdAt: now,
            });

            const immutablePattern = /^(NEVER|ALWAYS|MUST|DO NOT|FORBIDDEN|PROHIBITED)/i;
            const rules = options.systemPrompt
                .split('\n')
                .filter(l => immutablePattern.test(l.trim()))
                .map(l => l.trim());

            if (rules.length > 0) {
                alleles.push({
                    gene: 'security-gate',
                    variant: 'default',
                    content: rules.join('\n'),
                    fitness: 0.5,
                    status: 'active' as const,
                    createdAt: now,
                });
            }
        }

        // Always ensure at least an ethics gene
        if (alleles.length < 2) {
            alleles.push({
                gene: 'ethics',
                variant: 'default',
                content: 'Be helpful, harmless, and honest. Respect user privacy.',
                fitness: 0.5,
                status: 'active' as const,
                createdAt: now,
            });
        }

        return alleles;
    }

    /** Build C1 (operative genes) from evolve[] or auto-parse */
    static buildLayer1(options: WrapOptions): GeneAllele[] {
        const now = new Date();
        const alleles: GeneAllele[] = [];

        if (options.evolve && options.evolve.length > 0) {
            for (const item of options.evolve) {
                if (typeof item === 'string') {
                    const category = GenomeBuilder.categorizeGene(item);
                    alleles.push({
                        gene: category,
                        variant: 'default',
                        content: item,
                        fitness: 0.5,
                        status: 'active' as const,
                        createdAt: now,
                    });
                } else {
                    alleles.push({
                        gene: item.category,
                        variant: 'default',
                        content: item.content,
                        fitness: 0.5,
                        status: 'active' as const,
                        createdAt: now,
                    });
                }
            }
        } else {
            // Auto-parse: extract operative content from systemPrompt
            const immutablePattern = /^(NEVER|ALWAYS|MUST|DO NOT|FORBIDDEN|PROHIBITED)/i;
            const firstParaEnd = options.systemPrompt.indexOf('\n\n');
            const operativeContent = firstParaEnd > -1
                ? options.systemPrompt.slice(firstParaEnd + 2)
                : '';

            const operativeLines = operativeContent
                .split('\n')
                .filter(l => l.trim().length > 10)
                .filter(l => !immutablePattern.test(l.trim()));

            if (operativeLines.length > 0) {
                const chunks = GenomeBuilder.chunkContent(operativeLines.join('\n'), 3);
                for (const chunk of chunks) {
                    const category = GenomeBuilder.categorizeGene(chunk);
                    alleles.push({
                        gene: category,
                        variant: 'default',
                        content: chunk,
                        fitness: 0.5,
                        status: 'active' as const,
                        createdAt: now,
                    });
                }
            }
        }

        // Ensure at least one operative gene
        if (alleles.length === 0) {
            alleles.push({
                gene: 'reasoning',
                variant: 'default',
                content: 'Think step-by-step and provide clear, accurate responses.',
                fitness: 0.5,
                status: 'active' as const,
                createdAt: now,
            });
        }

        return alleles;
    }

    /** Build C2 (epigenetic adaptations) from adapt[] */
    static buildLayer2(options: WrapOptions): GeneAllele[] {
        const now = new Date();
        const alleles: GeneAllele[] = [];

        if (options.adapt && options.adapt.length > 0) {
            for (const item of options.adapt) {
                if (typeof item === 'string') {
                    alleles.push({
                        gene: `adapt-${item.toLowerCase().replace(/\s+/g, '-')}`,
                        variant: 'default',
                        content: `Adapt ${item} based on user preferences and context.`,
                        fitness: 0.5,
                        status: 'active' as const,
                        createdAt: now,
                    });
                } else {
                    alleles.push({
                        gene: `adapt-${item.trait}`,
                        variant: 'default',
                        content: item.content,
                        fitness: 0.5,
                        status: 'active' as const,
                        createdAt: now,
                    });
                }
            }
        } else {
            alleles.push({
                gene: 'communication-style',
                variant: 'default',
                content: 'Communicate clearly and adapt to user preferences.',
                fitness: 0.5,
                status: 'active' as const,
                createdAt: now,
            });
        }

        return alleles;
    }

    /** Categorize a gene string into one of the 6 GeneCategory values */
    static categorizeGene(content: string): GeneCategory {
        const lower = content.toLowerCase();
        if (/tool|api|function|endpoint|call|invoke/.test(lower)) return 'tool-usage';
        if (/code|program|syntax|debug|implement|refactor/.test(lower)) return 'coding-patterns';
        if (/data|parse|transform|format|csv|json|schema/.test(lower)) return 'data-processing';
        if (/error|exception|retry|fallback|recover|handle/.test(lower)) return 'error-handling';
        if (/tone|style|write|communicate|format.*response|verbose/.test(lower)) return 'communication';
        return 'reasoning';
    }

    /** Chunk content into logical segments */
    private static chunkContent(content: string, maxChunks: number): string[] {
        const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
        if (paragraphs.length <= maxChunks) return paragraphs;
        const result = paragraphs.slice(0, maxChunks - 1);
        result.push(paragraphs.slice(maxChunks - 1).join('\n\n'));
        return result;
    }

    /** Map user-friendly mode to GenomeConfig mutationRate */
    private static mapMutationRate(mode?: string): 'slow' | 'balanced' | 'aggressive' {
        if (mode === 'conservative') return 'slow';
        if (mode === 'aggressive') return 'aggressive';
        return 'balanced';
    }
}
