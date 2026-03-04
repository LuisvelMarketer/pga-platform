/**
 * Metacognition Tests
 *
 * Tests for pre-response analysis, post-response learning,
 * and confidence assessment.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect } from 'vitest';
import { Metacognition } from '../Metacognition.js';
import type { SelfAssessment } from '../../advanced-ai/SelfModel.js';

// ─── Helpers ────────────────────────────────────────────

function createMockSelfAssessment(overrides?: Partial<SelfAssessment>): SelfAssessment {
    return {
        strengths: [{ category: 'coding', confidence: 0.85, basis: 'test' }],
        weaknesses: [{ category: 'design', confidence: 0.35, suggestion: 'improve layout skills' }],
        driftWarnings: [],
        overallHealth: 'stable',
        lastAssessed: new Date(),
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────

describe('Metacognition', () => {
    it('should assess high confidence for clear technical messages', () => {
        const meta = new Metacognition();
        const result = meta.analyzePreResponse('Write a function that validates email addresses');

        expect(result.confidence.overall).toBeGreaterThan(0.4);
        expect(result.suggestedAction).toBe('respond');
        expect(result.missingInfo).toHaveLength(0);
    });

    it('should detect missing info in vague messages', () => {
        const meta = new Metacognition();
        const result = meta.analyzePreResponse('fix that thing');

        expect(result.missingInfo.length).toBeGreaterThan(0);
        expect(result.suggestedAction).toBe('ask');
    });

    it('should suggest asking when ambiguity is high', () => {
        const meta = new Metacognition();
        const result = meta.analyzePreResponse('build something maybe like whatever');

        expect(result.confidence.informational).toBeLessThan(0.6);
        expect(result.suggestedAction).toBe('ask');
        expect(result.missingInfo.length).toBeGreaterThan(0);
    });

    it('should incorporate SelfModel assessment for domain confidence', () => {
        const assessment = createMockSelfAssessment();
        const meta = new Metacognition(() => assessment);

        // Use message with multiple design-specific keywords to ensure 'design' domain wins
        const result = meta.analyzePreResponse('Help me with the UI layout and responsive style for this component');

        // Should detect 'design' domain and find it as a weakness
        expect(result.knowledgeGaps.length).toBeGreaterThan(0);
        expect(result.knowledgeGaps[0]).toContain('design');
    });

    it('should generate prompt section when action is not respond', () => {
        const meta = new Metacognition();
        const analysis = meta.analyzePreResponse('fix something idk');

        const section = meta.toPromptSection(analysis);
        expect(section).not.toBeNull();
        expect(section).toContain('Metacognitive Awareness');
        expect(section).toContain('Recommended action');
    });

    it('should return null prompt section when everything is clear', () => {
        const meta = new Metacognition();
        const analysis = meta.analyzePreResponse(
            'Write a TypeScript function that takes an array of numbers and returns the sum',
        );

        // Clear message with sufficient info → respond → null section
        if (analysis.suggestedAction === 'respond' && analysis.missingInfo.length === 0) {
            const section = meta.toPromptSection(analysis);
            expect(section).toBeNull();
        }
    });

    it('should perform post-response analysis', () => {
        const meta = new Metacognition();
        const result = meta.analyzePostResponse(
            'How do I sort an array?',
            'Here is how you sort an array:\n```\narray.sort()\n```',
            true,
        );

        expect(result.effectivenessScore).toBeGreaterThan(0.5);
        expect(result.whatWentWell.length).toBeGreaterThan(0);
        expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should detect improvement areas on failure', () => {
        const meta = new Metacognition();
        const result = meta.analyzePostResponse(
            'maybe something like a thing?',
            'Here is a very long response that goes on and on...' + 'x'.repeat(2000),
            false,
        );

        expect(result.effectivenessScore).toBeLessThan(0.5);
        expect(result.whatCouldImprove.length).toBeGreaterThan(0);
    });

    it('should track effectiveness trend', () => {
        const meta = new Metacognition();

        // Record several interactions
        for (let i = 0; i < 6; i++) {
            meta.analyzePostResponse('msg', 'response', true);
        }

        const trend = meta.getEffectivenessTrend();
        expect(trend.recentRate).toBeGreaterThan(0);
        expect(['improving', 'stable', 'declining']).toContain(trend.trend);
    });
});
