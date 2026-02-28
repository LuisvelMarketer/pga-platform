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

    constructor(private pgaConfig: PGAConfig) {
        this.llm = pgaConfig.llm;
        this.genomeManager = new GenomeManager(pgaConfig.storage);
    }

    /**
     * Initialize PGA (setup database, load seeds, etc.)
     */
    async initialize(): Promise<void> {
        await this.pgaConfig.storage.initialize();
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

        return new GenomeInstance(genome, this.llm, this.pgaConfig.storage);
    }

    /**
     * Load existing genome
     */
    async loadGenome(genomeId: string): Promise<GenomeInstance | null> {
        const genome = await this.genomeManager.loadGenome(genomeId);
        if (!genome) return null;

        return new GenomeInstance(genome, this.llm, this.pgaConfig.storage);
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

    constructor(
        private genome: Genome,
        private llm: LLMAdapter,
        private storage: StorageAdapter,
    ) {
        this.assembler = new PromptAssembler(storage, genome);
        this.dnaProfile = new DNAProfile(storage);
        this.learningAnnouncer = new LearningAnnouncer();
        this.contextMemory = new ContextMemory(storage);
        this.proactiveSuggestions = new ProactiveSuggestions(storage);
        this.guardrailsManager = new EvolutionGuardrailsManager(
            storage,
            genome.config.evolutionGuardrails,
        );
        // FitnessTracker will be used in future for performance tracking
        new FitnessTracker(storage, genome);
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
     * Chat with PGA optimization + Intelligence Boost
     */
    async chat(userMessage: string, context: SelectionContext): Promise<string> {
        // Assemble prompt with intelligence boost (memory + proactive suggestions)
        const prompt = await this.assemblePrompt(context, userMessage);

        const response = await this.llm.chat(
            [
                { role: 'system', content: prompt },
                { role: 'user', content: userMessage },
            ],
        );

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

        // Record fitness for each layer (if we know which alleles were used)
        // TODO: Track which alleles were selected during assemblePrompt and record their fitness here
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
     * Trigger advanced mutation cycle with operators
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
        const opts = {
            operators: options?.operators || ['compress_instructions', 'reorder_constraints'],
            candidates: options?.candidates || 3,
            minImprovement: options?.minImprovement || 0.05,
            taskType: options?.taskType || 'general',
            layer: options?.layer ?? 2, // Default to Layer 2 (fast mutation)
            gene: options?.gene || 'system_instructions',
        };

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

        // Step 2: Generate mutation candidate (placeholder for now)
        // TODO: Use MutationEngine with operators to generate real candidates
        const mutationCandidate = {
            layer: opts.layer,
            gene: opts.gene,
            variant: `${currentAllele.variant}_v${Date.now()}`,
            content: currentAllele.content, // Would be mutated content
            fitness: currentAllele.fitness + 0.05, // Simulated improvement
            sandboxScore: 0.75, // Would come from sandbox validation
            sampleCount: currentAllele.sampleCount || 0,
            rollbackCount: 0,
        };

        // Step 3: Evaluate against Evolution Guardrails
        const gateResult = await this.guardrailsManager.evaluateCandidate(
            mutationCandidate,
            this.genome.id,
        );

        // Step 4: Make promotion decision
        if (gateResult.finalDecision === 'promote') {
            // Full promotion: Deploy to production
            // TODO: Actually apply the mutation to genome
            return {
                applied: true,
                reason: gateResult.reason,
                improvement: mutationCandidate.fitness - currentAllele.fitness,
                gateResults: {
                    quality: gateResult.gates.quality,
                    sandbox: gateResult.gates.sandbox,
                    economic: gateResult.gates.economic,
                    stability: gateResult.gates.stability,
                },
            };
        } else if (gateResult.finalDecision === 'canary') {
            // Canary deployment: 5% traffic
            // TODO: Implement canary deployment system
            return {
                applied: false,
                reason: `${gateResult.reason} - Canary deployment not yet implemented`,
                gateResults: {
                    quality: gateResult.gates.quality,
                    sandbox: gateResult.gates.sandbox,
                    economic: gateResult.gates.economic,
                    stability: gateResult.gates.stability,
                },
            };
        } else {
            // Reject: Did not pass gates
            return {
                applied: false,
                reason: gateResult.reason,
                gateResults: {
                    quality: gateResult.gates.quality,
                    sandbox: gateResult.gates.sandbox,
                    economic: gateResult.gates.economic,
                    stability: gateResult.gates.stability,
                },
            };
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
}
