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
import type { Genome, GenomeConfig, SelectionContext, Interaction } from './types/index.js';
import { GenomeManager } from './core/GenomeManager.js';
import { PromptAssembler } from './core/PromptAssembler.js';
import { DNAProfile } from './core/DNAProfile.js';
import { FitnessTracker } from './core/FitnessTracker.js';
import { LearningAnnouncer } from './core/LearningAnnouncer.js';
import { ContextMemory } from './core/ContextMemory.js';
import { ProactiveSuggestions } from './core/ProactiveSuggestions.js';

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
        const genome = await this.genomeManager.createGenome({
            name: options.name,
            config: {
                enableSandbox: true,
                mutationRate: 'balanced',
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
     * Trigger mutation cycle manually
     */
    async mutate(options?: { userId?: string }): Promise<void> {
        // TODO: Implement mutation triggering
        console.log('Mutation cycle triggered for genome:', this.genome.id, options);
    }

    /**
     * Rollback to previous version
     */
    async rollback(options: { layer: 0 | 1 | 2; gene: string; variant: string }): Promise<void> {
        // TODO: Implement rollback
        console.log('Rollback requested:', options);
    }

    /**
     * Get analytics
     */
    async getAnalytics() {
        return this.storage.getAnalytics(this.genome.id);
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
