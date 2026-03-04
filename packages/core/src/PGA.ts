/**
 * PGA — Genomic Self-Evolving Prompts
 *
 * Main entry point for the PGA SDK
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2025
 */

import type { LLMAdapter } from './interfaces/LLMAdapter.js';
import type { StorageAdapter } from './interfaces/StorageAdapter.js';
import type { Genome, GenomeConfig, SelectionContext, Interaction, EvolutionGuardrails } from './types/index.js';
import { GenomeManager } from './core/GenomeManager.js';
import { PromptAssembler } from './core/PromptAssembler.js';
import { DNAProfile } from './core/DNAProfile.js';
import { FitnessTracker } from './core/FitnessTracker.js';
import { LearningAnnouncer } from './core/LearningAnnouncer.js';
import { ContextMemory } from './core/ContextMemory.js';
import { ProactiveSuggestions } from './core/ProactiveSuggestions.js';
import { EvolutionGuardrailsManager } from './evaluation/EvolutionGuardrails.js';
import { ModelRouter, type ModelRouterConfig } from './advanced-ai/ModelRouter.js';
import { MetricsCollector, type MetricsCollectorConfig } from './monitoring/MetricsCollector.js';
import { MonitoringDashboard, type DashboardConfig } from './monitoring/MonitoringDashboard.js';
import { RAGEngine, type RAGConfig } from './rag/RAGEngine.js';
import { ReasoningEngine, type ReasoningConfig } from './reasoning/ReasoningEngine.js';
import { MutationEngine, TokenCompressionOperator, type MutationContext } from './evolution/MutationOperator.js';
import { estimateTokenCount } from './utils/tokens.js';
import { DriftAnalyzer } from './evolution/DriftAnalyzer.js';
import { FitnessCalculator, type InteractionData } from './evolution/FitnessCalculator.js';
import type { FitnessVector, GenomeV2, OperativeGene, GeneCategory } from './types/GenomeV2.js';
import { GenesisBootstrap } from './core/GenesisBootstrap.js';
import { SelfModel, type SelfAssessment } from './advanced-ai/SelfModel.js';
import { PatternMemory, type BehavioralPattern } from './memory/PatternMemory.js';
import { Metacognition, type PreResponseAnalysis, type PostResponseAnalysis } from './reasoning/Metacognition.js';
import { EmotionalModel, type EmotionalState } from './advanced-ai/EmotionalModel.js';
import { CalibratedAutonomy, type AutonomyDecision } from './advanced-ai/CalibratedAutonomy.js';
import { PersonalNarrative, type NarrativeSummary, type SignificantMoment } from './memory/PersonalNarrative.js';
import { AnalyticMemoryEngine, type MemoryQueryResult } from './memory/AnalyticMemoryEngine.js';
import type { GeneBank } from './gene-bank/GeneBank.js';
import type { DriftSignal } from './evolution/DriftAnalyzer.js';

export interface PGAConfig {
    /**
     * LLM adapter (Claude, GPT, Gemini, etc.)
     */
    llm: LLMAdapter;

    /**
     * Storage adapter (Postgres, MongoDB, Redis, etc.)
     */
    storage: StorageAdapter;

    /**
     * Optional genome configuration defaults
     */
    config?: Partial<GenomeConfig>;

    /**
     * Optional model router configuration
     */
    modelRouter?: ModelRouterConfig;

    /**
     * Optional monitoring/metrics configuration
     */
    monitoring?: MetricsCollectorConfig;

    /**
     * Optional dashboard configuration
     */
    dashboard?: DashboardConfig & { enabled?: boolean };

    /**
     * Optional RAG configuration (v0.3.0)
     */
    rag?: RAGConfig;

    /**
     * Optional Reasoning configuration (v0.3.0)
     */
    reasoning?: Partial<ReasoningConfig>;

    /**
     * Optional Gene Bank for genesis bootstrap + swarm intelligence (v0.5.0)
     */
    geneBank?: GeneBank;
}

/**
 * PGA Main Class
 *
 * Example usage:
 * ```typescript
 * const pga = new PGA({
 *   llm: new ClaudeAdapter({ apiKey: '...' }),
 *   storage: new PostgresAdapter({ connectionString: '...' }),
 * });
 *
 * const genome = await pga.createGenome({ name: 'my-agent' });
 * ```
 */
export class PGA {
    private genomeManager: GenomeManager;
    private llm: LLMAdapter;
    private metricsCollector: MetricsCollector;
    private dashboard?: MonitoringDashboard;

    constructor(private pgaConfig: PGAConfig) {
        this.llm = pgaConfig.llm;
        this.genomeManager = new GenomeManager(pgaConfig.storage);

        // Initialize monitoring
        this.metricsCollector = new MetricsCollector(pgaConfig.monitoring || {
            enabled: true,
            enableCostTracking: true,
            enableAuditLogs: true,
        });

        // Initialize dashboard if enabled
        if (pgaConfig.dashboard?.enabled) {
            this.dashboard = new MonitoringDashboard(this.metricsCollector, pgaConfig.dashboard);
        }
    }

    /**
     * Initialize PGA (setup database, load seeds, etc.)
     */
    async initialize(): Promise<void> {
        await this.pgaConfig.storage.initialize();

        // Start dashboard if configured
        if (this.dashboard && this.pgaConfig.dashboard?.enabled) {
            this.dashboard.start();
        }

        // Log initialization
        this.metricsCollector.logAudit({
            level: 'info',
            component: 'pga',
            operation: 'initialize',
            message: 'PGA system initialized successfully',
        });
    }

    /**
     * Get metrics collector
     */
    getMetrics(): MetricsCollector {
        return this.metricsCollector;
    }

    /**
     * Get monitoring dashboard
     */
    getDashboard(): MonitoringDashboard | undefined {
        return this.dashboard;
    }

    /**
     * Export current metrics
     */
    exportMetrics() {
        return this.metricsCollector.exportMetrics();
    }

    /**
     * Get active alerts
     */
    getAlerts() {
        return this.metricsCollector.getAlerts();
    }

    /**
     * Get health status
     */
    getHealthStatus() {
        return this.metricsCollector.getHealthStatus();
    }

    /**
     * Shutdown PGA gracefully
     */
    shutdown(): void {
        if (this.dashboard) {
            this.dashboard.stop();
        }

        this.metricsCollector.logAudit({
            level: 'info',
            component: 'pga',
            operation: 'shutdown',
            message: 'PGA system shutdown',
        });
    }

