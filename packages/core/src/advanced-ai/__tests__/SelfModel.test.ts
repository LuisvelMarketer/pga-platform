/**
 * SelfModel Tests — Agent Metacognition
 *
 * Tests for agent self-awareness: identifying strengths,
 * weaknesses, and generating actionable prompt sections.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect } from 'vitest';
import { SelfModel } from '../SelfModel.js';
import type { Genome } from '../../types/index.js';
import type { DriftAnalyzer } from '../../evolution/DriftAnalyzer.js';

// ─── Helpers ────────────────────────────────────────────

function createGenome(alleles: Array<{
    gene: string;
    fitness: number;
    layer?: 1 | 2;
}>): Genome {
    const layer1 = alleles
        .filter(a => (a.layer ?? 1) === 1)
        .map(a => ({
            gene: a.gene,
            variant: 'v1',
            content: `Content for ${a.gene}`,
            fitness: a.fitness,
            sampleCount: 20,
            status: 'active' as const,
            createdAt: new Date(),
        }));

    const layer2 = alleles
        .filter(a => a.layer === 2)
        .map(a => ({
            gene: a.gene,
            variant: 'v1',
            content: `Content for ${a.gene}`,
            fitness: a.fitness,
            sampleCount: 20,
            status: 'active' as const,
            createdAt: new Date(),
        }));

    return {
        id: 'test-genome',
        name: 'Test',
        config: { enableSandbox: true, mutationRate: 'balanced' },
        layers: { layer0: [], layer1, layer2 },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function createMockDriftAnalyzer(isDrifting: boolean = false, signals: Array<{
    type: string;
    severity: string;
    baseline: number;
    current: number;
}> = []): DriftAnalyzer {
    return {
        analyzeDrift: () => ({
            isDrifting,
            signals: signals.map(s => ({
                type: s.type,
                severity: s.severity,
                metric: s.type,
                baselineValue: s.baseline,
                currentValue: s.current,
                percentageChange: ((s.current - s.baseline) / s.baseline) * 100,
                confidence: 0.8,
                timestamp: new Date(),
                recommendation: 'investigate',
            })),
            overallSeverity: signals.length > 0 ? signals[0].severity : 'none',
            recommendation: isDrifting ? 'investigate' : 'none',
        }),
        recordFitness: () => {},
    } as unknown as DriftAnalyzer;
}

// ─── Tests ──────────────────────────────────────────────

describe('SelfModel', () => {
    it('should identify strengths (fitness >= 0.75)', () => {
        const genome = createGenome([
            { gene: 'tool-usage', fitness: 0.85 },
            { gene: 'coding-patterns', fitness: 0.78 },
            { gene: 'communication-style', fitness: 0.60, layer: 2 },
        ]);
        const drift = createMockDriftAnalyzer();
        const model = new SelfModel(genome, drift);

        const assessment = model.assess();

        expect(assessment.strengths).toHaveLength(2);
        expect(assessment.strengths[0].category).toBe('tool-usage');
        expect(assessment.strengths[1].category).toBe('coding-patterns');
        expect(assessment.weaknesses).toHaveLength(0);
        expect(assessment.overallHealth).toBe('thriving');
    });

    it('should identify weaknesses (fitness <= 0.45)', () => {
        const genome = createGenome([
            { gene: 'tool-usage', fitness: 0.40 },
            { gene: 'coding-patterns', fitness: 0.30 },
            { gene: 'communication-style', fitness: 0.80, layer: 2 },
        ]);
        const drift = createMockDriftAnalyzer();
        const model = new SelfModel(genome, drift);

        const assessment = model.assess();

        expect(assessment.weaknesses).toHaveLength(2);
        expect(assessment.weaknesses[0].category).toBe('tool-usage');
        expect(assessment.weaknesses[0].suggestion).toContain('precise tool selection');
        expect(assessment.strengths).toHaveLength(1);
        expect(assessment.overallHealth).toBe('stable');
    });

    it('should include drift warnings in assessment', () => {
        const genome = createGenome([
            { gene: 'tool-usage', fitness: 0.70 },
        ]);
        const drift = createMockDriftAnalyzer(true, [
            { type: 'efficiency-decline', severity: 'moderate', baseline: 0.8, current: 0.6 },
        ]);
        const model = new SelfModel(genome, drift);

        const assessment = model.assess();

        expect(assessment.driftWarnings).toHaveLength(1);
        expect(assessment.driftWarnings[0].dimension).toBe('efficiency-decline');
        expect(assessment.driftWarnings[0].severity).toBe('moderate');
    });

    it('should generate prompt section when weaknesses exist', () => {
        const genome = createGenome([
            { gene: 'tool-usage', fitness: 0.85 },
            { gene: 'coding-patterns', fitness: 0.35 },
        ]);
        const drift = createMockDriftAnalyzer();
        const model = new SelfModel(genome, drift);

        const section = model.toPromptSection();

        expect(section).not.toBeNull();
        expect(section).toContain('Self-Awareness');
        expect(section).toContain('Strengths');
        expect(section).toContain('Areas to improve');
        expect(section).toContain('coding-patterns');
    });

    it('should return null prompt section when all genes are stable', () => {
        const genome = createGenome([
            { gene: 'tool-usage', fitness: 0.65 },
            { gene: 'coding-patterns', fitness: 0.60 },
        ]);
        const drift = createMockDriftAnalyzer();
        const model = new SelfModel(genome, drift);

        const section = model.toPromptSection();

        // No weaknesses, no drift → null
        expect(section).toBeNull();
    });
});
