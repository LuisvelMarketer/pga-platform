/**
 * WrappedAgent — The main wrapper class returned by PGA.wrap()
 *
 * Turns any LLMAdapter or async function into a self-evolving agent
 * with zero migration cost.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { LLMAdapter, Message, ChatOptions, ChatResponse } from '../interfaces/LLMAdapter.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import { PGA } from '../PGA.js';
import type { PGAConfig } from '../PGA.js';
import type { WrapOptions, FunctionWrapOptions, WrappableFunction } from './WrapOptions.js';
import { GenomeBuilder } from './GenomeBuilder.js';
import { InMemoryStorageAdapter } from './InMemoryStorageAdapter.js';
import { FunctionLLMAdapter } from './FunctionLLMAdapter.js';
import { globalEvents } from '../realtime/EventEmitter.js';
import type { Genome } from '../types/index.js';
import type { GenomeInstance } from '../PGA.js';

export class WrappedAgent {
    private pga: PGA;
    private genomeInstance!: GenomeInstance;
    private _initialized = false;
    private _name: string;
    private _id = '';
    private interactionCount = 0;

    private constructor(
        llmAdapter: LLMAdapter,
        private storage: StorageAdapter,
        options: WrapOptions,
        private genome: Genome,
    ) {
        this._name = options.name ?? 'wrapped-agent';

        const pgaConfig: PGAConfig = {
            llm: llmAdapter,
            storage,
            monitoring: options.monitoring?.metricsConfig ?? {
                enabled: options.monitoring?.enabled ?? true,
                enableCostTracking: true,
                enableAuditLogs: true,
            },
            dashboard: options.monitoring?.dashboard
                ? { enabled: true, ...(options.monitoring.dashboardConfig ?? {}) }
                : undefined,
            geneBank: options.geneBank,
        };

        this.pga = new PGA(pgaConfig);
    }

    /**
     * Create a WrappedAgent from an LLMAdapter (Level 1 & 3)
     */
    static async fromAdapter(adapter: LLMAdapter, options: WrapOptions): Promise<WrappedAgent> {
        const storage = options.storage ?? new InMemoryStorageAdapter();
        const genome = GenomeBuilder.build(options);
        const agent = new WrappedAgent(adapter, storage, options, genome);
        await agent.initialize();
        return agent;
    }

    /**
     * Create a WrappedAgent from a function (Level 2)
     */
    static async fromFunction(fn: WrappableFunction, options: FunctionWrapOptions): Promise<WrappedAgent> {
        const adapter = new FunctionLLMAdapter(fn, options.name);
        const storage = options.storage ?? new InMemoryStorageAdapter();
        const genome = GenomeBuilder.build(options);
        const agent = new WrappedAgent(adapter, storage, options, genome);
        await agent.initialize();
        return agent;
    }

    /**
     * Initialize the PGA system and create the genome.
     *
     * We save the pre-built genome to storage and then use PGA.loadGenome()
     * which constructs a full GenomeInstance with all evolution systems.
     */
    private async initialize(): Promise<void> {
        await this.pga.initialize();

        // Save the pre-built genome to storage
        await this.storage.saveGenome(this.genome);

        // Load through PGA to get a full GenomeInstance
        const instance = await this.pga.loadGenome(this.genome.id);
        if (!instance) {
            throw new Error('Failed to initialize wrapped genome');
        }
        this.genomeInstance = instance;
        this._id = this.genome.id;
        this._initialized = true;

        globalEvents.emitSync('genome:created', {
            genomeId: this._id,
            name: this._name,
            source: 'wrap',
        });
    }

    // ─── LLMAdapter-Compatible Chat ─────────────────────────

    /**
     * Chat with the wrapped agent.
     *
     * Accepts the standard LLMAdapter message format.
     * Internally delegates to GenomeInstance.chat() which handles:
     * - Prompt assembly from C0+C1+C2
     * - Canary deployment routing
     * - Fitness calculation & drift recording
     * - Continuous evolution loop
     * - DNA profile updates
     */
    async chat(messages: Message[], options?: ChatOptions & { userId?: string; taskType?: string }): Promise<ChatResponse> {
        this.ensureInitialized();

        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        if (!lastUserMessage) {
            throw new Error('No user message found in messages array');
        }

        const context = {
            userId: options?.userId ?? 'default-user',
            taskType: options?.taskType,
        };

        const startTime = Date.now();
        const content = await this.genomeInstance.chat(lastUserMessage.content, context);
        const duration = Date.now() - startTime;

        this.interactionCount++;

        return {
            content,
            usage: {
                inputTokens: Math.ceil(lastUserMessage.content.length / 4),
                outputTokens: Math.ceil(content.length / 4),
            },
            metadata: {
                genomeId: this._id,
                interactionCount: this.interactionCount,
                duration,
            },
        };
    }

    /**
     * Execute with simple string input (convenience for function-wrapped agents)
     */
    async execute(input: string, context?: { userId?: string; taskType?: string }): Promise<string> {
        this.ensureInitialized();
        return this.genomeInstance.chat(input, {
            userId: context?.userId ?? 'default-user',
            taskType: context?.taskType,
        });
    }

    // ─── Delegated Public APIs ──────────────────────────────

    /** Get agent name */
    get name(): string {
        return this._name;
    }

    /** Get agent ID (genome ID) */
    get id(): string {
        return this._id;
    }

    /** Get the underlying GenomeInstance for advanced operations */
    getGenome(): GenomeInstance {
        this.ensureInitialized();
        return this.genomeInstance;
    }

    /** Get drift analysis */
    getDriftAnalysis() {
        this.ensureInitialized();
        return this.genomeInstance.getDriftAnalysis();
    }

    /** Get evolution health */
    async getEvolutionHealth() {
        this.ensureInitialized();
        return this.genomeInstance.getEvolutionHealth();
    }

    /** Get analytics */
    async getAnalytics() {
        this.ensureInitialized();
        return this.genomeInstance.getAnalytics();
    }

    /** Get active canary deployments */
    getActiveCanaries() {
        this.ensureInitialized();
        return this.genomeInstance.getActiveCanaries();
    }

    /** Trigger manual mutation */
    async mutate(options?: Parameters<GenomeInstance['mutate']>[0]) {
        this.ensureInitialized();
        return this.genomeInstance.mutate(options);
    }

    /** Record user feedback */
    async recordFeedback(userId: string, gene: string, sentiment: 'positive' | 'negative' | 'neutral') {
        this.ensureInitialized();
        return this.genomeInstance.recordFeedback(userId, gene, sentiment);
    }

    /** Shutdown gracefully */
    shutdown(): void {
        this.pga.shutdown();
    }

    // ─── Private ────────────────────────────────────────────

    private ensureInitialized(): void {
        if (!this._initialized) {
            throw new Error('WrappedAgent not initialized. Use PGA.wrap() to create wrapped agents.');
        }
    }
}
