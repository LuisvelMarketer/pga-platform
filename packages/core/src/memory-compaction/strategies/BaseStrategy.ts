/**
 * @file Base Compaction Strategy
 * @description Abstract base class for compaction strategies
 */

import type {
    ICompactionStrategy,
    Conversation,
    CompactionConfig,
    CompactionResult,
    Message,
    CompactedMessage,
} from '../types.js';

/**
 * Base class for all compaction strategies
 */
export abstract class BaseCompactionStrategy implements ICompactionStrategy {
    abstract readonly name: string;

    /**
     * Estimate tokens in content (rough approximation)
     * Based on: 1 token ≈ 4 characters for English
     */
    estimateTokens(content: string): number {
        return Math.ceil(content.length / 4);
    }

    /**
     * Calculate importance score for a message
     */
    protected calculateImportance(message: Message, index: number, total: number): number {
        let score = 0.5; // base score

        // Recency bonus (more recent = more important)
        const recencyBonus = index / total;
        score += recencyBonus * 0.3;

        // System messages are important
        if (message.role === 'system') {
            score += 0.2;
        }

        // Longer messages might be more important
        const tokens = message.tokens || this.estimateTokens(message.content);
        if (tokens > 100) {
            score += 0.1;
        }

        // Check for keywords indicating importance
        const importantKeywords = [
            'important',
            'critical',
            'remember',
            'note',
            'key',
            'essential',
            'must',
            'requirement',
        ];

        const contentLower = message.content.toLowerCase();
        const hasImportantKeywords = importantKeywords.some((keyword) =>
            contentLower.includes(keyword)
        );

        if (hasImportantKeywords) {
            score += 0.2;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Create a compacted message from multiple messages
     */
    protected createCompactedMessage(
        messages: Message[],
        summary: string,
        strategy: string
    ): CompactedMessage {
        const originalTokens = messages.reduce(
            (sum, msg) => sum + (msg.tokens || this.estimateTokens(msg.content)),
            0
        );
        const compactedTokens = this.estimateTokens(summary);

        return {
            role: 'system',
            content: summary,
            originalMessages: messages.length,
            compressionRatio: compactedTokens / originalTokens,
            timestamp: new Date(),
            metadata: {
                strategy,
                originalTokens,
                compactedTokens,
            },
        };
    }

    /**
     * Compact a conversation (must be implemented by subclasses)
     */
    abstract compact(
        conversation: Conversation,
        config: CompactionConfig
    ): Promise<CompactionResult>;
}
