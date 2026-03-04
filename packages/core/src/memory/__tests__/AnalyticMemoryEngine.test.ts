/**
 * AnalyticMemoryEngine Tests
 *
 * Tests for knowledge graph, entity/relation management,
 * inference, and semantic querying.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect } from 'vitest';
import { AnalyticMemoryEngine } from '../AnalyticMemoryEngine.js';

describe('AnalyticMemoryEngine', () => {
    it('should record observations and create entities', () => {
        const engine = new AnalyticMemoryEngine();

        engine.recordObservation({
            subject: 'user',
            action: 'uses',
            object: 'python',
        });

        const entities = engine.getEntities();
        expect(entities.length).toBe(2); // user + python
        expect(entities.find(e => e.name === 'user')).toBeDefined();
        expect(entities.find(e => e.name === 'python')).toBeDefined();
    });

    it('should create relations from observations', () => {
        const engine = new AnalyticMemoryEngine();

        engine.recordObservation({
            subject: 'user',
            action: 'prefers',
            object: 'typescript',
        });

        const relations = engine.getRelations();
        expect(relations.length).toBe(1);
        expect(relations[0].type).toBe('prefers');
        expect(relations[0].from).toBe('user');
        expect(relations[0].to).toBe('typescript');
    });

    it('should record facts and build entity attributes', () => {
        const engine = new AnalyticMemoryEngine();

        engine.recordFact({
            subject: 'user',
            predicate: 'works-in',
            value: 'fintech',
        });

        const entities = engine.getEntities();
        const user = entities.find(e => e.id === 'user');
        expect(user).toBeDefined();
        expect(user!.attributes['works-in']).toBe('fintech');
    });

    it('should query knowledge graph semantically', () => {
        const engine = new AnalyticMemoryEngine();

        engine.recordObservation({ subject: 'user', action: 'uses', object: 'python' });
        engine.recordObservation({ subject: 'user', action: 'uses', object: 'docker' });
        engine.recordObservation({ subject: 'user', action: 'works on', object: 'backend' });

        const result = engine.query('python');
        expect(result.entities.length).toBeGreaterThan(0);
        expect(result.entities.some(e => e.name === 'python')).toBe(true);
        expect(result.relevanceScore).toBeGreaterThan(0);
    });

    it('should infer domain implications', () => {
        const engine = new AnalyticMemoryEngine();

        // Record enough to trigger inference (entities.size % 5 === 0)
        engine.recordFact({ subject: 'user', predicate: 'works-in', value: 'fintech' });
        engine.recordObservation({ subject: 'user', action: 'uses', object: 'python' });
        engine.recordObservation({ subject: 'user', action: 'uses', object: 'docker' });
        engine.recordObservation({ subject: 'user', action: 'uses', object: 'kubernetes' });
        engine.recordObservation({ subject: 'user', action: 'works on', object: 'backend' });

        const inferences = engine.getInferences();
        // fintech → implies security, compliance, precision
        const securityInference = inferences.find(i => i.conclusion.includes('security'));
        expect(securityInference).toBeDefined();
    });

    it('should detect temporal patterns', () => {
        const engine = new AnalyticMemoryEngine();

        // Record observations on specific days
        const friday = new Date('2026-03-06'); // Friday
        for (let i = 0; i < 5; i++) {
            engine.recordObservation({
                subject: 'user',
                action: 'refactors_code',
                timestamp: new Date(friday.getTime() + i * 7 * 24 * 60 * 60 * 1000), // each Friday
            });
        }

        const patterns = engine.detectTemporalPatterns();
        expect(patterns.length).toBeGreaterThan(0);
        expect(patterns[0].dayOfWeek).toBe(5); // Friday
    });

    it('should generate prompt section with knowledge context', () => {
        const engine = new AnalyticMemoryEngine();

        engine.recordObservation({ subject: 'user', action: 'uses', object: 'python' });
        engine.recordObservation({ subject: 'user', action: 'prefers', object: 'typescript' });

        const section = engine.toPromptSection();
        expect(section).not.toBeNull();
        expect(section).toContain('Knowledge Context');
    });

    it('should return null prompt section when empty', () => {
        const engine = new AnalyticMemoryEngine();
        const section = engine.toPromptSection();
        expect(section).toBeNull();
    });

    it('should provide predictions based on context', () => {
        const engine = new AnalyticMemoryEngine();

        // Build some temporal data
        const friday = new Date('2026-03-06');
        for (let i = 0; i < 4; i++) {
            engine.recordObservation({
                subject: 'user',
                action: 'code_review',
                timestamp: new Date(friday.getTime() + i * 7 * 24 * 60 * 60 * 1000),
            });
        }

        engine.detectTemporalPatterns();

        const predictions = engine.predict({ dayOfWeek: 5 }); // Friday
        expect(predictions.length).toBeGreaterThan(0);
        expect(predictions[0].prediction).toContain('code_review');
    });
});
