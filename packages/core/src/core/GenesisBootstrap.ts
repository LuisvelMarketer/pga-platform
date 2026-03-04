/**
 * GenesisBootstrap — Seed new genomes with proven genes from Gene Bank
 *
 * Instead of starting with generic defaults (fitness 0.5), new agents
 * are bootstrapped with high-fitness genes that other agents have already
 * validated through real-world usage.
 *
 * Bridges Gene Bank's CognitiveGene → Genome's GeneAllele format.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import type { Genome, GeneAllele } from '../types/index.js';
import type { GeneBank } from '../gene-bank/GeneBank.js';
import type { CognitiveGene, GeneType } from '../gene-bank/CognitiveGene.js';

export interface BootstrapResult {
    genesUpgraded: number;
    genesSkipped: number;
    upgrades: Array<{ gene: string; source: string; fitness: number }>;
}

/**
 * Map genome gene categories to Gene Bank gene types.
 */
const CATEGORY_TO_GENE_TYPE: Record<string, GeneType[]> = {
    'tool-usage': ['tool-usage-pattern'],
    'coding-patterns': ['reasoning-pattern', 'multi-step-workflow'],
    'communication-style': ['communication-pattern'],
};

export class GenesisBootstrap {
    constructor(private geneBank: GeneBank) {}

    /**
     * Upgrade a freshly created genome with high-fitness genes from the Gene Bank.
     *
     * For each Layer 1 gene category, searches Gene Bank for matching genes
     * and replaces the default content if a high-fitness match is found.
     */
    async bootstrap(genome: Genome, minFitness: number = 0.7): Promise<BootstrapResult> {
        const result: BootstrapResult = {
            genesUpgraded: 0,
            genesSkipped: 0,
            upgrades: [],
        };

        const activeLayer1 = genome.layers.layer1.filter(a => a.status === 'active');

        for (const allele of activeLayer1) {
            const geneTypes = CATEGORY_TO_GENE_TYPE[allele.gene];
            if (!geneTypes) {
                result.genesSkipped++;
                continue;
            }

            try {
                const candidates = await this.geneBank.searchGenes({
                    type: geneTypes,
                    minFitness,
                    sortBy: 'fitness',
                    sortOrder: 'desc',
                    limit: 1,
                });

                if (candidates.length === 0) {
                    result.genesSkipped++;
                    continue;
                }

                const bestGene = candidates[0];
                this.applyGeneToAllele(allele, bestGene);

                result.genesUpgraded++;
                result.upgrades.push({
                    gene: allele.gene,
                    source: bestGene.name,
                    fitness: bestGene.fitness.overallFitness,
                });
            } catch {
                // Gene Bank search failed — keep default
                result.genesSkipped++;
            }
        }

        // Also bootstrap Layer 2 genes
        const activeLayer2 = genome.layers.layer2.filter(a => a.status === 'active');
        for (const allele of activeLayer2) {
            const geneTypes = CATEGORY_TO_GENE_TYPE[allele.gene];
            if (!geneTypes) {
                result.genesSkipped++;
                continue;
            }

            try {
                const candidates = await this.geneBank.searchGenes({
                    type: geneTypes,
                    minFitness,
                    sortBy: 'fitness',
                    sortOrder: 'desc',
                    limit: 1,
                });

                if (candidates.length === 0) {
                    result.genesSkipped++;
                    continue;
                }

                const bestGene = candidates[0];
                this.applyGeneToAllele(allele, bestGene);

                result.genesUpgraded++;
                result.upgrades.push({
                    gene: allele.gene,
                    source: bestGene.name,
                    fitness: bestGene.fitness.overallFitness,
                });
            } catch {
                result.genesSkipped++;
            }
        }

        return result;
    }

    /**
     * Apply a CognitiveGene's content and fitness to a GeneAllele.
     */
    private applyGeneToAllele(allele: GeneAllele, gene: CognitiveGene): void {
        // Bridge: CognitiveGene.content.instruction → GeneAllele.content
        let content = gene.content.instruction;

        // Include examples if available
        if (gene.content.examples && gene.content.examples.length > 0) {
            content += '\n\nExamples:\n' + gene.content.examples
                .map(e => `- ${e.scenario}: ${e.expectedBehavior}`)
                .join('\n');
        }

        allele.content = content;
        allele.fitness = gene.fitness.overallFitness;
        allele.variant = `bootstrap_${gene.id.slice(0, 8)}`;
    }
}
