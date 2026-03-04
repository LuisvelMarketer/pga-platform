/**
 * @file Memory Compactor
 * @description Main class for managing conversation memory and compaction
 * @module @pga-ai/core/memory-compaction
 */

import type {
    Conversation,
    CompactionConfig,
    CompactionResult,
    Message,
    MemoryItem,
    PrioritizationOptions,
    ConversationSummary,
    CompactionStrategy,
    ICompactionStrategy,
} from './types.js';

import { SlidingWindowStrategy } from './strategies/SlidingWindowStrategy.js';
import { ImportanceBasedStrategy } from './strategies/ImportanceBasedStrategy.js';

/**
 * Memory Compactor for managing agent conversation memory
 *
 * Features:
 * - Automatic memory compaction when approaching token limits
 * - Multiple compaction strategies (sliding window, importance-based, etc.)
 * - Intelligent memory prioritization
 * - Conversation summarization
 *
 * @example
 * ```typescript
 * const compactor = new MemoryCompactor({
 *   maxTokens: 100000,
 *   compactionThreshold: 0.8,
 *   strategy: 'sliding-window'
 * });
 *
 * // Check if compaction is needed
 * if (compactor.shouldCompact(conversation)) {
 *   const result = await compactor.compactConversation(conversation);
 *   console.log(`Saved ${result.tokensSaved} tokens!`);
 * }
 * ```
 */
export class MemoryCompactor {
    private config: CompactionConfig;
    private strategies: Map<CompactionStrategy, ICompactionStrategy>;

    constructor(config?: Partial<CompactionConfig>) {
        this.config = {
            maxTokens: config?.maxTokens || 100000,
            compactionThreshold: config?.compactionThreshold || 0.8,
            targetCompressionRatio: config?.targetCompressionRatio || 0.3,
            strategy: config?.strategy || 'sliding-window',
            minImportance: config?.minImportance || 0.3,
            preserveRecent: config?.preserveRecent !== false,
            recentMessagesCount: config?.recentMessagesCount || 10,
        };

        // Initialize strategies
        this.strategies = new Map();
        this.strategies.set('sliding-window', new SlidingWindowStrategy());
        this.strategies.set('importance-based', new ImportanceBasedStrategy());
    }

    /**
     * Check if conversation needs compaction
     */
    shouldCompact(conversation: Conversation): boolean {
        const currentTokens = this.calculateTotalTokens(conversation.messages);
        const threshold = this.config.maxTokens * this.config.compactionThreshold;
        return currentTokens >= threshold;
    }

    /**
     * Compact a conversation using the configured strategy
     */
    async compactConversation(conversation: Conversation): Promise<CompactionResult> {
        const strategy = this.strategies.get(this.config.strategy);

        if (!strategy) {
            throw new Error(`Strategy '${this.config.strategy}' not found`);
        }

        return strategy.compact(conversation, this.config);
    }

    /**
     * Apply compaction result to a conversation
     * Returns new conversation with compacted messages
     */
    applyCompaction(
        conversation: Conversation,
        result: CompactionResult
    ): Conversation {
        if (!result.success) {
            return conversation;
        }

        // Get indices of messages to remove
        const indicesToRemove = new Set(
            result.originalMessages.map((msg) => conversation.messages.indexOf(msg))
        );

        // Filter out compacted messages
        const remainingMessages = conversation.messages.filter(
            (_msg, index) => !indicesToRemove.has(index)
        );

        // Add compacted message at the beginning
        const newMessages = [result.compactedMessage, ...remainingMessages];

        const newTotalTokens = this.calculateTotalTokens(newMessages);

        return {
            ...conversation,
            messages: newMessages,
            totalTokens: newTotalTokens,
            metadata: {
                ...conversation.metadata,
                lastCompaction: new Date().toISOString(),
                tokensSaved: result.tokensSaved,
                compressionRatio: result.compressionRatio,
            },
        };
    }

