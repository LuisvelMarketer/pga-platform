/**
 * OpenAI Adapter for PGA
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Supports:
 * - GPT-4 Turbo
 * - GPT-4
 * - GPT-3.5 Turbo
 * - Streaming responses
 *
 * @example
 * ```typescript
 * import { OpenAIAdapter } from '@pga-ai/adapters-llm-openai';
 *
 * const adapter = new OpenAIAdapter({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'gpt-4-turbo-preview',
 * });
 * ```
 */

import OpenAI from 'openai';
import type {
    LLMAdapter,
    Message,
    ChatOptions,
    ChatResponse,
    ChatChunk,
} from '@pga-ai/core';

export interface OpenAIAdapterConfig {
    /**
     * OpenAI API Key
     */
    apiKey: string;

    /**
     * Model to use
     * @default 'gpt-4-turbo-preview'
     */
    model?: string;

    /**
     * Organization ID (optional)
     */
    organization?: string;

    /**
     * Base URL (for proxies or Azure)
     */
    baseURL?: string;

    /**
     * Default temperature (0-2)
     * @default 1.0
     */
    defaultTemperature?: number;

    /**
     * Default top P (0-1)
     * @default 1.0
     */
    defaultTopP?: number;
}

export class OpenAIAdapter implements LLMAdapter {
    readonly name = 'openai';
    readonly model: string;

    private client: OpenAI;
    private config: OpenAIAdapterConfig;

    constructor(config: OpenAIAdapterConfig) {
        this.config = config;
        this.model = config.model || 'gpt-4-turbo-preview';

        this.client = new OpenAI({
            apiKey: config.apiKey,
            organization: config.organization,
            baseURL: config.baseURL,
        });
    }

    /**
     * Chat with OpenAI
     */
    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
        // Convert PGA messages to OpenAI format
        const openaiMessages = this.convertMessages(messages);

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: openaiMessages,
            temperature: options?.temperature ?? this.config.defaultTemperature ?? 1.0,
            top_p: this.config.defaultTopP ?? 1.0,
            max_tokens: options?.maxTokens ?? 4096,
            stream: false,
        });

        const choice = response.choices[0];
        if (!choice) {
            throw new Error('No response from OpenAI');
        }

        return {
            content: choice.message.content || '',
            usage: {
                inputTokens: response.usage?.prompt_tokens || 0,
                outputTokens: response.usage?.completion_tokens || 0,
            },
            metadata: {
                finishReason: choice.finish_reason || 'stop',
                model: this.model,
            },
        };
    }

    /**
     * Chat with streaming
     */
    async *chatStream(
        messages: Message[],
        options?: ChatOptions,
    ): AsyncGenerator<ChatChunk, void, unknown> {
        const openaiMessages = this.convertMessages(messages);

        const stream = await this.client.chat.completions.create({
            model: this.model,
            messages: openaiMessages,
            temperature: options?.temperature ?? this.config.defaultTemperature ?? 1.0,
            top_p: this.config.defaultTopP ?? 1.0,
            max_tokens: options?.maxTokens ?? 4096,
            stream: true,
        });

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta?.content) {
                // Check if stream is done
                if (chunk.choices[0]?.finish_reason) {
                    yield { delta: '', done: true };
                }
                continue;
            }

            yield {
                delta: delta.content,
                done: false,
            };
        }
    }

    /**
     * Convert PGA messages to OpenAI format
     */
    private convertMessages(
        messages: Message[],
    ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
        return messages.map(msg => {
            if (msg.role === 'system') {
                return {
                    role: 'system',
                    content: msg.content,
                };
            } else if (msg.role === 'user') {
                return {
                    role: 'user',
                    content: msg.content,
                };
            } else {
                return {
                    role: 'assistant',
                    content: msg.content,
                };
            }
        });
    }
}
