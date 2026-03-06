/**
 * @pga-ai/core — Genomic Self-Evolving Prompts
 *
 * World's first autonomous prompt evolution system for AI agents
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2025
 * @license MIT
 *
 * @example
 * ```typescript
 * import { PGA } from '@pga-ai/core';
 * import { ClaudeAdapter } from '@pga-ai/adapters-llm/anthropic';
 * import { PostgresAdapter } from '@pga-ai/adapters-storage/postgres';
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

// ─── Wrap (Universal Middleware) ────────────────────────

export { WrappedAgent } from './wrap/WrappedAgent.js';
export { GenomeBuilder } from './wrap/GenomeBuilder.js';
export { InMemoryStorageAdapter } from './wrap/InMemoryStorageAdapter.js';
export { FunctionLLMAdapter } from './wrap/FunctionLLMAdapter.js';
export type { WrapOptions, FunctionWrapOptions, WrappableFunction } from './wrap/WrapOptions.js';

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
    PROOF_OF_VALUE_V1,
} from './evaluation/BenchmarkSuites.js';
export type {
    BenchmarkSuite,
    BenchmarkSuiteMetadata,
    BenchmarkSuiteId,
} from './evaluation/BenchmarkSuites.js';

export { ProofOfValueRunner } from './evaluation/ProofOfValueRunner.js';
export type {
    ProofOfValueConfig,
    ProofOfValueResult,
    CycleResult,
    FitnessCurvePoint,
} from './evaluation/ProofOfValueRunner.js';

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

export { MonitoringDashboard } from './monitoring/MonitoringDashboard.js';
export type {
    DashboardConfig,
} from './monitoring/MonitoringDashboard.js';

export { AlertWebhooks } from './monitoring/AlertWebhooks.js';
export type {
    WebhookConfig,
    SlackPayload,
    DiscordPayload,
} from './monitoring/AlertWebhooks.js';

// ─── Memory (v0.3.0) ────────────────────────────────────

export { LayeredMemory } from './memory/LayeredMemory.js';
export type {
    LayeredMemoryConfig,
    LayeredMemorySnapshot,
    ShortTermMemory,
    MediumTermMemory,
    LongTermMemory,
    UserProfile,
    SemanticFact,
} from './memory/LayeredMemory.js';

// ─── RAG (v0.3.0) ───────────────────────────────────────

export { RAGEngine } from './rag/RAGEngine.js';
export type {
    RAGConfig,
    RAGDocument,
    RAGSearchResult,
    RAGContext,
} from './rag/RAGEngine.js';

export { InMemoryVectorStore } from './rag/VectorStoreAdapter.js';
export type {
    VectorStoreAdapter,
} from './rag/VectorStoreAdapter.js';

// ─── Reasoning (v0.3.0) ─────────────────────────────────

export { ReasoningEngine } from './reasoning/ReasoningEngine.js';
export type {
    ReasoningConfig,
    ReasoningStrategy,
    ReasoningResult,
} from './reasoning/ReasoningEngine.js';

// ─── Gene Bank (v0.4.0) ─────────────────────────────────

export {
    // Core types
    CognitiveGeneSchema,
    GeneTypeSchema,
    GeneContentSchema,
    FitnessMetricsSchema,
    LineageSchema,
    TenantInfoSchema,
    SharingScopeSchema,
    GeneExtractionResultSchema,
    GeneAdoptionResultSchema,
    createGeneId,
    meetsMinimumFitness,
    calculateFitnessDelta,
    isMarketplaceReady,

    // Components
    GeneBank,
    GeneBankConfigSchema,
    GeneExtractor,
    GeneExtractionConfigSchema,
    GeneMatcher,
    GeneMatchConfigSchema,
    SandboxTester,
    SandboxConfigSchema,
    GeneAdopter,
    GeneAdoptionConfigSchema,
} from './gene-bank/index.js';

// Storage Adapters (included)
export { InMemoryGeneStorage } from './gene-bank/adapters/InMemoryGeneStorage.js';

export type {
    // Core types
    CognitiveGene,
    GeneType,
    GeneContent,
    FitnessMetrics as GeneFitnessMetrics,
    Lineage,
    TenantInfo,
    SharingScope,
    GeneExtractionResult,
    GeneAdoptionResult,

    // Gene Bank
    GeneBankConfig,
    GeneBankStats,
    GeneStorageAdapter,
    GeneSearchFilters,

    // Gene Extractor
    GeneExtractionConfig,
    MutationContext as GeneMutationContext,

    // Gene Matcher
    GeneMatchConfig,
    MatchContext,
    GeneMatchResult,

    // Sandbox Tester
    SandboxConfig,
    SandboxTestCase,
    TestCaseResult,
    SandboxTestResult,
    BaselinePerformance,

    // Gene Adopter
    GeneAdoptionConfig,
    AdoptionRequest,
    AdoptedGeneStatus,
} from './gene-bank/index.js';

// ─── Memory Compaction (v0.4.0) ─────────────────────────

export { MemoryCompactor } from './memory-compaction/MemoryCompactor.js';
export {
    SlidingWindowStrategy,
    ImportanceBasedStrategy,
    BaseCompactionStrategy,
} from './memory-compaction/index.js';

export type {
    Message as MemoryMessage,
    CompactedMessage,
    Conversation,
    CompactionResult,
    MemoryItem,
    CompactionConfig,
    CompactionStrategy,
    ICompactionStrategy,
    PrioritizationOptions,
    ConversationSummary,
} from './memory-compaction/index.js';

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
    TokenCompressionOperator,
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

export { CanaryDeploymentManager } from './evolution/CanaryDeployment.js';
export type {
    CanaryConfig,
    CanaryDeployment,
    DeploymentMetrics,
    CanaryDecision,
} from './evolution/CanaryDeployment.js';

// ─── Evolution Boost 2.0 (100x Power!) ─────────────────

export { EvolutionBoostEngine } from './evolution/boost/EvolutionBoostEngine.js';
export type {
    EvolutionMode,
    EvolutionBoostConfig,
    EvolutionResult,
} from './evolution/boost/EvolutionBoostEngine.js';

export { ParallelEvolutionEngine } from './evolution/boost/ParallelEvolutionEngine.js';
export type {
    ParallelEvolutionConfig,
    MutationBranch,
} from './evolution/boost/ParallelEvolutionEngine.js';

export { MetaEvolutionEngine } from './evolution/boost/MetaEvolutionEngine.js';
export type {
    OperatorPerformance,
    ContextualPerformance,
    MetaEvolutionConfig,
} from './evolution/boost/MetaEvolutionEngine.js';

export { ParetoOptimizer } from './evolution/boost/ParetoOptimizer.js';
export type {
    ParetoSolution,
    OptimizationObjectives,
} from './evolution/boost/ParetoOptimizer.js';

export { GeneticRecombinator } from './evolution/boost/GeneticRecombinator.js';
export type {
    RecombinationParent,
    RecombinationResult,
} from './evolution/boost/GeneticRecombinator.js';

// Boost Operators (40-80% improvement!)
export { SemanticRestructuringOperator } from './evolution/boost/operators/SemanticRestructuringOperator.js';
export { PatternExtractionOperator } from './evolution/boost/operators/PatternExtractionOperator.js';
export { CrossoverMutationOperator } from './evolution/boost/operators/CrossoverMutationOperator.js';
export { BreakthroughOperator } from './evolution/boost/operators/BreakthroughOperator.js';

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
    CompressionConfig,
    AutonomousConfig,
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

// ─── Autonomous Agent (v0.5.0) ─────────────────────────

export { GenesisBootstrap } from './core/GenesisBootstrap.js';
export type { BootstrapResult } from './core/GenesisBootstrap.js';

export { SelfModel } from './advanced-ai/SelfModel.js';
export type { SelfAssessment } from './advanced-ai/SelfModel.js';

export { PatternMemory } from './memory/PatternMemory.js';
export type { BehavioralPattern } from './memory/PatternMemory.js';

// ─── Living Agent v0.6.0 ────────────────────────────────

export { Metacognition } from './reasoning/Metacognition.js';
export type {
    ConfidenceAssessment,
    PreResponseAnalysis,
    PostResponseInsight,
    PostResponseAnalysis,
} from './reasoning/Metacognition.js';

export { EmotionalModel } from './advanced-ai/EmotionalModel.js';
export type {
    Emotion,
    EmotionalState,
    EngagementLevel,
    ToneGuidance,
} from './advanced-ai/EmotionalModel.js';

export { CalibratedAutonomy } from './advanced-ai/CalibratedAutonomy.js';
export type {
    ValidationLevel,
    AutonomyThreshold,
    AutonomyDecision,
} from './advanced-ai/CalibratedAutonomy.js';

export { PersonalNarrative } from './memory/PersonalNarrative.js';
export type {
    RelationshipStage,
    SignificantMoment,
    SharedAchievement,
    NarrativeSummary,
} from './memory/PersonalNarrative.js';

export { AnalyticMemoryEngine } from './memory/AnalyticMemoryEngine.js';
export type {
    Entity,
    Relation,
    RelationType,
    Inference,
    MemoryQueryResult,
    TemporalPattern,
} from './memory/AnalyticMemoryEngine.js';

// ─── Living Agent v0.7.0 ────────────────────────────────

export { EnhancedSelfModel } from './advanced-ai/EnhancedSelfModel.js';
export type {
    PurposeAlignment,
    CapabilityEntry,
    HardLimit,
    EvolutionTrajectory,
    IntegratedHealth,
} from './advanced-ai/EnhancedSelfModel.js';

export { PurposeSurvival } from './evolution/PurposeSurvival.js';
export type {
    OperatingMode,
    ThreatClassification,
    GenomeSnapshot as SurvivalSnapshot,
    SurvivalStrategy,
    ModeTransition,
} from './evolution/PurposeSurvival.js';

export { StrategicAutonomy } from './advanced-ai/StrategicAutonomy.js';
export type {
    StrategicDecision,
    EvolutionPriority,
    RefusalRecord,
} from './advanced-ai/StrategicAutonomy.js';

export { computeAgentVitals } from './advanced-ai/AgentVitals.js';
export type { AgentVitals } from './advanced-ai/AgentVitals.js';

// ─── Token Utilities ────────────────────────────────────

export { estimateTokenCount, tokenEfficiency, compressionRatio } from './utils/tokens.js';

// ─── Version ────────────────────────────────────────────

export const VERSION = '0.7.0';
export const AUTHOR = 'Luis Alfredo Velasquez Duran';
export const YEAR = 2025;
