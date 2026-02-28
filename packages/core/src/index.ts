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
    EvaluatableGenome,
} from './evaluation/Evaluator.js';

export {
    getBenchmarkSuite,
    getAvailableSuites,
    validateSuiteFrozen,
    CORE_GENERAL_V1,
    CORE_CODING_V1,
    PGA_SPECIFIC_V1,
} from './evaluation/BenchmarkSuites.js';
export type {
    BenchmarkSuite,
    BenchmarkSuiteMetadata,
    BenchmarkSuiteId,
} from './evaluation/BenchmarkSuites.js';

export {
    getSandboxSuite,
    getSandboxPromotionThreshold,
    GLOBAL_SANDBOX_CASES,
    COMPRESS_INSTRUCTIONS_CASES,
    REORDER_CONSTRAINTS_CASES,
    SAFETY_REINFORCEMENT_CASES,
    TOOL_SELECTION_BIAS_CASES,
    CODING_TASK_CASES,
    GENERAL_TASK_CASES,
} from './evaluation/SandboxSuites.js';
export type {
    SandboxCaseDefinition,
} from './evaluation/SandboxSuites.js';

export { SemanticJudge } from './evaluation/SemanticJudge.js';
export type {
    SemanticJudgment,
} from './evaluation/SemanticJudge.js';

export { CalibrationManager } from './evaluation/CalibrationManager.js';
export type {
    CalibrationPoint,
    CalibrationHistory,
} from './evaluation/CalibrationManager.js';

export { EvolutionGuardrailsManager } from './evaluation/EvolutionGuardrails.js';
export type {
    MutationCandidate,
} from './evaluation/EvolutionGuardrails.js';

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

// ─── Advanced AI ────────────────────────────────────────

export { ThinkingEngine } from './advanced-ai/ThinkingEngine.js';
export type {
    ThinkingStep,
    ThinkingResult,
    SelfReflection,
    MetaLearning,
} from './advanced-ai/ThinkingEngine.js';

export { ModelRouter } from './advanced-ai/ModelRouter.js';
export type {
    ModelSpec,
    TaskClassification,
    RoutingDecision,
    ModelRouterConfig,
} from './advanced-ai/ModelRouter.js';

// ─── Resilience ─────────────────────────────────────────

export { CircuitBreaker } from './resilience/CircuitBreaker.js';
export type {
    CircuitState,
    CircuitBreakerConfig,
    CircuitBreakerStats,
} from './resilience/CircuitBreaker.js';

export { RetryManager } from './resilience/RetryManager.js';
export type {
    RetryConfig,
} from './resilience/RetryManager.js';

// ─── Evolution (Living OS) ──────────────────────────────

export { GenomeKernel, IntegrityViolationError, QuarantinedGenomeError } from './core/GenomeKernel.js';
export type { GenomeKernelOptions } from './core/GenomeKernel.js';

export { DriftAnalyzer } from './evolution/DriftAnalyzer.js';
export type {
    DriftAnalyzerConfig,
    DriftSignal,
    DriftType,
    DriftSeverity,
    DriftAnalysis,
} from './evolution/DriftAnalyzer.js';

export {
    MutationEngine,
    CompressInstructionsOperator,
    ReorderConstraintsOperator,
    SafetyReinforcementOperator,
    ToolSelectionBiasOperator,
} from './evolution/MutationOperator.js';
export type {
    IMutationOperator,
    MutationContext,
    MutationResult,
} from './evolution/MutationOperator.js';

export { FitnessCalculator } from './evolution/FitnessCalculator.js';
export type {
    InteractionData,
    FitnessCalculatorConfig,
} from './evolution/FitnessCalculator.js';

export { PromotionGate } from './evolution/PromotionGate.js';
export type {
    PromotionGateConfig,
    PromotionDecision,
    PromotionCheck,
} from './evolution/PromotionGate.js';

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
    GeneRegistryEntry,
    EvolutionGuardrails,
    EconomicMetrics,
    PromotionGateResult,
} from './types/index.js';

// ─── Types v2 (Living OS) ───────────────────────────────

export type {
    GenomeV2,
    Chromosome0,
    Chromosome1,
    Chromosome2,
    OperativeGene,
    GeneCategory,
    GeneOrigin,
    UserEpigenome,
    UserPreferences,
    LearnedPatterns,
    ContextGene,
    IntegrityMetadata,
    LineageMetadata,
    InheritedGene,
    MutationRecord,
    MutationTrigger,
    MutationType,
    FitnessVector,
    FitnessWeights,
    GenomeState,
    ValidationResults,
    EvaluationResult as EvaluationResultV2,
    TaskResult,
    GenomeSnapshot,
    GenomeDiff,
    GenomeChange,
    GenomeFamily,
} from './types/GenomeV2.js';

// ─── Version ────────────────────────────────────────────

export const VERSION = '0.2.0';
export const AUTHOR = 'Luis Alfredo Velasquez Duran';
export const YEAR = 2025;