    /**
     * Create a new genome
     */
    async createGenome(options: {
        name: string;
        config?: Partial<GenomeConfig>;
    }): Promise<GenomeInstance> {
        // Default evolution guardrails
        const defaultGuardrails: EvolutionGuardrails = {
            minQualityScore: 0.60,
            minSandboxScore: 0.70,
            minCompressionScore: 0.65,
            maxCostPerTask: 0.10,
            minStabilityWindow: 10,
            maxRollbackRate: 0.20,
            gateMode: 'AND',
        };

        const genome = await this.genomeManager.createGenome({
            name: options.name,
            config: {
                enableSandbox: true,
                mutationRate: 'balanced',
                evolutionGuardrails: defaultGuardrails,
                ...this.pgaConfig.config,
                ...options.config,
            },
        });

        // Genesis Bootstrap: seed with high-fitness genes from Gene Bank
        if (this.pgaConfig.geneBank && genome.config.autonomous?.genesisBootstrap) {
            const bootstrap = new GenesisBootstrap(this.pgaConfig.geneBank);
            const result = await bootstrap.bootstrap(
                genome,
                genome.config.autonomous.bootstrapMinFitness ?? 0.7,
            );
            if (result.genesUpgraded > 0) {
                await this.pgaConfig.storage.saveGenome(genome);
                this.metricsCollector.logAudit({
                    level: 'info',
                    component: 'pga',
                    operation: 'genesis-bootstrap',
                    message: `Bootstrapped ${result.genesUpgraded} genes from Gene Bank`,
                    metadata: { upgrades: result.upgrades },
                });
            }
        }

        return new GenomeInstance(
            genome,
            this.llm,
            this.pgaConfig.storage,
            this.metricsCollector,
            this.pgaConfig.modelRouter,
            this.pgaConfig.rag,
            this.pgaConfig.reasoning,
            this.pgaConfig.geneBank,
        );
    }

    /**
     * Load existing genome
     */
    async loadGenome(genomeId: string): Promise<GenomeInstance | null> {
        const genome = await this.genomeManager.loadGenome(genomeId);
        if (!genome) return null;

        return new GenomeInstance(
            genome,
            this.llm,
            this.pgaConfig.storage,
            this.metricsCollector,
            this.pgaConfig.modelRouter,
            this.pgaConfig.rag,
            this.pgaConfig.reasoning,
            this.pgaConfig.geneBank,
        );
    }

    /**
     * List all genomes
     */
    async listGenomes(): Promise<Genome[]> {
        return this.genomeManager.listGenomes();
    }

    /**
     * Delete genome
     */
    async deleteGenome(genomeId: string): Promise<void> {
        await this.genomeManager.deleteGenome(genomeId);
    }
}

/**
 * Genome Instance
 *
 * Represents a single genome that can be used with your agent
 */
export class GenomeInstance {
    private assembler: PromptAssembler;
    private dnaProfile: DNAProfile;
    private learningAnnouncer: LearningAnnouncer;
    private contextMemory: ContextMemory;
    private proactiveSuggestions: ProactiveSuggestions;
    private guardrailsManager: EvolutionGuardrailsManager;
    private modelRouter: ModelRouter;
    private metrics: MetricsCollector;
    private ragEngine?: RAGEngine;
    private reasoningEngine?: ReasoningEngine;
    private fitnessTracker: FitnessTracker;
    private fitnessCalculator: FitnessCalculator;
    private mutationEngine: MutationEngine;
    private driftAnalyzer: DriftAnalyzer;
    private selfModel?: SelfModel;
    private patternMemory?: PatternMemory;
    private metacognition?: Metacognition;
    private emotionalModel?: EmotionalModel;
    private calibratedAutonomy?: CalibratedAutonomy;
    private personalNarrative?: PersonalNarrative;
    private analyticMemory?: AnalyticMemoryEngine;
    private interactionCount: number = 0;

    constructor(
        private genome: Genome,
        private llm: LLMAdapter,
        private storage: StorageAdapter,
        metrics: MetricsCollector,
        modelRouterConfig?: ModelRouterConfig,
        ragConfig?: RAGConfig,
        reasoningConfig?: Partial<ReasoningConfig>,
        private geneBank?: GeneBank,
    ) {
        this.assembler = new PromptAssembler(storage, genome);
        this.dnaProfile = new DNAProfile(storage);
        this.learningAnnouncer = new LearningAnnouncer();

        // Initialize ContextMemory with LayeredMemory support
        this.contextMemory = new ContextMemory(
            storage,
            llm, // Enable LayeredMemory
            genome.config.layeredMemory
        );

        this.proactiveSuggestions = new ProactiveSuggestions(storage);
        this.guardrailsManager = new EvolutionGuardrailsManager(
            storage,
            genome.config.evolutionGuardrails,
        );
        this.modelRouter = new ModelRouter(storage, modelRouterConfig);
        this.metrics = metrics;

        // Initialize RAG Engine if configured
        if (ragConfig && genome.config.rag?.enabled) {
            this.ragEngine = new RAGEngine(llm, ragConfig);
        }

        // Initialize Reasoning Engine if configured
        if (genome.config.reasoning?.enabled) {
            this.reasoningEngine = new ReasoningEngine(llm, reasoningConfig);
        }

        // Evolution components
        this.fitnessTracker = new FitnessTracker(storage, genome);
        this.fitnessCalculator = new FitnessCalculator();
        this.mutationEngine = new MutationEngine();
        // Register LLM-powered token compression operator
        this.mutationEngine.registerOperator(new TokenCompressionOperator(llm));
        this.driftAnalyzer = new DriftAnalyzer();

        // Autonomous Agent: SelfModel (metacognition)
        if (genome.config.autonomous?.enableSelfModel) {
            this.selfModel = new SelfModel(genome, this.driftAnalyzer);
            this.assembler.setSelfModel(this.selfModel);
        }

        // Autonomous Agent: Pattern Memory (predictive patterns)
        if (genome.config.autonomous?.enablePatternMemory) {
            this.patternMemory = new PatternMemory(genome.config.autonomous.maxPatterns ?? 50);
            this.assembler.setPatternMemory(this.patternMemory);
        }

        // Autonomous Agent: Metacognition (pre/post response analysis)
        if (genome.config.autonomous?.enableMetacognition) {
            this.metacognition = new Metacognition(
                () => this.selfModel?.assess() ?? null,
            );
            this.assembler.setMetacognition(this.metacognition);
        }

        // Autonomous Agent: EmotionalModel (computational empathy)
        if (genome.config.autonomous?.enableEmotionalModel) {
            this.emotionalModel = new EmotionalModel();
            this.assembler.setEmotionalModel(this.emotionalModel);
        }

        // Autonomous Agent: CalibratedAutonomy (adaptive autonomy)
        if (genome.config.autonomous?.enableCalibratedAutonomy) {
            this.calibratedAutonomy = new CalibratedAutonomy();
            this.assembler.setCalibratedAutonomy(this.calibratedAutonomy);
        }

        // Autonomous Agent: PersonalNarrative (relationship memory)
        if (genome.config.autonomous?.enablePersonalNarrative) {
            this.personalNarrative = new PersonalNarrative();
            this.assembler.setPersonalNarrative(this.personalNarrative);
        }

        // Autonomous Agent: AnalyticMemoryEngine (knowledge graph)
        if (genome.config.autonomous?.enableAnalyticMemory) {
            this.analyticMemory = new AnalyticMemoryEngine();
            this.assembler.setAnalyticMemory(this.analyticMemory);
        }
    }

    /**
     * Get genome ID
     */
    get id(): string {
        return this.genome.id;
    }

    /**
     * Get genome name
     */
    get name(): string {
        return this.genome.name;
    }

