/**
 * PersonalNarrative Tests
 *
 * Tests for relationship tracking, significant moments,
 * achievements, and history callbacks.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect } from 'vitest';
import { PersonalNarrative } from '../PersonalNarrative.js';

describe('PersonalNarrative', () => {
    it('should start at "new" relationship stage', () => {
        const narrative = new PersonalNarrative();
        expect(narrative.getRelationshipStage()).toBe('new');
    });

    it('should progress to "familiar" after 10 interactions', () => {
        const narrative = new PersonalNarrative();

        for (let i = 0; i < 10; i++) {
            narrative.recordInteraction({
                topic: 'coding',
                wasSuccessful: true,
            });
        }

        expect(narrative.getRelationshipStage()).toBe('familiar');
    });

    it('should record breakthroughs as significant moments', () => {
        const narrative = new PersonalNarrative();

        narrative.recordInteraction({
            topic: 'debugging',
            wasSuccessful: true,
            breakthroughAchieved: true,
        });

        const moments = narrative.getMoments();
        expect(moments.length).toBeGreaterThanOrEqual(1);

        // Should have the breakthrough moment (and possibly the "first interaction" milestone)
        const breakthrough = moments.find(m => m.type === 'breakthrough');
        expect(breakthrough).toBeDefined();
        expect(breakthrough!.topic).toBe('debugging');
        expect(breakthrough!.impact).toBe(0.9);
    });

    it('should record complex successful tasks', () => {
        const narrative = new PersonalNarrative();

        narrative.recordInteraction({
            topic: 'architecture',
            wasSuccessful: true,
            wasComplex: true,
        });

        const moments = narrative.getMoments();
        const challenge = moments.find(m => m.type === 'challenge-overcome');
        expect(challenge).toBeDefined();
        expect(challenge!.topic).toBe('architecture');
    });

    it('should find history callbacks for topics', () => {
        const narrative = new PersonalNarrative();

        narrative.recordInteraction({
            topic: 'react',
            wasSuccessful: true,
            breakthroughAchieved: true,
        });

        const callback = narrative.callbackToHistory('react');
        expect(callback).not.toBeNull();
        expect(callback!.topic).toBe('react');
    });

    it('should return null for unknown topic callbacks', () => {
        const narrative = new PersonalNarrative();
        const callback = narrative.callbackToHistory('quantum-physics');
        expect(callback).toBeNull();
    });

    it('should track topic frequency', () => {
        const narrative = new PersonalNarrative();

        for (let i = 0; i < 5; i++) {
            narrative.recordInteraction({ topic: 'typescript', wasSuccessful: true });
        }
        for (let i = 0; i < 3; i++) {
            narrative.recordInteraction({ topic: 'python', wasSuccessful: true });
        }

        const summary = narrative.getSummary();
        expect(summary.topTopics.length).toBe(2);
        expect(summary.topTopics[0].topic).toBe('typescript');
        expect(summary.topTopics[0].count).toBe(5);
    });

    it('should create milestone achievement at familiar stage', () => {
        const narrative = new PersonalNarrative();

        for (let i = 0; i < 10; i++) {
            narrative.recordInteraction({ topic: 'coding', wasSuccessful: true });
        }

        const achievements = narrative.getAchievements();
        const familiar = achievements.find(a => a.title === 'Familiar Ground');
        expect(familiar).toBeDefined();
    });

    it('should generate prompt section after building history', () => {
        const narrative = new PersonalNarrative();

        // Build up to familiar stage
        for (let i = 0; i < 10; i++) {
            narrative.recordInteraction({
                topic: 'coding',
                wasSuccessful: true,
                breakthroughAchieved: i === 5,
            });
        }

        const section = narrative.toPromptSection();
        expect(section).not.toBeNull();
        expect(section).toContain('Relationship Context');
        expect(section).toContain('familiar');
    });

    it('should return null prompt section for new relationships with no moments', () => {
        const narrative = new PersonalNarrative();
        const section = narrative.toPromptSection();
        expect(section).toBeNull();
    });

    it('should provide narrative summary', () => {
        const narrative = new PersonalNarrative();

        narrative.recordInteraction({ topic: 'coding', wasSuccessful: true });

        const summary = narrative.getSummary();
        expect(summary.relationshipStage).toBe('new');
        expect(summary.interactionCount).toBe(1);
        expect(summary.daysTogether).toBeGreaterThanOrEqual(0);
    });
});
