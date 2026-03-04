/**
 * LLM Helper for Evolution Boost Operators
 *
 * Wraps the LLMAdapter.chat() method to provide a simpler
 * generateText() interface used by boost operators.
 */

import type { LLMAdapter, Message } from '../../../interfaces/LLMAdapter.js';

export async function generateText(
    llm: LLMAdapter,
    config: {
        prompt: string;
        temperature?: number;
        maxTokens?: number;
        system?: string;
    }
): Promise<{ content: string }> {
    const messages: Message[] = [];

    if (config.system) {
        messages.push({ role: 'system', content: config.system });
    }

    messages.push({ role: 'user', content: config.prompt });

    const response = await llm.chat(messages, {
        temperature: config.temperature,
        maxTokens: config.maxTokens,
    });

    return { content: response.content };
}