    /**
     * Get welcome message for the agent to announce PGA capabilities
     *
     * @param style - Message style: 'short' | 'detailed' | 'technical' | 'casual'
     * @returns Welcome message explaining PGA capabilities
     */
    getWelcomeMessage(style: 'short' | 'detailed' | 'technical' | 'casual' = 'detailed'): string {
        const messages = {
            short: `🧬 I now have PGA — Genomic Self-Evolving Prompts integrated into my DNA!

This means I can:
✓ Learn from every interaction
✓ Adapt uniquely to each user
✓ Improve continuously without manual updates

I'm ready to evolve with you!`,

            detailed: `🧬 Great news! I now have PGA — Genomic Self-Evolving Prompts integrated into my core system!

What this means for you:

🎯 **Adaptive Intelligence**
   → I learn from every conversation we have
   → I adapt my responses to match your unique style and preferences
   → I remember what works best for you

🔄 **Continuous Evolution**
   → My capabilities improve automatically over time
   → No manual updates needed — I evolve naturally
   → Each interaction makes me better at helping you

🛡️ **Built-in Safety**
   → Three-layer genomic architecture (Immutable Core + Adaptive Layers)
   → Automatic rollback if performance drops
   → Sandbox-tested improvements before deployment

📊 **What happens next:**
   1. I'll start learning your communication style
   2. I'll track which approaches work best for you
   3. I'll continuously optimize my responses
   4. You'll notice me getting better at understanding your needs

Let's evolve together! How can I help you today?`,

            technical: `🧬 System Update: PGA (Genomic Self-Evolving Prompts) — ACTIVE

**Architecture Overview:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
├─ Layer 0: Immutable DNA (Core Identity, Ethics, Security)
│  └─ Status: LOCKED — Never mutates
├─ Layer 1: Operative Genes (Tool Usage, Problem Solving)
│  └─ Status: ACTIVE — Slow mutation with validation
└─ Layer 2: Epigenomes (User Preferences, Communication Style)
   └─ Status: ACTIVE — Fast mutation with daily adaptation

**Enabled Capabilities:**
→ Natural Selection Loop (Transcription → Variation → Simulation → Selection)
→ User DNA Profiling (Cognitive patterns, preferences, expertise)
→ Epsilon-Greedy Selection (Exploration: ${this.genome.config.epsilonExplore || 0.1})
→ Sandbox Testing (${this.genome.config.enableSandbox ? 'ENABLED' : 'DISABLED'})
→ Mutation Rate: ${this.genome.config.mutationRate.toUpperCase()}
→ Immune System: Auto-rollback on performance drops >20%

**Fitness Optimization:**
├─ Cognitive Compression (efficiency)
├─ Intervention Rate (autonomy)
└─ Execution Precision (reliability)

**Learning Protocol:**
Every interaction contributes to:
1. Allele fitness tracking (EMA updates)
2. User DNA profile evolution
3. Mutation proposal generation
4. Performance optimization

System ready. Genomic evolution: INITIALIZED.`,

            casual: `🧬 Hey! Exciting update — I just got upgraded with PGA (think of it as evolutionary AI)!

Here's the cool part:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 I'll learn your style
   → Prefer technical answers? I'll adapt
   → Like casual chat? I'll match that vibe
   → Need quick responses? I'll optimize for speed

🚀 I get better over time
   → Each conversation teaches me something new
   → I remember what works best for you
   → No updates needed — I evolve naturally

🛡️ Built-in safety nets
   → If something doesn't work, I auto-rollback
   → Core values never change (safety first!)
   → All improvements are tested before going live

So basically... I'm not just an AI anymore. I'm YOUR AI, continuously evolving to serve you better.

Ready to see what we can do together? 😊`,
        };

        return messages[style];
    }

    /**
     * Assemble optimized prompt for current context
     */
    async assemblePrompt(context: SelectionContext, currentMessage?: string): Promise<string> {
        return this.assembler.assemblePrompt(context, currentMessage);
    }

    /**
     * Chat with PGA optimization + Intelligence Boost + Auto Monitoring
     */
    async chat(userMessage: string, context: SelectionContext): Promise<string> {
        const requestId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        let error: string | undefined;

        try {
            // Assemble prompt with intelligence boost (memory + proactive suggestions)
            let prompt = await this.assemblePrompt(context, userMessage);

            // Augment with RAG if enabled
            if (this.ragEngine) {
                const ragContext = await this.ragEngine.augment(userMessage, prompt);
                prompt = ragContext.augmentedPrompt;
            }

            // Use Reasoning if enabled
            let response: { content: string };
            if (this.reasoningEngine) {
                const reasoningResult = await this.reasoningEngine.reason(
                    userMessage,
                    prompt,
                    this.genome.config.reasoning?.defaultStrategy
                );
                response = { content: reasoningResult.answer };
            } else {
                // Standard LLM chat
                response = await this.llm.chat(
                    [
                        { role: 'system', content: prompt },
                        { role: 'user', content: userMessage },
                    ],
                );
            }

            // Calculate tokens (rough estimate)
            const inputTokens = Math.ceil((prompt.length + userMessage.length) / 4);
            const outputTokens = Math.ceil(response.content.length / 4);

            // Record metrics
            this.metrics.recordRequest({
                requestId,
                duration: Date.now() - startTime,
                success: true,
                model: 'pga-genome', // Could be enhanced with actual model info
                inputTokens,
                outputTokens,
            });

            // Log audit
            this.metrics.logAudit({
                level: 'info',
                component: 'genome',
                operation: 'chat',
                message: 'Chat completed successfully',
                userId: context.userId,
                genomeId: this.genome.id,
                duration: Date.now() - startTime,
                metadata: {
                    inputTokens,
                    outputTokens,
                },
            });

            // Record fitness for drift detection using FitnessCalculator
            const interactionData: InteractionData = {
                success: true,
                quality: 0.7,
                inputTokens,
                outputTokens,
                latency: Date.now() - startTime,
                model: 'unknown',
                interventionNeeded: false,
                timestamp: new Date(),
            };
            const fitnessVector = this.fitnessCalculator.computeFitness([interactionData]);
            this.driftAnalyzer.recordFitness(fitnessVector);

            // Continuous Evolution Loop
            this.interactionCount++;
            const autoConfig = this.genome.config.autonomous;
            if (autoConfig?.continuousEvolution && this.interactionCount % (autoConfig.evolveEveryN ?? 10) === 0) {
                this.runEvolutionCycle().catch(err =>
                    this.metrics.logAudit({
                        level: 'warning',
                        component: 'genome',
                        operation: 'auto-evolve',
                        message: `Auto-evolution failed: ${err instanceof Error ? err.message : String(err)}`,
                        genomeId: this.genome.id,
                    })
                );
            }

            // If userId provided, enable intelligence features
            if (context.userId) {
                // Get previous DNA for learning detection
                const previousDNA = await this.dnaProfile.getDNA(context.userId, this.genome.id);

                // Update DNA and detect learning
                await this.recordInteraction({
                    userId: context.userId,
                    userMessage,
                    assistantResponse: response.content,
                    toolCalls: [],
                    timestamp: new Date(),
                });

                // Get updated DNA
                const updatedDNA = await this.dnaProfile.getDNA(context.userId, this.genome.id);

                // Detect learning events
                const learningEvents = this.learningAnnouncer.detectLearning(previousDNA, updatedDNA);

                // If significant learning happened, announce it
                if (learningEvents.length > 0 && learningEvents[0].confidence > 0.7) {
                    const announcement = this.learningAnnouncer.formatLearningAnnouncement(learningEvents);
                    if (announcement) {
                        return response.content + '\n\n' + announcement;
                    }
                }
            }

            return response.content;
        } catch (err) {
            error = err instanceof Error ? err.message : String(err);

            // Record failed request
            this.metrics.recordRequest({
                requestId,
                duration: Date.now() - startTime,
                success: false,
                model: 'pga-genome',
                inputTokens: 0,
                outputTokens: 0,
                error,
            });

            // Log error
            this.metrics.logAudit({
                level: 'error',
                component: 'genome',
                operation: 'chat',
                message: `Chat failed: ${error}`,
                userId: context.userId,
                genomeId: this.genome.id,
                duration: Date.now() - startTime,
                error: {
                    name: err instanceof Error ? err.name : 'Error',
                    message: error,
                    stack: err instanceof Error ? err.stack : undefined,
                },
            });

            throw err;
        }
    }

