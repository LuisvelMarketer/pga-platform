/**
 * @pga/core — Genomic Self-Evolving Prompts
 *
 * World's first autonomous prompt evolution system for AI agents
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2025
 * @license MIT
 *
 * @example
 * ```typescript
 * import { PGA } from '@pga/core';
 * import { ClaudeAdapter } from '@pga/adapters-llm/anthropic';
 * import { PostgresAdapter } from '@pga/adapters-storage/postgres';
 *
 * const pga = new PGA({
 *   llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_KEY }),
 *   storage: new PostgresAdapter({ connectionString: process.env.DATABASE_URL }),
 * });
 *
 * const genome = await pga.createGenome({ name: 'my-assistant' });
 * const response = await genome.chat('Hello!', { userId: 'user123' });
 * ```
 */

// ─── Main Exports ───────────────────────────────────────

export { PGA, GenomeInstance } from './PGA.js';
export type { PGAConfig } from './PGA.js';

// ─── Evaluation ─────────────────────────────────────────

export { Evaluator, STANDARD_TASKS } from './evaluation/Evaluator.js';
export type {
    EvaluationTask,
    EvaluationResult,
    BenchmarkResult,
    ComparisonResult,
} from './evaluation/Evaluator.js';

// ─── Monitoring ─────────────────────────────────────────

export { MetricsCollector } from './monitoring/MetricsCollector.js';
export type {
    PerformanceMetrics,
    CostMetrics,
    HealthStatus,
    ComponentHealth,
    AuditLog,
    Alert,
    MetricsCollectorConfig,
} from './monitoring/MetricsCollector.js';

// ─── Enterprise ─────────────────────────────────────────

export { RateLimiter } from './enterprise/RateLimiter.js';
export type {
    RateLimitConfig,
    RateLimitContext,
    RateLimitResult,
} from './enterprise/RateLimiter.js';

export { AuthManager } from './enterprise/AuthManager.js';
export type {
    User,
    Role,
    Permission,
    AuthContext,
    AuthPolicy,
    AuthConfig,
} from './enterprise/AuthManager.js';

// ─── Real-Time ──────────────────────────────────────────

export { PGAEventEmitter, globalEvents } from './realtime/EventEmitter.js';
export type {
    PGAEventType,
    PGAEvent,
    GenomeCreatedEvent,
    GenomeEvolvedEvent,
    MutationAppliedEvent,
    ChatMessageEvent,
    MetricsUpdatedEvent,
    AlertTriggeredEvent,
    EventHandler,
} from './realtime/EventEmitter.js';

export { StreamingManager, globalStreaming } from './realtime/StreamingManager.js';
export type {
    StreamChunk,
    StreamOptions,
} from './realtime/StreamingManager.js';

// ─── Plugins ────────────────────────────────────────────

export { PluginManager } from './plugins/PluginManager.js';
export type {
    Plugin,
    PluginMetadata,
    PluginHooks,
    PluginConfig,
} from './plugins/PluginManager.js';

// ─── Interfaces ─────────────────────────────────────────

export type { LLMAdapter, Message, ChatOptions, ChatResponse, ChatChunk } from './interfaces/LLMAdapter.js';
export type { StorageAdapter } from './interfaces/StorageAdapter.js';

// ─── Types ──────────────────────────────────────────────

export type {
    Genome,
    GenomeConfig,
    GeneAllele,
    UserDNA,
    UserTraits,
    MutationLog,
    MutationProposal,
    Interaction,
    ToolCall,
    FitnessMetrics,
    SelectionContext,
    Layer,
    MutationRate,
    Sentiment,
} from './types/index.js';

// ─── Version ────────────────────────────────────────────

export const VERSION = '0.1.0';
export const AUTHOR = 'Luis Alfredo Velasquez Duran';
export const YEAR = 2025;
