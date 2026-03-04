/**
 * PatternMemory Tests — Behavioral Pattern Extraction
 *
 * Tests for predictive pattern detection from interaction history.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect } from 'vitest';
import { PatternMemory } from '../PatternMemory.js';

// ─── Tests ──────────────────────────────────────────────

describe('PatternMemory', () => {
    it('should detect task sequence patterns after sufficient observations', () => {
        const memory = new PatternMemory();

        // Simulate: write-code → code-review pattern, 5 times
        for (let i = 0; i < 5; i++) {
            memory.recordInteraction({
                taskType: 'write-code',
                success: true,
                timestamp: new Date(),
            });
            memory.recordInteraction({
                taskType: 'code-review',
                success: true,
                timestamp: new Date(),
            });
        }

        const patterns = memory.getPatterns();

        // Should detect write-code → code-review sequence
        const seqPattern = patterns.find(
            p => p.type === 'task-sequence' && p.description.includes('write-code')
        );
        expect(seqPattern).toBeDefined();
        expect(seqPattern!.frequency).toBeGreaterThanOrEqual(3);
    });

    it('should generate predictions based on patterns', () => {
        const memory = new PatternMemory();

        // Build up pattern: debug → fix-code
        for (let i = 0; i < 6; i++) {
            memory.recordInteraction({
                taskType: 'debug',
                success: true,
                timestamp: new Date(),
            });
            memory.recordInteraction({
                taskType: 'fix-code',
                success: true,
                timestamp: new Date(),
            });
        }

        // Now record a 'debug' interaction — should predict 'fix-code' next
        memory.recordInteraction({
            taskType: 'debug',
            success: true,
            timestamp: new Date(),
        });

        const predictions = memory.getPredictions();

        expect(predictions.length).toBeGreaterThan(0);
        expect(predictions[0].prediction).toContain('fix-code');
    });

    it('should prune low-confidence patterns', () => {
        const memory = new PatternMemory();

        // Record many different sequences (low frequency each)
        const tasks = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for (const task of tasks) {
            memory.recordInteraction({
                taskType: task,
                success: true,
                timestamp: new Date(),
            });
        }

        // Force pattern rebuild
        for (let i = 0; i < 5; i++) {
            memory.recordInteraction({
                taskType: 'filler',
                success: true,
                timestamp: new Date(),
            });
        }

        const patterns = memory.getPatterns();

        // Low-frequency patterns should not appear (min frequency = 3)
        for (const p of patterns) {
            expect(p.frequency).toBeGreaterThanOrEqual(3);
        }
    });

    it('should respect maxPatterns limit', () => {
        const memory = new PatternMemory(5); // Max 5 patterns

        // Generate many patterns
        for (let i = 0; i < 30; i++) {
            memory.recordInteraction({
                taskType: `task-${i % 3}`,
                success: true,
                toolsUsed: [`tool-${i % 3}`],
                timestamp: new Date(),
            });
        }

        const patterns = memory.getPatterns();

        expect(patterns.length).toBeLessThanOrEqual(5);
    });

    it('should return null prompt section when no high-confidence patterns', () => {
        const memory = new PatternMemory();

        // Only 1 interaction — not enough for patterns
        memory.recordInteraction({
            taskType: 'test',
            success: true,
            timestamp: new Date(),
        });

        const section = memory.toPromptSection();

        expect(section).toBeNull();
    });
});
