/**
 * @file Importance-Based Strategy
 * @description Keep messages based on importance scores
 */

import { BaseCompactionStrategy } from './BaseStrategy.js';
import type {
    Conversation,
    CompactionConfig,
    CompactionResult,
    Message,
} from '../types.js';

interface ScoredMessage {
    message: Message;
    score: number;
    index: number;
}

/**
 * Importance-Based Compaction Strategy
 * Keeps high-importance messages, compacts low-importance ones
 */
export class ImportanceBasedStrategy extends BaseCompactionStrategy {
    readonly name = 'importance-based';

    async compact(
        conversation: Conversation,
        config: CompactionConfig
    ): Promise<CompactionResult> {
        try {
            const { messages } = conversation;
            const minImportance = config.minImportance || 0.3;

            // Score all messages
            const scoredMessages: ScoredMessage[] = messages.map((msg, index) => ({
                message: msg,
                score: this.calculateImportance(msg, index, messages.length),
                index,
            }));

            // Separate into important and unimportant
            // const important = scoredMessages.filter((sm) => sm.score >= minImportance);
            const unimportant = scoredMessages.filter((sm) => sm.score < minImportance);

            // If most messages are important, don't compact
            if (unimportant.length < 3) {
                return {
                    success: false,
                    originalMessages: [],
                    compactedMessage: this.createCompactedMessage([], '', this.name),
                    tokensSaved: 0,
                    compressionRatio: 1.0,
                    strategy: this.name,
                    error: 'Not enough low-importance messages to compact',
                };
            }

            // Create summary of unimportant messages
            const messagesToCompact = unimportant.map((sm) => sm.message);
            const summary = this.createImportanceBasedSummary(
                messagesToCompact,
                unimportant.map((sm) => sm.score)
            );

            const compactedMessage = this.createCompactedMessage(
                messagesToCompact,
                summary,
                this.name
            );

            const originalTokens = messagesToCompact.reduce(
                (sum, msg) => sum + (msg.tokens || this.estimateTokens(msg.content)),
                0
            );
            const compactedTokens = this.estimateTokens(summary);

            return {
                success: true,
                originalMessages: messagesToCompact,
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
     * Create summary based on importance scores
     */
    private createImportanceBasedSummary(messages: Message[], scores: number[]): string {
        const groups = this.groupMessagesByTopic(messages);

        let summary = `[Compacted ${messages.length} low-importance messages]\n\n`;

        // Add brief mention of topics covered
        if (groups.size > 0) {
            summary += `Topics covered:\n`;
            Array.from(groups.entries()).forEach(([topic, msgs]) => {
                summary += `- ${topic} (${msgs.length} messages)\n`;
            });
        }

        // Add very brief content summary
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        summary += `\nAverage importance: ${(avgScore * 100).toFixed(0)}%`;

        return summary;
    }

    /**
     * Group messages by topic (simple keyword-based grouping)
     */
    private groupMessagesByTopic(messages: Message[]): Map<string, Message[]> {
        const groups = new Map<string, Message[]>();

        const topicKeywords = [
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
        ];

        for (const msg of messages) {
            const contentLower = msg.content.toLowerCase();
            let assigned = false;

            for (const keyword of topicKeywords) {
                if (contentLower.includes(keyword)) {
                    const existing = groups.get(keyword) || [];
                    existing.push(msg);
                    groups.set(keyword, existing);
                    assigned = true;
                    break;
                }
            }

            if (!assigned) {
                const existing = groups.get('general') || [];
                existing.push(msg);
                groups.set('general', existing);
            }
        }

        return groups;
    }
}
