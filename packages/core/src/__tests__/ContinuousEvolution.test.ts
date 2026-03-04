/**
 * Continuous Evolution Loop Tests
 *
 * Tests for automatic proactive evolution triggered during chat().
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PGA } from '../PGA.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';

// ─── Mock Adapters ──────────────────────────────────────

function createMockLLM(): LLMAdapter {
    return {
        chat: vi.fn().mockResolvedValue({ content: 'Hello! I can help you.' }),
        stream: vi.fn(),
    } as unknown as LLMAdapter;
}

function createMockStorage(): StorageAdapter {
    const genomes = new Map();
    return {
        initialize: vi.fn().mockResolvedValue(undefined),
        saveGenome: vi.fn().mockImplementation(async (g) => { genomes.set(g.id, g); }),
        loadGenome: vi.fn().mockImplementation(async (id) => genomes.get(id) ?? null),
        listGenomes: vi.fn().mockResolvedValue([]),
        deleteGenome: vi.fn().mockResolvedValue(undefined),
        recordInteraction: vi.fn().mockResolvedValue(undefined),
        recordFeedback: vi.fn().mockResolvedValue(undefined),
        logMutation: vi.fn().mockResolvedValue(undefined),
        getAnalytics: vi.fn().mockResolvedValue({
            totalInteractions: 0,
            totalMutations: 0,
            avgFitnessImprovement: 0,
            userSatisfaction: 0.7,
        }),
        loadDNA: vi.fn().mockResolvedValue(null),
        saveDNA: vi.fn().mockResolvedValue(undefined),
    } as unknown as StorageAdapter;
}

// ─── Tests ──────────────────────────────────────────────

describe('Continuous Evolution Loop', () => {
    let pga: PGA;
    let llm: LLMAdapter;
    let storage: StorageAdapter;

    beforeEach(async () => {
        llm = createMockLLM();
        storage = createMockStorage();
        pga = new PGA({ llm, storage });
        await pga.initialize();
    });

    it('should create genome with autonomous config', async () => {
        const genome = await pga.createGenome({
            name: 'auto-evolving-agent',
            config: {
                autonomous: {
                    continuousEvolution: true,
                    evolveEveryN: 5,
                },
            },
        });

        expect(genome.id).toBeDefined();
        expect(genome.name).toBe('auto-evolving-agent');
    });

    it('should not crash during chat with continuousEvolution enabled', async () => {
        const genome = await pga.createGenome({
            name: 'auto-test',
            config: {
                autonomous: {
                    continuousEvolution: true,
                    evolveEveryN: 3,
                },
            },
        });

        // Run 5 chat interactions
        for (let i = 0; i < 5; i++) {
            const response = await genome.chat(
                `Test message ${i}`,
                { userId: 'user-1' },
            );
            expect(response).toBeDefined();
        }
    });

    it('should work normally without autonomous config', async () => {
        const genome = await pga.createGenome({
            name: 'normal-agent',
        });

        const response = await genome.chat(
            'Hello world',
            { userId: 'user-2' },
        );

        expect(response).toContain('Hello');
    });

    it('should support SelfModel when enabled', async () => {
        const genome = await pga.createGenome({
            name: 'self-aware-agent',
            config: {
                autonomous: {
                    enableSelfModel: true,
                },
            },
        });

        const assessment = genome.getSelfAssessment();
        expect(assessment).not.toBeNull();
        expect(assessment!.overallHealth).toBeDefined();
    });

    it('should return null SelfAssessment when not enabled', async () => {
        const genome = await pga.createGenome({
            name: 'basic-agent',
        });

        const assessment = genome.getSelfAssessment();
        expect(assessment).toBeNull();
    });

    it('should support PatternMemory when enabled', async () => {
        const genome = await pga.createGenome({
            name: 'pattern-agent',
            config: {
                autonomous: {
                    enablePatternMemory: true,
                },
            },
        });

        // Initially no patterns
        const patterns = genome.getPatterns();
        expect(patterns).toEqual([]);

        const predictions = genome.getPredictions();
        expect(predictions).toEqual([]);
    });
});
