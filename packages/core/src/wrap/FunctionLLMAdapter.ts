/**
 * FunctionLLMAdapter — Bridges async functions into the LLMAdapter interface
 *
 * Wraps any `(input: string) => Promise<string>` so it can be used with PGA.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { LLMAdapter, Message, ChatOptions, ChatResponse } from '../interfaces/LLMAdapter.js';

export class FunctionLLMAdapter implements LLMAdapter {
    readonly name: string;
    readonly model: string;

    constructor(
        private fn: (input: string) => Promise<string>,
        name: string,
    ) {
        this.name = name;
        this.model = `function:${name}`;
    }

    async chat(messages: Message[], _options?: ChatOptions): Promise<ChatResponse> {
        const userMessages = messages.filter(m => m.role === 'user');
        const input = userMessages[userMessages.length - 1]?.content ?? '';

        const startTime = Date.now();
        const content = await this.fn(input);
        const duration = Date.now() - startTime;

        return {
            content,
            usage: {
                inputTokens: Math.ceil(input.length / 4),
                outputTokens: Math.ceil(content.length / 4),
            },
            metadata: { duration, adapter: 'function' },
        };
    }
}