    /**
     * Record interaction (enables auto-learning)
     */
    async recordInteraction(interaction: Omit<Interaction, 'genomeId'>): Promise<void> {
        const fullInteraction = {
            ...interaction,
            genomeId: this.genome.id,
        };

        // Record to storage
        await this.storage.recordInteraction(fullInteraction);

        // Update user DNA profile
        await this.dnaProfile.updateDNA(interaction.userId, this.genome.id, fullInteraction);

        // Record fitness for active alleles using FitnessTracker
        for (const allele of this.genome.layers.layer1.filter(a => a.status === 'active')) {
            // Use a baseline score based on whether the interaction was successful
            const score = interaction.assistantResponse ? 0.7 : 0.3;
            await this.fitnessTracker.recordPerformance(1, allele.gene, allele.variant, score);
        }

        // Pattern Memory: record interaction data
        if (this.patternMemory) {
            this.patternMemory.recordInteraction({
                taskType: interaction.taskType,
                success: !!interaction.assistantResponse,
                timestamp: interaction.timestamp,
            });
        }

        // Personal Narrative: record interaction for relationship tracking
        if (this.personalNarrative) {
            this.personalNarrative.recordInteraction({
                topic: interaction.taskType,
                wasSuccessful: !!interaction.assistantResponse,
                userExpressedGratitude: interaction.userMessage?.toLowerCase().includes('thanks') ||
                    interaction.userMessage?.toLowerCase().includes('thank you'),
            });
        }

        // Analytic Memory: record observations from interaction
        if (this.analyticMemory && interaction.taskType) {
            this.analyticMemory.recordObservation({
                subject: interaction.userId,
                action: 'performed',
                object: interaction.taskType,
                timestamp: interaction.timestamp,
            });
        }

        // Metacognition: post-response analysis
        if (this.metacognition && interaction.assistantResponse) {
            this.metacognition.analyzePostResponse(
                interaction.userMessage,
                interaction.assistantResponse,
                !!interaction.assistantResponse,
            );
        }

        // Calibrated Autonomy: record success
        if (this.calibratedAutonomy && interaction.taskType && interaction.assistantResponse) {
            this.calibratedAutonomy.recordSuccess(interaction.taskType);
        }

        // Swarm: auto-publish high-fitness genes
        if (this.geneBank && this.genome.config.autonomous?.enableSwarm) {
            const threshold = this.genome.config.autonomous.autoPublishThreshold ?? 0.85;
            for (const allele of this.genome.layers.layer1.filter(a => a.status === 'active')) {
                if (allele.fitness >= threshold && !allele.publishedToSwarm) {
                    this.autoPublishGene(allele).catch(() => {});
                }
            }
        }
    }

    /**
     * Get user DNA profile
     */
    async getDNA(userId: string) {
        return this.dnaProfile.getDNA(userId, this.genome.id);
    }

    /**
     * Record user feedback
     */
    async recordFeedback(userId: string, gene: string, sentiment: 'positive' | 'negative' | 'neutral'): Promise<void> {
        await this.storage.recordFeedback({
            genomeId: this.genome.id,
            userId,
            gene,
            sentiment,
            timestamp: new Date(),
        });
    }

    /**
     * Add allele dynamically to genome
     *
     * Living OS v1.0: Dynamic gene injection
     */
    async addAllele(
        layer: 0 | 1 | 2,
        gene: string,
        variant: string,
        content: string,
    ): Promise<void> {
        const newAllele = {
            gene,
            variant,
            content,
            fitness: 0.5,
            sampleCount: 0,
            generation: 0,
            status: 'active' as const,
            createdAt: new Date(),
        };

        // Add to genome layers
        this.genome.layers[`layer${layer}` as 'layer0' | 'layer1' | 'layer2'].push(newAllele);

        // Save to storage
        await this.storage.saveGenome(this.genome);

        // Log mutation
        await this.storage.logMutation({
            genomeId: this.genome.id,
            layer,
            gene,
            variant,
            mutationType: 'user_feedback',
            parentVariant: null,
            deployed: true,
            createdAt: new Date(),
        });
    }

