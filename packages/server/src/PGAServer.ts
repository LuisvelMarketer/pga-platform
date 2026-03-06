/**
 * PGAServer — Secure Evolution Server (Pull/Push Architecture)
 *
 * Provides a REST API for external agents (Python, Go, Rust, etc.)
 * to benefit from PGA evolution WITHOUT proxying LLM traffic.
 *
 * Security guarantees:
 * - NEVER receives LLM API keys
 * - NEVER receives user message content or LLM responses
 * - NEVER sits in the request path (no MITM)
 * - Per-genome HMAC secrets prevent metric forging
 * - Rate limiting prevents DoS via evolution flooding
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { PGA, GenomeInstance, GenomeBuilder, InMemoryStorageAdapter } from '@pga-ai/core';
import type { LLMAdapter, StorageAdapter, WrapOptions } from '@pga-ai/core';
import type { GeneCategory } from '@pga-ai/core';
import { HMACVerifier } from './auth/HMACVerifier.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerGenomeRoutes } from './routes/genomes.js';
import { registerPromptRoutes } from './routes/prompts.js';
import { registerReportRoutes } from './routes/reports.js';

// ─── Config Types ──────────────────────────────────────────

export interface PGAServerConfig {
    /** Storage adapter for genome persistence */
    storage?: StorageAdapter;
    /** LLM adapter for LLM-powered mutations (optional) */
    llm?: LLMAdapter;
    /** Admin API key for management endpoints */
    adminApiKey: string;
    /** Server port (default: 4444) */
    port?: number;
    /** Rate limiting config */
    rateLimit?: { max: number; timeWindow: string };
}

export interface RegisterGenomeOptions {
    name: string;
    systemPrompt: string;
    protect?: string[];
    evolve?: Array<string | { category: GeneCategory; content: string }>;
    adapt?: Array<string | { trait: string; content: string }>;
    evolution?: WrapOptions['evolution'];
}

export interface GenomeEntry {
    instance: GenomeInstance;
    secret: string;
    name: string;
    createdAt: Date;
}

// ─── Noop LLM Adapter ─────────────────────────────────────

class NoopLLMAdapter implements LLMAdapter {
    readonly name = 'noop';
    readonly model = 'noop';
    async chat(): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
        return { content: '', usage: { inputTokens: 0, outputTokens: 0 } };
    }
}

// ─── PGA Server ─────────────────────────────────────────────

export class PGAServer {
    private app: FastifyInstance;
    private pga!: PGA;
    private genomes = new Map<string, GenomeEntry>();
    private storage: StorageAdapter;
    private llm: LLMAdapter;
    private startTime = Date.now();

    readonly adminApiKey: string;
    readonly port: number;

    constructor(private config: PGAServerConfig) {
        this.adminApiKey = config.adminApiKey;
        this.port = config.port ?? 4444;
        this.storage = config.storage ?? new InMemoryStorageAdapter();
        this.llm = config.llm ?? new NoopLLMAdapter();

        this.app = Fastify({ logger: false });
    }

    /**
     * Start the server.
     */
    async start(port?: number): Promise<void> {
        const listenPort = port ?? this.port;

        // Initialize PGA core
        this.pga = new PGA({
            llm: this.llm,
            storage: this.storage,
            monitoring: { enabled: true, enableCostTracking: true, enableAuditLogs: true },
        });
        await this.pga.initialize();

        // Rate limiting
        if (this.config.rateLimit) {
            const rateLimitPlugin = await import('@fastify/rate-limit');
            await this.app.register(rateLimitPlugin.default, {
                max: this.config.rateLimit.max,
                timeWindow: this.config.rateLimit.timeWindow,
            });
        }

        // Register routes
        registerHealthRoutes(this.app, this);
        registerGenomeRoutes(this.app, this);
        registerPromptRoutes(this.app, this);
        registerReportRoutes(this.app, this);

        await this.app.listen({ port: listenPort, host: '0.0.0.0' });
        this.startTime = Date.now();
    }

    /**
     * Stop the server gracefully.
     */
    async stop(): Promise<void> {
        await this.app.close();
        this.pga.shutdown();
    }

    /**
     * Get the Fastify instance (for testing with inject()).
     */
    getApp(): FastifyInstance {
        return this.app;
    }

    // ─── Genome Management ─────────────────────────────────

    /**
     * Register a new genome and return its ID + HMAC secret.
     */
    async registerGenome(options: RegisterGenomeOptions): Promise<{ genomeId: string; secret: string }> {
        // Build genome from options using GenomeBuilder
        const genome = GenomeBuilder.build({
            name: options.name,
            systemPrompt: options.systemPrompt,
            protect: options.protect,
            evolve: options.evolve,
            adapt: options.adapt,
            evolution: options.evolution,
        });

        // Save to storage and load as GenomeInstance
        await this.storage.saveGenome(genome);
        const instance = await this.pga.loadGenome(genome.id);
        if (!instance) {
            throw new Error(`Failed to create genome: ${options.name}`);
        }

        // Generate HMAC secret for this genome
        const secret = HMACVerifier.generateSecret();

        this.genomes.set(genome.id, {
            instance,
            secret,
            name: options.name,
            createdAt: new Date(),
        });

        return { genomeId: genome.id, secret };
    }

    /**
     * Remove a genome.
     */
    async removeGenome(genomeId: string): Promise<boolean> {
        const entry = this.genomes.get(genomeId);
        if (!entry) return false;

        await this.pga.deleteGenome(genomeId);
        this.genomes.delete(genomeId);
        return true;
    }

    /**
     * Get a genome entry by ID.
     */
    getGenomeEntry(genomeId: string): GenomeEntry | undefined {
        return this.genomes.get(genomeId);
    }

    /**
     * List all registered genomes (without secrets).
     */
    listGenomes(): Array<{ genomeId: string; name: string; createdAt: Date }> {
        return Array.from(this.genomes.entries()).map(([id, entry]) => ({
            genomeId: id,
            name: entry.name,
            createdAt: entry.createdAt,
        }));
    }

    /**
     * Get server uptime in seconds.
     */
    getUptime(): number {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    /**
     * Get total genome count.
     */
    getGenomeCount(): number {
        return this.genomes.size;
    }

    // ─── Auth Helpers ──────────────────────────────────────

    /**
     * Verify admin API key.
     */
    verifyAdminKey(key: string | undefined): boolean {
        if (!key) return false;
        return key === this.adminApiKey;
    }

    /**
     * Verify genome secret from Authorization header.
     */
    verifyGenomeSecret(genomeId: string, bearer: string | undefined): boolean {
        if (!bearer) return false;
        const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : bearer;
        const entry = this.genomes.get(genomeId);
        if (!entry) return false;
        return token === entry.secret;
    }
}
