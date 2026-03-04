/**
 * Anthropic Claude Adapter for PGA
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Implements LLMAdapter interface for Anthropic's Claude models
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
    LLMAdapter,
    Message,
    ChatOptions,
    ChatResponse,
    ChatChunk,
} from '@pga-ai/core';

export interface ClaudeAdapterConfig {
    /**
     * Anthropic API key
     */
    apiKey: string;

    /**
     * Model to use (default: claude-sonnet-4.5)
     */
    model?: string;

    /**
     * Max retries on failure
     */
    maxRetries?: number;

    /**
     * Timeout in milliseconds
     */
    timeout?: number;
}

/**
 * Anthropic Claude Adapter
 *
 * @example
 * ```typescript
 * import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';
 *
 * const adapter = new ClaudeAdapter({
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   model: 'claude-sonnet-4.5-20250929',
 * });
 * ```
 */
export class ClaudeAdapter implements LLMAdapter {
    readonly name = 'anthropic';
    readonly model: string;

    private client: Anthropic;
    private config: Required<ClaudeAdapterConfig>;

    constructor(config: ClaudeAdapterConfig) {
        this.config = {
            apiKey: config.apiKey,
            model: config.model || 'claude-sonnet-4.5-20250929',
            maxRetries: config.maxRetries ?? 2,
            timeout: config.timeout ?? 60000,
        };

        this.model = this.config.model;

        this.client = new Anthropic({
            apiKey: this.config.apiKey,
            maxRetries: this.config.maxRetries,
            timeout: this.config.timeout,
        });
    }

    /**
     * Chat completion
     */
    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
        // Separate system messages
        const systemMessages = messages.filter(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        // Combine system messages
        const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

        // Convert messages to Anthropic format
        const anthropicMessages = chatMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        }));

        try {
            const response = await this.client.messages.create({
                model: this.model,
                messages: anthropicMessages,
                system: systemPrompt || undefined,
                max_tokens: options?.maxTokens || 4096,
                temperature: options?.temperature ?? 0.7,
            });

            // Convert to standard format
            return {
                content: response.content[0].type === 'text' ? response.content[0].text : '',
                usage: {
                    inputTokens: response.usage.input_tokens,
                    outputTokens: response.usage.output_tokens,
                },
                metadata: {
                    model: response.model,
                    stopReason: response.stop_reason || undefined,
                },
            };
        } catch (error) {
            throw new Error(
                `Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    /**
     * Streaming chat completion
     */
    async *stream(messages: Message[], options?: ChatOptions): AsyncIterableIterator<ChatChunk> {
        // Separate system messages
        const systemMessages = messages.filter(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        // Combine system messages
        const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

        // Convert messages to Anthropic format
        const anthropicMessages = chatMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        }));

        try {
            const stream = await this.client.messages.create({
                model: this.model,
                messages: anthropicMessages,
                system: systemPrompt || undefined,
                max_tokens: options?.maxTokens || 4096,
                temperature: options?.temperature ?? 0.7,
                stream: true,
            });

            for await (const event of stream) {
                if (event.type === 'content_block_delta') {
                    if (event.delta.type === 'text_delta') {
                        yield {
                            delta: event.delta.text,
                            done: false,
                        };
                    }
                } else if (event.type === 'message_stop') {
                    yield {
                        delta: '',
                        done: true,
                    };
                }
            }
        } catch (error) {
            throw new Error(
                `Anthropic streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    /**
     * Estimate cost for messages (approximate)
     */
    async estimateCost(messages: Message[]): Promise<number> {
        // Rough token estimation (1 token ≈ 4 characters)
        const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
        const estimatedTokens = Math.ceil(totalChars / 4);

        // Claude Sonnet 4.5 pricing (as of 2025):
        // Input: $3 / million tokens
        // Output: $15 / million tokens (assume 30% output)
        const inputCost = (estimatedTokens * 0.7 * 3) / 1_000_000;
        const outputCost = (estimatedTokens * 0.3 * 15) / 1_000_000;

        return inputCost + outputCost;
    }
}
