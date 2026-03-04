/**
 * @file Sliding Window Strategy
 * @description Keep only N most recent messages, summarize the rest
 */

import { BaseCompactionStrategy } from './BaseStrategy.js';
import type {
    Conversation,
    CompactionConfig,
    CompactionResult,
    Message,
} from '../types.js';

/**
 * Sliding Window Compaction Strategy
 * Keeps recent messages and summarizes older ones
 */
export class SlidingWindowStrategy extends BaseCompactionStrategy {
    readonly name = 'sliding-window';

    async compact(
        conversation: Conversation,
        config: CompactionConfig
    ): Promise<CompactionResult> {
        try {
            const { messages } = conversation;
            const keepCount = config.recentMessagesCount || 10;

            // If we have fewer messages than keepCount, no compaction needed
            if (messages.length <= keepCount) {
                return {
                    success: false,
                    originalMessages: [],
                    compactedMessage: this.createCompactedMessage([], '', this.name),
                    tokensSaved: 0,
                    compressionRatio: 1.0,
                    strategy: this.name,
                    error: 'Not enough messages to compact',
                };
            }

            // Split messages into old (to compact) and recent (to keep)
            const splitIndex = messages.length - keepCount;
            const oldMessages = messages.slice(0, splitIndex);
            // const recentMessages = messages.slice(splitIndex); // Kept by filtering later

            // Create summary of old messages
            const summary = this.summarizeMessages(oldMessages);

            // Create compacted message
            const compactedMessage = this.createCompactedMessage(
                oldMessages,
                summary,
                this.name
            );

            const originalTokens = oldMessages.reduce(
                (sum, msg) => sum + (msg.tokens || this.estimateTokens(msg.content)),
                0
            );
            const compactedTokens =
                compactedMessage.metadata?.compactedTokens || this.estimateTokens(summary);

            return {
                success: true,
                originalMessages: oldMessages,
                compactedMessage,
                tokensSaved: originalTokens - compactedTokens,
                compressionRatio: compactedTokens / originalTokens,
                strategy: this.name,
            };
        } catch (error) {
            return {
                success: false,
                originalMessages: [],
                compactedMessage: this.createCompactedMessage([], '', this.name),
                tokensSaved: 0,
                compressionRatio: 1.0,
                strategy: this.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Create a summary of messages
     */
    private summarizeMessages(messages: Message[]): string {
        // const topics: string[] = []; // Reserved for future topic extraction
        const keyPoints: string[] = [];
        const userQueries: string[] = [];
        const assistantResponses: string[] = [];

        for (const msg of messages) {
            if (msg.role === 'user') {
                // Extract user queries (keep short summary)
                const query = this.extractKeyContent(msg.content);
                if (query && !userQueries.includes(query)) {
                    userQueries.push(query);
                }
            } else if (msg.role === 'assistant') {
                // Extract key points from assistant responses
                const keyPoint = this.extractKeyContent(msg.content);
                if (keyPoint && !assistantResponses.includes(keyPoint)) {
                    assistantResponses.push(keyPoint);
                }
            } else if (msg.role === 'system') {
                // System messages are often important
                keyPoints.push(msg.content.substring(0, 200));
            }
        }

        // Build summary
        let summary = `[Previous conversation summary - ${messages.length} messages]\n\n`;

        if (keyPoints.length > 0) {
            summary += `System context:\n${keyPoints.join('\n')}\n\n`;
        }

        if (userQueries.length > 0) {
            summary += `User discussed:\n${userQueries.slice(0, 5).map((q) => `- ${q}`).join('\n')}\n\n`;
        }

        if (assistantResponses.length > 0) {
            summary += `Key information provided:\n${assistantResponses.slice(0, 5).map((r) => `- ${r}`).join('\n')}`;
        }

        return summary.trim();
    }

    /**
     * Extract key content from a message
     */
    private extractKeyContent(content: string): string {
        // Take first sentence or first 150 characters
        const firstSentence = content.split(/[.!?]\s/)[0];
        if (firstSentence.length <= 150) {
            return firstSentence.trim();
        }
        return content.substring(0, 150).trim() + '...';
    }
}
