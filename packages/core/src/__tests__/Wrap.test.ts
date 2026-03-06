/**
 * PGA.wrap() Tests
 *
 * Tests for the universal self-evolving agent middleware
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import { describe, it, expect, vi } from 'vitest';
import { PGA } from '../PGA.js';
import { WrappedAgent } from '../wrap/WrappedAgent.js';
import { GenomeBuilder } from '../wrap/GenomeBuilder.js';
import { InMemoryStorageAdapter } from '../wrap/InMemoryStorageAdapter.js';
import { FunctionLLMAdapter } from '../wrap/FunctionLLMAdapter.js';
import type { LLMAdapter, Message } from '../interfaces/LLMAdapter.js';
import type { WrapOptions } from '../wrap/WrapOptions.js';

// ─── Mock LLM Adapter ──────────────────────────────────────

function createMockLLM(): LLMAdapter {
    return {
        name: 'mock',
        model: 'mock-model',
        chat: vi.fn().mockResolvedValue({
            content: 'Mock response',
            usage: { inputTokens: 100, outputTokens: 200 },
        }),
    };
}

function createDefaultOptions(overrides?: Partial<WrapOptions>): WrapOptions {
    return {
        systemPrompt: 'You are a helpful code review assistant.\n\nProvide detailed code analysis and suggestions.',
        protect: ['Never execute code directly', 'Always respect user privacy'],
        evolve: ['Provide detailed code analysis with examples'],
        adapt: ['tone', 'verbosity'],
        ...overrides,
    };
}

// ─── Level 1: LLMAdapter wrapping ──────────────────────────

describe('PGA.wrap() with LLMAdapter', () => {
    it('should wrap an LLMAdapter and return a WrappedAgent', async () => {
        const mockLLM = createMockLLM();
        const agent = await PGA.wrap(mockLLM, createDefaultOptions());

        expect(agent).toBeInstanceOf(WrappedAgent);
        expect(agent.name).toBe('wrapped-agent');
        expect(agent.id).toBeTruthy();
        expect(agent.id).toMatch(/^wrap_/);

        agent.shutdown();
    });

    it('should use the provided name', async () => {
        const mockLLM = createMockLLM();
        const agent = await PGA.wrap(mockLLM, createDefaultOptions({ name: 'code-reviewer' }));

        expect(agent.name).toBe('code-reviewer');

        agent.shutdown();
    });

    it('should return ChatResponse from chat()', async () => {
        const mockLLM = createMockLLM();
        const agent = await PGA.wrap(mockLLM, createDefaultOptions());

        const messages: Message[] = [
            { role: 'user', content: 'Review this function' },
        ];

        const response = await agent.chat(messages);

        expect(response).toBeDefined();
        expect(response.content).toBeTruthy();
        expect(response.usage).toBeDefined();
        expect(response.usage?.inputTokens).toBeGreaterThan(0);
        expect(response.usage?.outputTokens).toBeGreaterThan(0);
        expect(response.metadata?.genomeId).toBeTruthy();
        expect(response.metadata?.interactionCount).toBe(1);

        agent.shutdown();
    });

    it('should track interactions via execute()', async () => {
        const mockLLM = createMockLLM();
        const agent = await PGA.wrap(mockLLM, createDefaultOptions());

        const result = await agent.execute('Help me debug this');

        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');

        agent.shutdown();
    });

    it('should use InMemoryStorageAdapter by default', async () => {
        const mockLLM = createMockLLM();
        const agent = await PGA.wrap(mockLLM, createDefaultOptions());

        // Should work without any external storage
        const response = await agent.chat([{ role: 'user', content: 'Hello' }]);
        expect(response.content).toBeTruthy();

        agent.shutdown();
    });

    it('should accept custom StorageAdapter', async () => {
        const mockLLM = createMockLLM();
        const customStorage = new InMemoryStorageAdapter();
        const agent = await PGA.wrap(mockLLM, createDefaultOptions({
            storage: customStorage,
        }));

        expect(agent.id).toBeTruthy();

        // Verify genome was saved to custom storage
        const genome = await customStorage.loadGenome(agent.id);
        expect(genome).toBeTruthy();
        expect(genome?.name).toBe('wrapped-agent');

        agent.shutdown();
    });

    it('should throw when chat() receives no user message', async () => {
        const mockLLM = createMockLLM();
        const agent = await PGA.wrap(mockLLM, createDefaultOptions());

        await expect(
            agent.chat([{ role: 'system', content: 'System only' }]),
        ).rejects.toThrow('No user message found');

        agent.shutdown();
    });
});

// ─── Level 2: Function wrapping ────────────────────────────

describe('PGA.wrap() with function', () => {
    it('should wrap an async function and return a WrappedAgent', async () => {
        const fn = vi.fn().mockResolvedValue('Function response');
        const agent = await PGA.wrap(fn, {
            name: 'my-function-agent',
            systemPrompt: 'You are a test agent.',
        });

        expect(agent).toBeInstanceOf(WrappedAgent);
        expect(agent.name).toBe('my-function-agent');

        agent.shutdown();
    });

    it('should throw if name is not provided for function wrapping', async () => {
        const fn = vi.fn().mockResolvedValue('Response');

        await expect(
            PGA.wrap(fn, {
                systemPrompt: 'Test',
            } as any),
        ).rejects.toThrow('name is required');
    });

    it('should pass user message to the wrapped function via chat()', async () => {
        const fn = vi.fn().mockResolvedValue('Function response');
        const agent = await PGA.wrap(fn, {
            name: 'test-fn',
            systemPrompt: 'You are a test agent.',
        });

        await agent.chat([{ role: 'user', content: 'Hello from user' }]);

        // The function receives input through FunctionLLMAdapter
        // which extracts the user message
        expect(fn).toHaveBeenCalled();

        agent.shutdown();
    });

    it('should execute() with simple string input', async () => {
        const fn = vi.fn().mockResolvedValue('Direct response');
        const agent = await PGA.wrap(fn, {
            name: 'direct-agent',
            systemPrompt: 'Test agent.',
        });

        const result = await agent.execute('Simple input');

        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');

        agent.shutdown();
    });
});

// ─── GenomeBuilder ──────────────────────────────────────────

describe('GenomeBuilder', () => {
    it('should parse systemPrompt first paragraph into C0 identity', () => {
        const genome = GenomeBuilder.build({
            systemPrompt: 'You are an expert code reviewer.\n\nAnalyze code for bugs and performance issues.',
        });

        const identityGene = genome.layers.layer0.find(g => g.gene === 'core-identity');
        expect(identityGene).toBeDefined();
        expect(identityGene?.content).toBe('You are an expert code reviewer.');
    });

    it('should extract NEVER/ALWAYS rules into C0 security-gate', () => {
        const genome = GenomeBuilder.build({
            systemPrompt: 'You are an assistant.\n\nNEVER share passwords\nALWAYS validate inputs\nProvide helpful responses.',
        });

        const securityGene = genome.layers.layer0.find(g => g.gene === 'security-gate');
        expect(securityGene).toBeDefined();
        expect(securityGene?.content).toContain('NEVER share passwords');
        expect(securityGene?.content).toContain('ALWAYS validate inputs');
    });

    it('should categorize evolve[] strings into correct GeneCategory', () => {
        const genome = GenomeBuilder.build({
            systemPrompt: 'Test agent.',
            evolve: [
                'Use the API tools efficiently',
                'Debug code with detailed analysis',
                'Handle errors gracefully with retries',
            ],
        });

        const genes = genome.layers.layer1;
        expect(genes).toHaveLength(3);
        expect(genes[0].gene).toBe('tool-usage');
        expect(genes[1].gene).toBe('coding-patterns');
        expect(genes[2].gene).toBe('error-handling');
    });

    it('should use explicit { category, content } for evolve', () => {
        const genome = GenomeBuilder.build({
            systemPrompt: 'Test agent.',
            evolve: [
                { category: 'reasoning', content: 'Think step by step' },
                { category: 'data-processing', content: 'Parse JSON carefully' },
            ],
        });

        const genes = genome.layers.layer1;
        expect(genes).toHaveLength(2);
        expect(genes[0].gene).toBe('reasoning');
        expect(genes[0].content).toBe('Think step by step');
        expect(genes[1].gene).toBe('data-processing');
    });

    it('should create adapt[] as C2 genes', () => {
        const genome = GenomeBuilder.build({
            systemPrompt: 'Test agent.',
            adapt: ['tone', 'verbosity'],
        });

        const adaptGenes = genome.layers.layer2;
        expect(adaptGenes).toHaveLength(2);
        expect(adaptGenes[0].gene).toBe('adapt-tone');
        expect(adaptGenes[1].gene).toBe('adapt-verbosity');
    });

    it('should auto-parse when protect/evolve/adapt not provided', () => {
        const genome = GenomeBuilder.build({
            systemPrompt: 'You are a coding assistant.\n\nProvide clean code solutions with tests.\n\nUse TypeScript when possible.',
        });

        // Should have auto-generated layers
        expect(genome.layers.layer0.length).toBeGreaterThanOrEqual(1);
        expect(genome.layers.layer1.length).toBeGreaterThanOrEqual(1);
        expect(genome.layers.layer2.length).toBeGreaterThanOrEqual(1);
    });

    it('should always have at least one gene per layer', () => {
        const genome = GenomeBuilder.build({
            systemPrompt: 'Minimal.',
        });

        expect(genome.layers.layer0.length).toBeGreaterThanOrEqual(1);
        expect(genome.layers.layer1.length).toBeGreaterThanOrEqual(1);
        expect(genome.layers.layer2.length).toBeGreaterThanOrEqual(1);
    });

    it('should set continuousEvolution to true', () => {
        const genome = GenomeBuilder.build({
            systemPrompt: 'Test.',
        });

        expect(genome.config.autonomous?.continuousEvolution).toBe(true);
    });

    it('should map evolution mode to mutationRate', () => {
        const conservative = GenomeBuilder.build({
            systemPrompt: 'Test.',
            evolution: { mode: 'conservative' },
        });
        expect(conservative.config.mutationRate).toBe('slow');

        const aggressive = GenomeBuilder.build({
            systemPrompt: 'Test.',
            evolution: { mode: 'aggressive' },
        });
        expect(aggressive.config.mutationRate).toBe('aggressive');

        const balanced = GenomeBuilder.build({
            systemPrompt: 'Test.',
        });
        expect(balanced.config.mutationRate).toBe('balanced');
    });

    it('should use protect[] for C0 when provided', () => {
        const genome = GenomeBuilder.build({
            systemPrompt: 'Test agent.',
            protect: ['Never share secrets', 'Always be honest'],
        });

        expect(genome.layers.layer0).toHaveLength(2);
        expect(genome.layers.layer0[0].gene).toBe('core-identity');
        expect(genome.layers.layer0[0].content).toBe('Never share secrets');
        expect(genome.layers.layer0[1].gene).toBe('security-rule-1');
        expect(genome.layers.layer0[1].content).toBe('Always be honest');
    });
});

// ─── InMemoryStorageAdapter ─────────────────────────────────

describe('InMemoryStorageAdapter', () => {
    it('should save and load genomes', async () => {
        const storage = new InMemoryStorageAdapter();
        await storage.initialize();

        const genome = GenomeBuilder.build({
            systemPrompt: 'Test agent.',
            name: 'test-genome',
        });

        await storage.saveGenome(genome);
        const loaded = await storage.loadGenome(genome.id);

        expect(loaded).toBeTruthy();
        expect(loaded?.name).toBe('test-genome');
        expect(loaded?.id).toBe(genome.id);
    });

    it('should return null for non-existent genome', async () => {
        const storage = new InMemoryStorageAdapter();
        const result = await storage.loadGenome('nonexistent');
        expect(result).toBeNull();
    });

    it('should record and retrieve interactions', async () => {
        const storage = new InMemoryStorageAdapter();

        await storage.recordInteraction({
            genomeId: 'g1',
            userId: 'u1',
            userMessage: 'Hello',
            assistantResponse: 'Hi there',
            toolCalls: [],
            timestamp: new Date(),
        });

        const interactions = await storage.getRecentInteractions('g1', 'u1');
        expect(interactions).toHaveLength(1);
    });

    it('should track mutation history', async () => {
        const storage = new InMemoryStorageAdapter();

        await storage.logMutation({
            genomeId: 'g1',
            gene: 'reasoning',
            variant: 'v2',
            mutationType: 'targeted',
            parentVariant: 'default',
            fitnessDelta: 0.05,
            timestamp: new Date(),
        });

        const history = await storage.getMutationHistory('g1');
        expect(history).toHaveLength(1);
        expect(history[0].gene).toBe('reasoning');
    });

    it('should list and delete genomes', async () => {
        const storage = new InMemoryStorageAdapter();
        const genome = GenomeBuilder.build({ systemPrompt: 'Test.', name: 'to-delete' });

        await storage.saveGenome(genome);
        let list = await storage.listGenomes();
        expect(list).toHaveLength(1);

        await storage.deleteGenome(genome.id);
        list = await storage.listGenomes();
        expect(list).toHaveLength(0);
    });
});

// ─── FunctionLLMAdapter ─────────────────────────────────────

describe('FunctionLLMAdapter', () => {
    it('should implement LLMAdapter interface', () => {
        const fn = vi.fn().mockResolvedValue('response');
        const adapter = new FunctionLLMAdapter(fn, 'test-fn');

        expect(adapter.name).toBe('test-fn');
        expect(adapter.model).toBe('function:test-fn');
        expect(typeof adapter.chat).toBe('function');
    });

    it('should pass last user message to function', async () => {
        const fn = vi.fn().mockResolvedValue('processed');
        const adapter = new FunctionLLMAdapter(fn, 'test');

        const result = await adapter.chat([
            { role: 'system', content: 'System instructions' },
            { role: 'user', content: 'First message' },
            { role: 'user', content: 'Last message' },
        ]);

        expect(fn).toHaveBeenCalledWith('Last message');
        expect(result.content).toBe('processed');
        expect(result.usage?.inputTokens).toBeGreaterThan(0);
        expect(result.usage?.outputTokens).toBeGreaterThan(0);
    });
});

// ─── WrappedAgent API ───────────────────────────────────────

describe('WrappedAgent API', () => {
    it('should expose name and id properties', async () => {
        const mockLLM = createMockLLM();
        const agent = await PGA.wrap(mockLLM, createDefaultOptions({ name: 'my-agent' }));

        expect(agent.name).toBe('my-agent');
        expect(agent.id).toMatch(/^wrap_/);

        agent.shutdown();
    });

    it('should provide access to underlying GenomeInstance', async () => {
        const mockLLM = createMockLLM();
        const agent = await PGA.wrap(mockLLM, createDefaultOptions());

        const genome = agent.getGenome();
        expect(genome).toBeDefined();
        expect(genome.id).toBe(agent.id);

        agent.shutdown();
    });

    it('should expose drift analysis', async () => {
        const mockLLM = createMockLLM();
        const agent = await PGA.wrap(mockLLM, createDefaultOptions());

        const drift = agent.getDriftAnalysis();
        expect(drift).toBeDefined();

        agent.shutdown();
    });

    it('should shutdown gracefully', async () => {
        const mockLLM = createMockLLM();
        const agent = await PGA.wrap(mockLLM, createDefaultOptions());

        // Should not throw
        expect(() => agent.shutdown()).not.toThrow();
    });
});
