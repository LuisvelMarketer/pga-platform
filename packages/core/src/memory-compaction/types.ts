/**
 * @file Memory Compaction Types
 * @description Type definitions for memory compaction system
 * @module @pga-ai/core/memory-compaction
 */

/**
 * Represents a message in a conversation
 */
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    tokens?: number;
    metadata?: Record<string, unknown>;
}

/**
 * Represents a compacted/summarized message
 */
export interface CompactedMessage {
    role: 'system';
    content: string;
    originalMessages: number; // How many messages were compacted
    compressionRatio: number; // tokens_after / tokens_before
    timestamp: Date;
    metadata?: {
        strategy: string;
        originalTokens: number;
        compactedTokens: number;
        [key: string]: unknown;
    };
}

/**
 * Conversation context with messages
 */
export interface Conversation {
    id: string;
    messages: Message[];
    totalTokens: number;
    metadata?: Record<string, unknown>;
}

/**
 * Result of a compaction operation
 */
export interface CompactionResult {
    success: boolean;
    originalMessages: Message[];
    compactedMessage: CompactedMessage;
    tokensSaved: number;
    compressionRatio: number;
    strategy: string;
    error?: string;
}

/**
 * Memory item with priority
 */
export interface MemoryItem {
    id: string;
    content: string;
    importance: number; // 0-1 score
    timestamp: Date;
    tokens: number;
    type: 'fact' | 'instruction' | 'context' | 'interaction';
    metadata?: Record<string, unknown>;
}

/**
 * Configuration for memory compaction
 */
export interface CompactionConfig {
    /**
     * Maximum tokens allowed before triggering compaction
     * @default 100000
     */
    maxTokens: number;

    /**
     * Token threshold to start compaction (percentage of maxTokens)
     * @default 0.8 (80%)
     */
    compactionThreshold: number;

    /**
     * Target compression ratio
     * @default 0.3 (compress to 30% of original)
     */
    targetCompressionRatio: number;

    /**
     * Strategy to use for compaction
     * @default 'intelligent'
     */
    strategy: CompactionStrategy;

    /**
     * Minimum importance score to retain in memory
     * @default 0.3
     */
    minImportance: number;

    /**
     * Whether to preserve recent messages
     * @default true
     */
    preserveRecent: boolean;

    /**
     * Number of recent messages to always keep
     * @default 10
     */
    recentMessagesCount: number;
}

/**
 * Compaction strategy types
 */
export type CompactionStrategy =
    | 'sliding-window' // Keep only N recent messages
    | 'importance-based' // Keep only important items
    | 'semantic-clustering' // Group similar messages
    | 'intelligent' // AI-powered summarization
    | 'hybrid'; // Combination of strategies

/**
 * Interface for compaction strategies
 */
export interface ICompactionStrategy {
    /**
     * Name of the strategy
     */
    readonly name: string;

    /**
     * Compact a conversation
     */
    compact(
        conversation: Conversation,
        config: CompactionConfig
    ): Promise<CompactionResult>;

    /**
     * Estimate tokens for content
     */
    estimateTokens(content: string): number;
}

/**
 * Options for prioritizing memory
 */
export interface PrioritizationOptions {
    /**
     * Weight for recency (0-1)
     * @default 0.3
     */
    recencyWeight: number;

    /**
     * Weight for importance (0-1)
     * @default 0.5
     */
    importanceWeight: number;

    /**
     * Weight for frequency of access (0-1)
     * @default 0.2
     */
    frequencyWeight: number;
}

/**
 * Summary of conversation essentials
 */
export interface ConversationSummary {
    keyFacts: string[];
    mainTopics: string[];
    importantDecisions: string[];
    activeContext: string;
    userPreferences: Record<string, unknown>;
    timestamp: Date;
    coverageRange: {
        from: Date;
        to: Date;
        messagesCount: number;
    };
}
