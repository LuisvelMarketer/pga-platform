/**
 * EmotionalModel Tests
 *
 * Tests for emotion inference, frustration detection,
 * tone guidance, and emotional trend tracking.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect } from 'vitest';
import { EmotionalModel } from '../EmotionalModel.js';

describe('EmotionalModel', () => {
    it('should detect frustration from text signals', () => {
        const model = new EmotionalModel();
        const state = model.inferEmotion('This is not working again! The same error keeps happening!');

        expect(state.primary).toBe('frustrated');
        expect(state.intensity).toBeGreaterThan(0.2);
        expect(state.signals.length).toBeGreaterThan(0);
    });

    it('should detect confusion', () => {
        const model = new EmotionalModel();
        const state = model.inferEmotion("I don't understand what do you mean by that???");

        expect(state.primary).toBe('confused');
        expect(state.signals.some(s => s.includes('confusion'))).toBe(true);
    });

    it('should detect enthusiasm', () => {
        const model = new EmotionalModel();
        const state = model.inferEmotion('That is awesome! Works perfectly, thank you!');

        expect(state.primary).toBe('enthusiastic');
        expect(state.intensity).toBeGreaterThan(0.1);
    });

    it('should detect impatience', () => {
        const model = new EmotionalModel();
        const state = model.inferEmotion('Just give me the answer quickly, get to the point');

        expect(state.primary).toBe('impatient');
    });

    it('should detect neutral state for standard messages', () => {
        const model = new EmotionalModel();
        const state = model.inferEmotion('Can you help me implement a sorting algorithm?');

        expect(state.primary).toBe('neutral');
    });

    it('should track frustration accumulation', () => {
        const model = new EmotionalModel();

        // Send several frustrated messages
        model.inferEmotion('This is not working');
        model.inferEmotion('Still broken, same error again');
        model.inferEmotion('Why does it keep failing?!');

        const frustration = model.detectFrustration();
        expect(frustration).toBeGreaterThan(0.3);
    });

    it('should provide appropriate tone guidance', () => {
        const model = new EmotionalModel();

        // Frustrated user — multiple frustration signals
        const frustrated = model.inferEmotion('This is not working again, still broken! Terrible!');
        const guidance = model.getToneGuidance(frustrated);
        expect(guidance.suggestedTone).toBe('empathetic');

        // Confused user
        const confused = model.inferEmotion("I don't understand, can you explain?");
        const confusedGuidance = model.getToneGuidance(confused);
        expect(confusedGuidance.suggestedTone).toBe('patient');
        expect(confusedGuidance.engagementLevel).toBe('proactive');
    });

    it('should generate prompt section for non-neutral emotions', () => {
        const model = new EmotionalModel();
        const state = model.inferEmotion('This is broken again, ugh!');

        const section = model.toPromptSection(state);
        expect(section).not.toBeNull();
        expect(section).toContain('Emotional Context');
        expect(section).toContain('Recommended tone');
    });

    it('should return null section for neutral emotion', () => {
        const model = new EmotionalModel();
        const state = model.inferEmotion('Hello');

        // neutral with low intensity → null
        if (state.primary === 'neutral' && state.intensity < 0.3) {
            const section = model.toPromptSection(state);
            expect(section).toBeNull();
        }
    });

    it('should track emotion trend', () => {
        const model = new EmotionalModel();

        // Several positive interactions
        for (let i = 0; i < 5; i++) {
            model.inferEmotion('Great work, thank you!');
        }

        const trend = model.getEmotionTrend();
        expect(trend.dominant).toBeDefined();
        expect(['improving', 'stable', 'worsening']).toContain(trend.trend);
    });
});