    /**
     * Trigger advanced mutation cycle with operators + Auto Monitoring
     *
     * Living OS v1.0 Must-Have: Multi-gate promotion with economic validation
     */
    async mutate(options?: {
        operators?: string[];
        candidates?: number;
        minImprovement?: number;
        taskType?: string;
        layer?: 0 | 1 | 2;
        gene?: string;
    }): Promise<{
        applied: boolean;
        reason: string;
        improvement?: number;
        gateResults?: {
            quality: { passed: boolean; score: number };
            sandbox: { passed: boolean; score: number };
            economic: { passed: boolean; score: number };
            stability: { passed: boolean; score: number };
        };
    }> {
        const startTime = Date.now();
        const opts = {
            operators: options?.operators || ['compress_instructions', 'reorder_constraints'],
            candidates: options?.candidates || 3,
            minImprovement: options?.minImprovement || 0.05,
            taskType: options?.taskType || 'general',
            layer: options?.layer ?? 2, // Default to Layer 2 (fast mutation)
            gene: options?.gene || 'system_instructions',
        };

        try {

        // ═══════════════════════════════════════════════════════
        // MUTATION PIPELINE WITH MULTI-GATE VALIDATION
        // ═══════════════════════════════════════════════════════

        // Step 1: Find current allele
        const layerKey = `layer${opts.layer}` as 'layer0' | 'layer1' | 'layer2';
        const currentAlleles = this.genome.layers[layerKey].filter(
            a => a.gene === opts.gene && a.status === 'active'
        );

        if (currentAlleles.length === 0) {
            return {
                applied: false,
                reason: `No active allele found for gene '${opts.gene}' in layer ${opts.layer}`,
            };
        }

        const currentAllele = currentAlleles[0];

        // Step 2: Generate real mutation candidates using MutationEngine
        // Include drift signals as evidence for intelligent strategy selection
        const driftAnalysis = this.driftAnalyzer.analyzeDrift();
        const mutationContext: MutationContext = {
            genome: this.toGenomeV2(),
            targetChromosome: opts.layer <= 1 ? 'c1' : 'c2',
            targetGene: this.toOperativeGene(currentAllele),
            reason: `Mutation for ${opts.taskType}: gene ${opts.gene}`,
            evidence: driftAnalysis.isDrifting
                ? { driftSignals: driftAnalysis.signals.map(s => ({ type: s.type, severity: s.severity })) }
                : undefined,
        };

        let mutatedContent = currentAllele.content;
        let expectedImprovement = 0.05;

        try {
            const mutants = await this.mutationEngine.generateMutants(mutationContext, opts.candidates);
            if (mutants.length > 0) {
                // Select best mutant by expected improvement
                const bestMutant = mutants.sort((a, b) => b.expectedImprovement - a.expectedImprovement)[0];
                // Extract the mutated gene content
                const mutatedGene = bestMutant.mutant.chromosomes.c1.operations.find(
                    g => g.category === (currentAllele.gene as GeneCategory)
                );
                if (mutatedGene) {
                    mutatedContent = mutatedGene.content;
                }
                expectedImprovement = bestMutant.expectedImprovement;
            }
        } catch {
            // If mutation engine fails, use content as-is with minimal improvement
        }

        const mutationCandidate = {
            layer: opts.layer,
            gene: opts.gene,
            variant: `${currentAllele.variant}_v${Date.now()}`,
            content: mutatedContent,
            fitness: currentAllele.fitness + expectedImprovement,
            sandboxScore: 0.75,
            sampleCount: currentAllele.sampleCount || 0,
            rollbackCount: 0,
        };

        // Step 3: Evaluate against Evolution Guardrails
        const gateResult = await this.guardrailsManager.evaluateCandidate(
            mutationCandidate,
            this.genome.id,
        );

            // Step 4: Make promotion decision
            const result = gateResult.finalDecision === 'promote' ? {
                applied: true,
                reason: gateResult.reason,
                improvement: mutationCandidate.fitness - currentAllele.fitness,
                gateResults: {
                    quality: gateResult.gates.quality,
                    sandbox: gateResult.gates.sandbox,
                    economic: gateResult.gates.economic,
                    stability: gateResult.gates.stability,
                },
            } : gateResult.finalDecision === 'canary' ? {
                applied: false,
                reason: `${gateResult.reason} - Canary deployment not yet implemented`,
                gateResults: {
                    quality: gateResult.gates.quality,
                    sandbox: gateResult.gates.sandbox,
                    economic: gateResult.gates.economic,
                    stability: gateResult.gates.stability,
                },
            } : {
                applied: false,
                reason: gateResult.reason,
                gateResults: {
                    quality: gateResult.gates.quality,
                    sandbox: gateResult.gates.sandbox,
                    economic: gateResult.gates.economic,
                    stability: gateResult.gates.stability,
                },
            };

            // Log mutation attempt
            this.metrics.logAudit({
                level: result.applied ? 'info' : 'warning',
                component: 'genome',
                operation: 'mutate',
                message: result.applied ? 'Mutation applied successfully' : `Mutation rejected: ${result.reason}`,
                genomeId: this.genome.id,
                duration: Date.now() - startTime,
                metadata: {
                    layer: opts.layer,
                    gene: opts.gene,
                    operators: opts.operators,
                    decision: gateResult.finalDecision,
                    improvement: result.improvement,
                    gatesPassed: Object.values(gateResult.gates).filter(g => g.passed).length,
                    totalGates: Object.keys(gateResult.gates).length,
                },
            });

            return result;
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);

            // Log mutation error
            this.metrics.logAudit({
                level: 'error',
                component: 'genome',
                operation: 'mutate',
                message: `Mutation failed: ${error}`,
                genomeId: this.genome.id,
                duration: Date.now() - startTime,
                error: {
                    name: err instanceof Error ? err.name : 'Error',
                    message: error,
                    stack: err instanceof Error ? err.stack : undefined,
                },
            });

            throw err;
        }
    }

    /**
     * Rollback to previous allele version
     *
     * Living OS v1.0: Safe rollback with lineage tracking
     */
    async rollback(options: {
        layer: 0 | 1 | 2;
        gene: string;
        variant: string;
    }): Promise<void> {
        const { layer, gene, variant } = options;
        const layerKey = `layer${layer}` as 'layer0' | 'layer1' | 'layer2';
        const alleles = this.genome.layers[layerKey];

        // Find the allele
        const allele = alleles.find(a => a.gene === gene && a.variant === variant);
        if (!allele) {
            throw new Error(`Allele not found: ${gene}:${variant}`);
        }

        // Find parent variant
        if (!allele.parentVariant) {
            throw new Error(`No parent variant to rollback to for ${gene}:${variant}`);
        }

        const parentAllele = alleles.find(a => a.gene === gene && a.variant === allele.parentVariant);
        if (!parentAllele) {
            throw new Error(`Parent variant not found: ${allele.parentVariant}`);
        }

        // Retire current variant
        allele.status = 'retired';

        // Reactivate parent
        parentAllele.status = 'active';

        // Update lineage
        if (this.genome.lineage) {
            this.genome.lineage.mutationOps = [
                ...(this.genome.lineage.mutationOps || []),
                'rollback',
            ];
        }

        // Save
        await this.storage.saveGenome(this.genome);

        // Log rollback
        await this.storage.logMutation({
            genomeId: this.genome.id,
            layer,
            gene,
            variant: parentAllele.variant,
            mutationType: 'rollback',
            parentVariant: allele.variant,
            deployed: true,
            reason: 'Manual rollback requested',
            createdAt: new Date(),
        });
    }

    /**
     * Chat with metrics tracking
     *
     * Living OS v1.0: Returns response + performance metrics
     */
    async chatWithMetrics(userMessage: string, context: SelectionContext): Promise<{
        content: string;
        metrics: {
            tokensUsed: number;
            responseTime: number;
            fitnessScore: number;
        };
    }> {
        const startTime = Date.now();
        const content = await this.chat(userMessage, context);
        const endTime = Date.now();

        const tokensUsed = Math.ceil((userMessage.length + content.length) / 4);
        const responseTime = endTime - startTime;

        // Get current fitness from analytics
        const analytics = await this.storage.getAnalytics(this.genome.id);
        const fitnessScore = analytics.userSatisfaction || 0.5;

        return {
            content,
            metrics: {
                tokensUsed,
                responseTime,
                fitnessScore,
            },
        };
    }

    /**
     * Publish gene to registry for cross-genome inheritance
     *
     * Living OS v1.0: Share successful genes across family
     */
    async publishGeneToRegistry(
        gene: string,
        variant: string,
        description?: string,
    ): Promise<string> {
        if (!this.genome.familyId) {
            throw new Error('Genome must have familyId to publish to registry');
        }

        // Find the allele across all layers
        let allele: typeof this.genome.layers.layer0[0] | undefined;
        let layer: 0 | 1 | 2 = 0;

        for (const [layerName, alleles] of Object.entries(this.genome.layers)) {
            allele = alleles.find(a => a.gene === gene && a.variant === variant);
            if (allele) {
                layer = parseInt(layerName.replace('layer', '')) as 0 | 1 | 2;
                break;
            }
        }

        if (!allele) {
            throw new Error(`Allele not found: ${gene}:${variant}`);
        }

        // Calculate success rate
        const successRate = allele.fitness;

        // Create registry entry ID
        const registryId = `${this.genome.familyId}_${gene}_${variant}_${Date.now()}`;

        // TODO: Save to gene registry table via storage adapter
        // Will include: familyId, gene, variant, content, layer, fitness, successRate, metadata
        // For now, log as mutation with special type
        await this.storage.logMutation({
            genomeId: this.genome.id,
            layer,
            gene,
            variant,
            mutationType: 'user_feedback', // Using this as placeholder
            parentVariant: null,
            deployed: true,
            reason: `Published to registry: ${description || 'No description'} (fitness: ${successRate})`,
            createdAt: new Date(),
        });

        return registryId;
    }

    /**
     * Inherit gene from registry
     *
     * Living OS v1.0: Import successful genes from family registry
     */
    async inheritGeneFromRegistry(
        familyId: string,
        gene: string,
        targetLayer?: 0 | 1 | 2,
    ): Promise<void> {
        if (this.genome.familyId && this.genome.familyId !== familyId) {
            throw new Error(`Cannot inherit from different family: ${familyId}`);
        }

        // TODO: Query gene registry table for best variant of this gene
        // Will filter by: familyId, gene, and optionally targetLayer
        // Then call addAllele() with inherited content
        // For now, throw error indicating feature under development
        throw new Error(
            `Gene Registry inheritance under development - ` +
            `will inherit gene '${gene}' from family '${familyId}' to layer ${targetLayer ?? 'auto'}`
        );
    }

    /**
     * Get evolution health metrics
     *
     * Living OS v1.0: Monitor genome evolution status
     */
    async getEvolutionHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'critical';
        metrics: {
            avgFitness: number;
            mutationRate: number;
            stabilityScore: number;
            generationCount: number;
        };
        warnings: string[];
    }> {
        const analytics = await this.storage.getAnalytics(this.genome.id);

        // Calculate average fitness across all active alleles
        const allAlleles = [
            ...this.genome.layers.layer0,
            ...this.genome.layers.layer1,
            ...this.genome.layers.layer2,
        ].filter(a => a.status === 'active');

        const avgFitness = allAlleles.length > 0
            ? allAlleles.reduce((sum, a) => sum + a.fitness, 0) / allAlleles.length
            : 0.5;

        const generationCount = Math.max(...allAlleles.map(a => a.generation || 0), 0);

        const warnings: string[] = [];
        if (avgFitness < 0.4) warnings.push('Low average fitness detected');
        if (analytics.totalMutations > 100 && analytics.avgFitnessImprovement < 0.02) {
            warnings.push('Mutation plateau detected');
        }

        const status: 'healthy' | 'degraded' | 'critical' =
            avgFitness >= 0.6 ? 'healthy' :
            avgFitness >= 0.4 ? 'degraded' : 'critical';

        return {
            status,
            metrics: {
                avgFitness,
                mutationRate: analytics.totalMutations / Math.max(analytics.totalInteractions, 1),
                stabilityScore: analytics.userSatisfaction || 0.5,
                generationCount,
            },
            warnings,
        };
    }

    /**
     * Get analytics
     */
    async getAnalytics() {
        return this.storage.getAnalytics(this.genome.id);
    }

    /**
     * Get Evolution Guardrails report
     *
     * Living OS v1.0 Must-Have: Transparency into gate thresholds
     */
    getGuardrailsReport(): string {
        return this.guardrailsManager.getGuardrailsReport();
    }

    /**
     * Update Evolution Guardrails configuration
     *
     * Living OS v1.0 Must-Have: Dynamic threshold tuning
     */
    updateGuardrails(updates: Partial<EvolutionGuardrails>): void {
        this.guardrailsManager.updateGuardrails(updates);
    }

    /**
     * Get optimal model for task (Multi-Model Routing)
     *
     * Living OS v1.0 Must-Have: Cost optimization via intelligent routing
     */
    async getOptimalModel(userMessage: string, context?: string) {
        return this.modelRouter.routeTask({
            userMessage,
            context,
            genomeId: this.genome.id,
        });
    }

    /**
     * Get model routing analytics
     *
     * Living OS v1.0 Must-Have: Monitor routing performance
     */
    getRoutingAnalytics() {
        return this.modelRouter.getRoutingAnalytics();
    }

    /**
     * Export genome (for backup/transfer)
     */
    async export(): Promise<Genome> {
        return this.genome;
    }

    /**
     * Get learning summary for user transparency
     */
    async getLearningSummary(userId: string): Promise<string> {
        const dna = await this.dnaProfile.getDNA(userId, this.genome.id);
        const interactions = await this.storage.getRecentInteractions?.(this.genome.id, userId, 50) || [];

        // Get recent learning events (last 10 interactions)
        const recentEvents = [];
        for (let i = 1; i < Math.min(interactions.length, 10); i++) {
            const prevDNA = await this.dnaProfile.getDNA(userId, this.genome.id);
            const events = this.learningAnnouncer.detectLearning(prevDNA, dna);
            recentEvents.push(...events);
        }

        return this.learningAnnouncer.generateLearningSummary(dna, recentEvents);
    }

    /**
     * Get proactive suggestions for current context
     */
    async getProactiveSuggestions(userId: string, currentMessage: string) {
        return this.proactiveSuggestions.generateSuggestions(
            userId,
            this.genome.id,
            currentMessage,
        );
    }

    /**
     * Get conversation context/memory
     */
    async getConversationContext(userId: string) {
        return this.contextMemory.buildContext(userId, this.genome.id);
    }

    /**
     * Get drift analysis report
     */
    getDriftAnalysis() {
        return this.driftAnalyzer.analyzeDrift();
    }

    /**
     * Get agent self-assessment (metacognition)
     */
    getSelfAssessment(): SelfAssessment | null {
        return this.selfModel?.assess() ?? null;
    }

    /**
     * Get detected behavioral patterns
     */
    getPatterns(): BehavioralPattern[] {
        return this.patternMemory?.getPatterns() ?? [];
    }

    /**
     * Get predictions based on behavioral patterns
     */
    getPredictions(): Array<{ prediction: string; confidence: number }> {
        return this.patternMemory?.getPredictions() ?? [];
    }

    /**
     * Get metacognitive pre-response analysis
     */
    getPreResponseAnalysis(message: string): PreResponseAnalysis | null {
        return this.metacognition?.analyzePreResponse(message) ?? null;
    }

    /**
     * Get metacognitive post-response analysis
     */
    getPostResponseAnalysis(message: string, response: string, wasSuccessful: boolean): PostResponseAnalysis | null {
        return this.metacognition?.analyzePostResponse(message, response, wasSuccessful) ?? null;
    }

    /**
     * Infer emotional state from a message
     */
    inferEmotion(message: string): EmotionalState | null {
        return this.emotionalModel?.inferEmotion(message) ?? null;
    }

    /**
     * Evaluate autonomy for a task type
     */
    evaluateAutonomy(taskType: string, riskLevel?: 'low' | 'medium' | 'high'): AutonomyDecision | null {
        return this.calibratedAutonomy?.evaluate(taskType, riskLevel) ?? null;
    }

    /**
     * Record an autonomy correction from the user
     */
    recordAutonomyCorrection(taskType: string, correctionType: 'undo' | 'modify' | 'reject' | 'approve'): void {
        this.calibratedAutonomy?.recordCorrection({
            taskType,
            wasAutonomous: true,
            correctionType,
            timestamp: new Date(),
        });
    }

    /**
     * Get personal narrative summary
     */
    getNarrativeSummary(): NarrativeSummary | null {
        return this.personalNarrative?.getSummary() ?? null;
    }

    /**
     * Find a relevant historical callback for a topic
     */
    findHistoryCallback(topic: string): SignificantMoment | null {
        return this.personalNarrative?.callbackToHistory(topic) ?? null;
    }

    /**
     * Query the analytic memory knowledge graph
     */
    queryMemory(question: string): MemoryQueryResult | null {
        return this.analyticMemory?.query(question) ?? null;
    }

    /**
     * Record an observation to the analytic memory
     */
    recordMemoryObservation(observation: {
        subject: string;
        action: string;
        object?: string;
        context?: Record<string, unknown>;
    }): void {
        this.analyticMemory?.recordObservation(observation);
    }

    // ═══════════════════════════════════════════════════════
    // AUTONOMOUS AGENT: PRIVATE METHODS
    // ═══════════════════════════════════════════════════════

    /**
     * Continuous Evolution Loop — proactive auto-evolution.
     * Runs periodically (fire-and-forget from chat).
     */
    private async runEvolutionCycle(): Promise<void> {
        const autoConfig = this.genome.config.autonomous;
        const drift = this.driftAnalyzer.analyzeDrift();

        // 1. Auto-mutate on drift
        if (autoConfig?.autoMutateOnDrift !== false && drift.isDrifting) {
            for (const signal of drift.signals) {
                if (signal.severity === 'minor') continue;
                const target = this.driftToMutationTarget(signal);
                await this.mutate({
                    layer: target.layer,
                    gene: target.gene,
                    taskType: `auto-evolve:${signal.type}`,
                });
            }
        }

        // 2. Auto-compress on token pressure
        if (autoConfig?.autoCompressOnPressure !== false) {
            const totalC1Tokens = this.genome.layers.layer1
                .filter(a => a.status === 'active')
                .reduce((sum, a) => sum + estimateTokenCount(a.content), 0);
            const threshold = this.genome.config.compression?.autoCompressThreshold ?? 1600;
            if (totalC1Tokens > threshold) {
                await this.compressGenes();
            }
        }

        // 3. Swarm: auto-import genes when struggling
        if (this.geneBank && autoConfig?.enableSwarm && drift.isDrifting) {
            const targetSeverity = autoConfig.autoImportOnDrift ?? 'severe';
            const severityRank = (s: string) =>
                s === 'critical' ? 3 : s === 'major' ? 2 : s === 'moderate' ? 1 : 0;
            for (const signal of drift.signals) {
                if (severityRank(signal.severity) >= severityRank(targetSeverity)) {
                    await this.autoImportGene(signal);
                }
            }
        }

        this.metrics.logAudit({
            level: 'info',
            component: 'genome',
            operation: 'evolution-cycle',
            message: `Evolution cycle #${this.interactionCount} completed`,
            genomeId: this.genome.id,
            metadata: { isDrifting: drift.isDrifting, signalCount: drift.signals.length },
        });
    }

    /**
     * Map drift signal type to appropriate gene + layer target.
     */
    private driftToMutationTarget(signal: DriftSignal): { layer: 0 | 1 | 2; gene: string } {
        const mapping: Record<string, { layer: 0 | 1 | 2; gene: string }> = {
            'quality-decline': { layer: 1, gene: 'coding-patterns' },
            'efficiency-decline': { layer: 1, gene: 'tool-usage' },
            'cost-increase': { layer: 1, gene: 'tool-usage' },
            'intervention-increase': { layer: 1, gene: 'coding-patterns' },
            'latency-increase': { layer: 1, gene: 'tool-usage' },
        };
        return mapping[signal.type] || { layer: 2, gene: 'communication-style' };
    }

    /**
     * Swarm: auto-publish a high-fitness gene to Gene Bank.
     */
    private async autoPublishGene(allele: typeof this.genome.layers.layer1[0]): Promise<void> {
        if (!this.geneBank) return;

        try {
            const cognitiveGene = {
                id: `auto_${this.genome.id}_${allele.gene}_${Date.now()}`,
                version: '1.0.0',
                name: `${allele.gene} from ${this.genome.name}`,
                description: `Auto-published ${allele.gene} gene with fitness ${allele.fitness.toFixed(2)}`,
                type: this.geneCategoryToType(allele.gene),
                domain: 'general',
                content: {
                    instruction: allele.content,
                    requiredCapabilities: [] as string[],
                    applicableContexts: [] as string[],
                    contraindications: [] as string[],
                    metadata: {} as Record<string, unknown>,
                },
                fitness: {
                    overallFitness: allele.fitness,
                    taskSuccessRate: allele.fitness,
                    tokenEfficiency: 0.7,
                    responseQuality: allele.fitness,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
                lineage: {
                    parentGeneId: null,
                    generation: allele.generation || 0,
                    ancestors: [] as string[],
                    mutationHistory: [] as Array<{ timestamp: string; change: string; fitnessGain: number }>,
                },
                tenant: {
                    tenantId: this.genome.familyId || this.genome.id,
                    createdBy: this.genome.id,
                    scope: 'tenant' as const,
                },
                tags: [allele.gene],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await this.geneBank.storeGene(cognitiveGene as unknown as Parameters<GeneBank['storeGene']>[0]);
            allele.publishedToSwarm = true;

            this.metrics.logAudit({
                level: 'info',
                component: 'genome',
                operation: 'swarm-publish',
                message: `Auto-published gene ${allele.gene} (fitness: ${allele.fitness.toFixed(2)})`,
                genomeId: this.genome.id,
            });
        } catch {
            // Non-critical — don't block
        }
    }

    /**
     * Swarm: auto-import a gene from Gene Bank to address drift.
     */
    private async autoImportGene(signal: DriftSignal): Promise<void> {
        if (!this.geneBank) return;

        const target = this.driftToMutationTarget(signal);
        const geneTypes = [this.geneCategoryToType(target.gene)];

        try {
            const candidates = await this.geneBank.searchGenes({
                type: geneTypes,
                minFitness: 0.75,
                sortBy: 'fitness',
                sortOrder: 'desc',
                limit: 1,
            });

            if (candidates.length === 0) return;

            const bestGene = candidates[0];

            // Inject as a new allele variant
            await this.addAllele(
                target.layer,
                target.gene,
                `swarm_${bestGene.id.slice(0, 8)}_${Date.now()}`,
                bestGene.content.instruction,
            );

            this.metrics.logAudit({
                level: 'info',
                component: 'genome',
                operation: 'swarm-import',
                message: `Auto-imported gene ${bestGene.name} for ${signal.type}`,
                genomeId: this.genome.id,
            });
        } catch {
            // Non-critical
        }
    }

    /**
     * Map gene category name to Gene Bank gene type.
     */
    private geneCategoryToType(category: string): string {
        const mapping: Record<string, string> = {
            'tool-usage': 'tool-usage-pattern',
            'coding-patterns': 'reasoning-pattern',
            'communication-style': 'communication-pattern',
        };
        return mapping[category] || 'reasoning-pattern';
    }

    /**
     * Convert v1 Genome (layers) to GenomeV2 (chromosomes) for MutationEngine
     */
    private toGenomeV2(): GenomeV2 {
        const defaultFitness: FitnessVector = {
            quality: 0.5, successRate: 0.5, tokenEfficiency: 0.5,
            latency: 1000, costPerSuccess: 0.01, interventionRate: 0.1,
            composite: 0.5, sampleSize: 0, lastUpdated: new Date(), confidence: 0,
        };

        // Map layer1 alleles to OperativeGene[]
        const operations: OperativeGene[] = this.genome.layers.layer1
            .filter(a => a.status === 'active')
            .map(a => ({
                id: `${this.genome.id}_${a.gene}_${a.variant}`,
                category: a.gene as GeneCategory,
                content: a.content,
                fitness: defaultFitness,
                origin: 'initial' as const,
                usageCount: a.sampleCount || 0,
                lastUsed: new Date(),
                successRate: a.fitness || 0.5,
            }));

        return {
            id: this.genome.id,
            name: this.genome.name,
            familyId: this.genome.familyId || this.genome.id,
            version: this.genome.version || 1,
            chromosomes: {
                c0: {
                    identity: {
                        role: this.genome.layers.layer0[0]?.content || 'AI Assistant',
                        purpose: 'Genomic self-evolving prompt agent',
                        constraints: this.genome.layers.layer0.slice(1).map(a => a.content),
                    },
                    security: {
                        forbiddenTopics: [],
                        accessControls: [],
                        safetyRules: [],
                    },
                    attribution: {
                        creator: 'PGA',
                        copyright: 'PGA Platform',
                        license: 'MIT',
                    },
                    metadata: {
                        version: '2.0.0',
                        createdAt: this.genome.createdAt,
                    },
                },
                c1: {
                    operations,
                    metadata: {
                        lastMutated: new Date(),
                        mutationCount: 0,
                        avgFitnessGain: 0,
                    },
                },
                c2: {
                    userAdaptations: new Map(),
                    contextPatterns: [],
                    metadata: {
                        lastMutated: new Date(),
                        adaptationRate: 0,
                        totalUsers: 0,
                    },
                },
            },
            integrity: {
                c0Hash: this.genome.c0IntegrityHash || '',
                lastVerified: new Date(),
                violations: 0,
                quarantined: false,
            },
            lineage: {
                parentVersion: this.genome.lineage?.parentVersion,
                inheritedGenes: [],
                mutations: [],
            },
            fitness: defaultFitness,
            config: {
                mutationRate: this.genome.config.mutationRate === 'slow' ? 'conservative' : this.genome.config.mutationRate,
                epsilonExplore: this.genome.config.epsilonExplore ?? 0.1,
                enableSandbox: this.genome.config.enableSandbox,
                fitnessWeights: undefined,
                minFitnessImprovement: 0.05,
                enableIntegrityCheck: true,
                autoRollbackThreshold: 0.15,
                allowInheritance: true,
                minCompatibilityScore: 0.6,
            },
            state: 'active',
            tags: [],
            createdAt: this.genome.createdAt,
            updatedAt: this.genome.updatedAt,
        };
    }

    /**
     * Convert a GeneAllele to OperativeGene format
     */
    private toOperativeGene(allele: { gene: string; variant: string; content: string; fitness: number }): OperativeGene {
        const defaultFitness: FitnessVector = {
            quality: allele.fitness, successRate: allele.fitness, tokenEfficiency: 0.5,
            latency: 1000, costPerSuccess: 0.01, interventionRate: 0.1,
            composite: allele.fitness, sampleSize: 0, lastUpdated: new Date(), confidence: 0,
        };

        return {
            id: `${this.genome.id}_${allele.gene}_${allele.variant}`,
            category: allele.gene as GeneCategory,
            content: allele.content,
            fitness: defaultFitness,
            origin: 'initial',
            usageCount: 0,
            lastUsed: new Date(),
            successRate: allele.fitness,
            tokenCount: estimateTokenCount(allele.content),
        };
    }

    /**
     * Trigger token compression on all active C1 genes.
     *
     * Uses LLM to compress gene content while preserving ALL functional
     * capabilities. Compressed mutations pass through EvolutionGuardrails
     * before being applied (no safety bypass).
     *
     * Respects CompressionConfig:
     * - minFitnessForCompression: skip low-fitness genes
     * - maxCompressionRatio: reject overly aggressive compression
     *
     * @returns Compression results with token savings
     */
    async compressGenes(): Promise<{
        compressed: boolean;
        totalOriginalTokens: number;
        totalCompressedTokens: number;
        tokensSaved: number;
        reductionPercent: number;
    }> {
        const emptyResult = { compressed: false, totalOriginalTokens: 0, totalCompressedTokens: 0, tokensSaved: 0, reductionPercent: 0 };

        const compressionOperator = this.mutationEngine.getOperator('compress_instructions');
        if (!compressionOperator) return emptyResult;

        const compressionConfig = this.genome.config.compression;
        const maxRatio = compressionConfig?.maxCompressionRatio ?? 0.3;

        const context: MutationContext = {
            genome: this.toGenomeV2(),
            targetChromosome: 'c1',
            reason: 'Token compression: optimize gene token usage while preserving functionality',
        };

        const result = await compressionOperator.mutate(context);

        if (!result.success || !result.compressionMetrics) return emptyResult;

        const metrics = result.compressionMetrics;

        // Safety: reject if compression is too aggressive (below max ratio)
        if (metrics.ratio < maxRatio) {
            return emptyResult;
        }

        // Validate through EvolutionGuardrails before applying
        const gateResult = await this.guardrailsManager.evaluateCandidate(
            {
                layer: 1,
                gene: 'compression',
                variant: `compressed_v${Date.now()}`,
                content: JSON.stringify(result.mutant.chromosomes.c1.operations.map(g => g.content)),
                fitness: result.expectedImprovement + 0.5,
                sandboxScore: 0.8,
                sampleCount: 0,
                rollbackCount: 0,
            },
            this.genome.id,
        );

        if (gateResult.finalDecision === 'reject') {
            return emptyResult;
        }

        // Gate passed — apply compressed content back to genome alleles
        const minFitness = compressionConfig?.minFitnessForCompression ?? 0.3;

        for (const operation of result.mutant.chromosomes.c1.operations) {
            const allele = this.genome.layers.layer1.find(
                a => a.gene === operation.category && a.status === 'active'
            );
            if (allele && allele.fitness >= minFitness) {
                allele.content = operation.content;
            }
        }

        return {
            compressed: true,
            totalOriginalTokens: metrics.originalTokens,
            totalCompressedTokens: metrics.compressedTokens,
            tokensSaved: metrics.originalTokens - metrics.compressedTokens,
            reductionPercent: Math.round((1 - metrics.ratio) * 100),
        };
    }

    /**
     * Get the recommended mutation strategy based on current drift signals.
     *
     * Returns ranked operators with contextual reasoning — useful for
     * understanding WHY PGA chose a specific mutation approach.
     */
    getMutationStrategy(): Array<{
        operator: string;
        score: number;
        reason: string;
    }> {
        const context: MutationContext = {
            genome: this.toGenomeV2(),
            targetChromosome: 'c1',
            reason: 'Strategy analysis',
            evidence: (() => {
                const drift = this.driftAnalyzer.analyzeDrift();
                return drift.isDrifting
                    ? { driftSignals: drift.signals.map(s => ({ type: s.type, severity: s.severity })) }
                    : undefined;
            })(),
        };

        return this.mutationEngine.selectMutationStrategy(context).map(s => ({
            operator: s.operator.name,
            score: s.score,
            reason: s.reason,
        }));
    }
}
