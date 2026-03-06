/**
 * PGA Core Tests
 *
 * Tests for the main PGA class with integrated monitoring
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-28
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PGA } from '../PGA.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';

// ─── Mock Implementations ───────────────────────────────────

class MockLLMAdapter implements LLMAdapter {
    async chat(messages: Array<{ role: string; content: string }>) {
        return {
            content: `Mock response to: ${messages[messages.length - 1].content}`,
            usage: { inputTokens: 100, outputTokens: 200 },
        };
    }
}

class MockStorageAdapter implements StorageAdapter {
    private genomes: Map<string, any> = new Map();

    async initialize() {
        // No-op for testing
    }

    async saveGenome(genome: any) {
        this.genomes.set(genome.id, genome);
    }

    async loadGenome(id: string) {
        return this.genomes.get(id) || null;
    }

    async listGenomes() {
        return Array.from(this.genomes.values());
    }

    async deleteGenome(id: string) {
        this.genomes.delete(id);
    }

    async recordInteraction(interaction: any) {
        // No-op
    }

    async recordFeedback(feedback: any) {
        // No-op
    }

    async logMutation(log: any) {
        // No-op
    }

    async getAnalytics(genomeId: string) {
        return {
            totalInteractions: 10,
            totalMutations: 2,
            avgFitnessImprovement: 0.05,
            userSatisfaction: 0.75,
        };
    }

    async loadDNA(userId: string, genomeId: string) {
        return null;
    }

    async saveDNA(userId: string, genomeId: string, dna: any) {
        // No-op
    }
}

// ─── Test Suite ─────────────────────────────────────────────

describe('PGA', () => {
    let llm: MockLLMAdapter;
    let storage: MockStorageAdapter;

    beforeEach(() => {
        llm = new MockLLMAdapter();
        storage = new MockStorageAdapter();
    });

    describe('validation', () => {
        it('should throw descriptive error when LLM adapter is missing', () => {
            expect(() => new PGA({
                llm: undefined as any,
                storage,
            })).toThrow('[PGA] LLM adapter is required');
        });

        it('should throw descriptive error when LLM adapter is null', () => {
            expect(() => new PGA({
                llm: null as any,
                storage,
            })).toThrow('[PGA] LLM adapter is required');
        });

        it('should throw descriptive error when storage adapter is missing', () => {
            expect(() => new PGA({
                llm,
                storage: undefined as any,
            })).toThrow('[PGA] Storage adapter is required');
        });

        it('should include actionable instructions in error message', () => {
            try {
                new PGA({ llm: undefined as any, storage });
                expect.unreachable('Should have thrown');
            } catch (e) {
                const msg = (e as Error).message;
                expect(msg).toContain('ClaudeAdapter');
                expect(msg).toContain('@pga-ai/adapters-llm-anthropic');
                expect(msg).toContain('pga doctor');
            }
        });

        it('should succeed with valid LLM and storage', () => {
            expect(() => new PGA({ llm, storage })).not.toThrow();
        });
    });

    describe('initialization', () => {
        it('should initialize PGA with default monitoring config', async () => {
            const pga = new PGA({
                llm,
                storage,
            });

            await pga.initialize();

            const metrics = pga.getMetrics();
            expect(metrics).toBeDefined();
        });

        it('should initialize PGA with custom monitoring config', async () => {
            const pga = new PGA({
                llm,
                storage,
                monitoring: {
                    enabled: true,
                    enableCostTracking: true,
                    alertThresholds: {
                        maxCostPerHour: 50,
                        maxErrorRate: 0.1,
                    },
                },
            });

            await pga.initialize();

            const metrics = pga.getMetrics();
            expect(metrics).toBeDefined();
        });

        it('should start dashboard if enabled', async () => {
            const pga = new PGA({
                llm,
                storage,
                dashboard: {
                    enabled: true,
                    refreshInterval: 5000,
                },
            });

            await pga.initialize();

            const dashboard = pga.getDashboard();
            expect(dashboard).toBeDefined();

            pga.shutdown();
        });

        it('should not start dashboard if disabled', async () => {
            const pga = new PGA({
                llm,
                storage,
                dashboard: {
                    enabled: false,
                },
            });

            await pga.initialize();

            const dashboard = pga.getDashboard();
            expect(dashboard).toBeUndefined();
        });

        it('should log initialization to audit', async () => {
            const pga = new PGA({
                llm,
                storage,
            });

            await pga.initialize();

            const metrics = pga.getMetrics();
            const logs = metrics.getAuditLogs(10);

            const initLog = logs.find(l => l.operation === 'initialize');
            expect(initLog).toBeDefined();
            expect(initLog?.level).toBe('info');
            expect(initLog?.component).toBe('pga');
        });
    });

    describe('genome management', () => {
        it('should create a genome', async () => {
            const pga = new PGA({ llm, storage });
            await pga.initialize();

            const genome = await pga.createGenome({
                name: 'test-genome',
            });

            expect(genome).toBeDefined();
            expect(genome.name).toBe('test-genome');
            expect(genome.id).toBeDefined();
        });

        it('should load an existing genome', async () => {
            const pga = new PGA({ llm, storage });
            await pga.initialize();

            const created = await pga.createGenome({
                name: 'test-genome',
            });

            const loaded = await pga.loadGenome(created.id);

            expect(loaded).toBeDefined();
            expect(loaded?.id).toBe(created.id);
        });

        it('should list all genomes', async () => {
            const pga = new PGA({ llm, storage });
            await pga.initialize();

            await pga.createGenome({ name: 'genome-1' });
            await pga.createGenome({ name: 'genome-2' });

            const genomes = await pga.listGenomes();

            expect(genomes.length).toBe(2);
        });

        it('should delete a genome', async () => {
            const pga = new PGA({ llm, storage });
            await pga.initialize();

            const genome = await pga.createGenome({ name: 'test-genome' });

            await pga.deleteGenome(genome.id);

            const loaded = await pga.loadGenome(genome.id);
            expect(loaded).toBeNull();
        });
    });

    describe('metrics', () => {
        it('should provide access to metrics collector', async () => {
            const pga = new PGA({ llm, storage });
            await pga.initialize();

            const metrics = pga.getMetrics();

            expect(metrics).toBeDefined();
            expect(typeof metrics.recordRequest).toBe('function');
            expect(typeof metrics.getPerformanceMetrics).toBe('function');
        });

        it('should export metrics', async () => {
            const pga = new PGA({ llm, storage });
            await pga.initialize();

            const exported = pga.exportMetrics();

            expect(exported).toBeDefined();
            expect(exported.performance).toBeDefined();
            expect(exported.cost).toBeDefined();
            expect(exported.health).toBeDefined();
            expect(exported.alerts).toBeDefined();
            expect(exported.auditLogs).toBeDefined();
        });

        it('should get active alerts', async () => {
            const pga = new PGA({ llm, storage });
            await pga.initialize();

            const alerts = pga.getAlerts();

            expect(Array.isArray(alerts)).toBe(true);
        });

        it('should get health status', async () => {
            const pga = new PGA({ llm, storage });
            await pga.initialize();

            const health = pga.getHealthStatus();

            expect(health).toBeDefined();
            expect(health.status).toMatch(/healthy|degraded|unhealthy/);
            expect(health.components).toBeDefined();
            expect(health.uptime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('shutdown', () => {
        it('should shutdown gracefully', async () => {
            const pga = new PGA({
                llm,
                storage,
                dashboard: { enabled: true },
            });

            await pga.initialize();

            pga.shutdown();

            const metrics = pga.getMetrics();
            const logs = metrics.getAuditLogs(10);

            const shutdownLog = logs.find(l => l.operation === 'shutdown');
            expect(shutdownLog).toBeDefined();
        });

        it('should stop dashboard on shutdown', async () => {
            const pga = new PGA({
                llm,
                storage,
                dashboard: { enabled: true },
            });

            await pga.initialize();

            const dashboard = pga.getDashboard();
            const stopSpy = vi.spyOn(dashboard!, 'stop');

            pga.shutdown();

            expect(stopSpy).toHaveBeenCalled();
        });
    });
});
