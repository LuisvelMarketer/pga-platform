/**
 * @file Memory Compaction Module
 * @description Intelligent memory management and conversation compaction for PGA agents
 * @module @pga-ai/core/memory-compaction
 *
 * @example
 * ```typescript
 * import { MemoryCompactor } from '@pga-ai/core';
 *
 * const compactor = new MemoryCompactor({
 *   maxTokens: 100000,
 *   strategy: 'sliding-window',
 *   recentMessagesCount: 10
 * });
 *
 * // Check and compact
 * if (compactor.shouldCompact(conversation)) {
 *   const result = await compactor.compactConversation(conversation);
 *   const updated = compactor.applyCompaction(conversation, result);
 *   console.log(`Saved ${result.tokensSaved} tokens!`);
 * }
 * ```
 */

// Main class
export { MemoryCompactor } from './MemoryCompactor.js';

// Types
export type {
    Message,
    CompactedMessage,
    Conversation,
    CompactionResult,
    MemoryItem,
    CompactionConfig,
    CompactionStrategy,
    ICompactionStrategy,
    PrioritizationOptions,
    ConversationSummary,
} from './types.js';

// Strategies
export { BaseCompactionStrategy } from './strategies/BaseStrategy.js';
export { SlidingWindowStrategy } from './strategies/SlidingWindowStrategy.js';
export { ImportanceBasedStrategy } from './strategies/ImportanceBasedStrategy.js';
