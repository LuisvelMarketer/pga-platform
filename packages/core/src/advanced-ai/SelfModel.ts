/**
 * SelfModel — Agent Metacognition & Self-Awareness
 *
 * Builds a real-time model of the agent's strengths and weaknesses
 * per gene category by analyzing fitness scores and drift signals.
 * Generates a self-awareness prompt section when actionable insight exists.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import type { Genome } from '../types/index.js';
import type { DriftAnalyzer } from '../evolution/DriftAnalyzer.js';

const STRENGTH_THRESHOLD = 0.75;
const WEAKNESS_THRESHOLD = 0.45;

export interface SelfAssessment {
    strengths: Array<{ category: string; confidence: number; basis: string }>;
    weaknesses: Array<{ category: string; confidence: number; suggestion: string }>;
    driftWarnings: Array<{ dimension: string; severity: string; trend: string }>;
    overallHealth: 'thriving' | 'stable' | 'struggling';
    lastAssessed: Date;
}

/**
 * Suggestions for improving each gene category.
 */
const IMPROVEMENT_SUGGESTIONS: Record<string, string> = {
    'tool-usage': 'try using more precise tool selection for each task',
    'coding-patterns': 'focus on writing cleaner, more maintainable code',
    'communication-style': 'try being more concise and direct',
};

export class SelfModel {
    constructor(
        private genome: Genome,
        private driftAnalyzer: DriftAnalyzer,
    ) {}

    /**
     * Assess current strengths and weaknesses by analyzing
     * per-gene fitness scores and drift signals.
     */
    assess(): SelfAssessment {
        const strengths: SelfAssessment['strengths'] = [];
        const weaknesses: SelfAssessment['weaknesses'] = [];

        // Analyze all active alleles across Layer 1 and Layer 2
        const allActive = [
            ...this.genome.layers.layer1.filter(a => a.status === 'active'),
            ...this.genome.layers.layer2.filter(a => a.status === 'active'),
        ];

        for (const allele of allActive) {
            if (allele.fitness >= STRENGTH_THRESHOLD) {
                strengths.push({
                    category: allele.gene,
                    confidence: allele.fitness,
                    basis: `fitness ${allele.fitness.toFixed(2)} with ${allele.sampleCount || 0} samples`,
                });
            } else if (allele.fitness <= WEAKNESS_THRESHOLD) {
                weaknesses.push({
                    category: allele.gene,
                    confidence: allele.fitness,
                    suggestion: IMPROVEMENT_SUGGESTIONS[allele.gene] || 'needs improvement',
                });
            }
        }

        // Get drift warnings
        const driftWarnings: SelfAssessment['driftWarnings'] = [];
        const driftAnalysis = this.driftAnalyzer.analyzeDrift();

        if (driftAnalysis.isDrifting) {
            for (const signal of driftAnalysis.signals) {
                driftWarnings.push({
                    dimension: signal.type,
                    severity: signal.severity,
                    trend: `declining from ${signal.baselineValue.toFixed(2)} to ${signal.currentValue.toFixed(2)}`,
                });
            }
        }

        // Compute overall health
        const avgFitness = allActive.length > 0
            ? allActive.reduce((sum, a) => sum + a.fitness, 0) / allActive.length
            : 0.5;

        const overallHealth: SelfAssessment['overallHealth'] =
            avgFitness >= 0.65 ? 'thriving' :
            avgFitness >= 0.45 ? 'stable' : 'struggling';

        return {
            strengths,
            weaknesses,
            driftWarnings,
            overallHealth,
            lastAssessed: new Date(),
        };
    }

    /**
     * Generate a prompt section that gives the agent self-awareness.
     * Only included when there's actionable insight (weaknesses or drift).
     */
    toPromptSection(): string | null {
        const assessment = this.assess();

        // Only generate section when there's something actionable
        const hasWeaknesses = assessment.weaknesses.length > 0;
        const hasDrift = assessment.driftWarnings.length > 0;

        if (!hasWeaknesses && !hasDrift) {
            return null;
        }

        const lines: string[] = ['## Self-Awareness'];

        if (assessment.strengths.length > 0) {
            const strengthList = assessment.strengths
                .map(s => `${s.category} (${s.confidence.toFixed(2)})`)
                .join(', ');
            lines.push(`**Strengths:** ${strengthList}`);
        }

        if (hasWeaknesses) {
            const weakList = assessment.weaknesses
                .map(w => `${w.category} (${w.confidence.toFixed(2)}) — ${w.suggestion}`)
                .join(', ');
            lines.push(`**Areas to improve:** ${weakList}`);
        }

        if (hasDrift) {
            const driftList = assessment.driftWarnings
                .map(d => `${d.dimension} (${d.severity})`)
                .join(', ');
            lines.push(`**Active concerns:** ${driftList}`);
        }

        return lines.join('\n');
    }
}