    /**
     * Extract essential information from conversation
     */
    extractEssentials(conversation: Conversation): ConversationSummary {
        const { messages } = conversation;
        const keyFacts: string[] = [];
        const mainTopics = new Set<string>();
        const importantDecisions: string[] = [];
        const userPreferences: Record<string, unknown> = {};

        // Analyze messages for key information
        for (const msg of messages) {
            const contentLower = msg.content.toLowerCase();

            // Extract key facts (messages with "important", "remember", etc.)
            if (
                contentLower.includes('important') ||
                contentLower.includes('remember') ||
                contentLower.includes('note that')
            ) {
                keyFacts.push(msg.content.substring(0, 200));
            }

            // Extract topics (simple keyword extraction)
            const topics = this.extractTopics(msg.content);
            topics.forEach((topic) => mainTopics.add(topic));

            // Extract decisions (messages with "decided", "will", "should")
            if (
                contentLower.includes('decided') ||
                contentLower.includes('will use') ||
                contentLower.includes('we should')
            ) {
                importantDecisions.push(msg.content.substring(0, 200));
            }

            // Extract user preferences
            if (msg.role === 'user' && contentLower.includes('prefer')) {
                // Simple preference extraction
                const preferenceMatch = msg.content.match(
                    /prefer[s]?\s+(\w+)/i
                );
                if (preferenceMatch) {
                    userPreferences['preference'] = preferenceMatch[1];
                }
            }
        }

        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];

        return {
            keyFacts: keyFacts.slice(0, 10), // Top 10 facts
            mainTopics: Array.from(mainTopics).slice(0, 5), // Top 5 topics
            importantDecisions: importantDecisions.slice(0, 5),
            activeContext: lastMessage?.content.substring(0, 300) || '',
            userPreferences,
            timestamp: new Date(),
            coverageRange: {
                from: firstMessage?.timestamp || new Date(),
                to: lastMessage?.timestamp || new Date(),
                messagesCount: messages.length,
            },
        };
    }

    /**
     * Prioritize memory items based on importance, recency, and frequency
     */
    prioritizeMemory(
        items: MemoryItem[],
        options?: Partial<PrioritizationOptions>
    ): MemoryItem[] {
        const opts: PrioritizationOptions = {
            recencyWeight: options?.recencyWeight || 0.3,
            importanceWeight: options?.importanceWeight || 0.5,
            frequencyWeight: options?.frequencyWeight || 0.2,
        };

        const now = Date.now();

        // Calculate composite scores
        const scoredItems = items.map((item) => {
            const ageInHours = (now - item.timestamp.getTime()) / (1000 * 60 * 60);
            const recencyScore = Math.exp(-ageInHours / 24); // Decay over 24 hours

            const compositeScore =
                item.importance * opts.importanceWeight +
                recencyScore * opts.recencyWeight;
            // Note: frequency would require access count tracking

            return {
                item,
                score: compositeScore,
            };
        });

        // Sort by score (highest first)
        scoredItems.sort((a, b) => b.score - a.score);

        return scoredItems.map((si) => si.item);
    }

    /**
     * Calculate total tokens in messages
     */
    private calculateTotalTokens(messages: Message[]): number {
        return messages.reduce((sum, msg) => {
            return sum + (msg.tokens || this.estimateTokens(msg.content));
        }, 0);
    }

    /**
     * Estimate tokens in content
     */
    private estimateTokens(content: string): number {
        return Math.ceil(content.length / 4);
    }

    /**
     * Extract topics from content
     */
    private extractTopics(content: string): string[] {
        const commonTopics = [
            'code',
            'function',
            'error',
            'bug',
            'feature',
            'design',
            'architecture',
            'database',
            'api',
            'ui',
            'performance',
            'security',
            'testing',
            'deployment',
        ];

        const contentLower = content.toLowerCase();
        return commonTopics.filter((topic) => contentLower.includes(topic));
    }

    /**
     * Get current configuration
     */
    getConfig(): CompactionConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<CompactionConfig>): void {
        this.config = {
            ...this.config,
            ...config,
        };
    }

    /**
     * Get available strategies
     */
    getAvailableStrategies(): CompactionStrategy[] {
        return Array.from(this.strategies.keys());
    }
}
