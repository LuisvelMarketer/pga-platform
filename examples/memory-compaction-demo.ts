/**
 * Memory Compaction Demo
 *
 * Demonstrates how to use PGA's Memory Compactor to manage conversation memory
 * and reduce token costs by up to 70%.
 */

import {
    MemoryCompactor,
    type Conversation,
    type MemoryMessage,
    type CompactionConfig,
} from '@pga-ai/core';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Example 1: Basic Memory Compaction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function basicCompactionExample() {
    console.log('\n📦 Example 1: Basic Memory Compaction\n');

    // Create compactor with default settings
    const compactor = new MemoryCompactor({
        maxTokens: 100000,
        compactionThreshold: 0.8, // Compact when 80% full
        strategy: 'sliding-window',
        recentMessagesCount: 10, // Keep 10 most recent messages
    });

    // Simulate a long conversation
    const conversation: Conversation = {
        id: 'conversation-123',
        messages: generateSampleMessages(50), // 50 messages
        totalTokens: 0,
    };

    // Calculate total tokens
    conversation.totalTokens = conversation.messages.reduce(
        (sum, msg) => sum + (msg.tokens || compactor['estimateTokens'](msg.content)),
        0
    );

    console.log(`Original conversation:`);
    console.log(`- Messages: ${conversation.messages.length}`);
    console.log(`- Total tokens: ${conversation.totalTokens}`);

    // Check if compaction is needed
    if (compactor.shouldCompact(conversation)) {
        console.log('\n⚠️  Compaction needed!\n');

        // Compact the conversation
        const result = await compactor.compactConversation(conversation);

        if (result.success) {
            console.log(`✅ Compaction successful:`);
            console.log(`- Messages compacted: ${result.originalMessages.length}`);
            console.log(`- Tokens saved: ${result.tokensSaved}`);
            console.log(`- Compression ratio: ${(result.compressionRatio * 100).toFixed(1)}%`);
            console.log(`- Strategy used: ${result.strategy}`);

            // Apply compaction to get updated conversation
            const updatedConversation = compactor.applyCompaction(conversation, result);

            console.log(`\nUpdated conversation:`);
            console.log(`- Messages: ${updatedConversation.messages.length}`);
            console.log(`- Total tokens: ${updatedConversation.totalTokens}`);
            console.log(`- Savings: ${((1 - updatedConversation.totalTokens / conversation.totalTokens) * 100).toFixed(1)}%`);
        }
    } else {
        console.log('✅ No compaction needed - conversation is within limits');
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Example 2: Importance-Based Compaction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function importanceBasedExample() {
    console.log('\n\n📊 Example 2: Importance-Based Compaction\n');

    const compactor = new MemoryCompactor({
        maxTokens: 50000,
        strategy: 'importance-based',
        minImportance: 0.4, // Keep messages with importance >= 0.4
    });

    const conversation: Conversation = {
        id: 'conversation-456',
        messages: [
            {
                role: 'user',
                content: 'Hi, how are you?',
                timestamp: new Date(),
                tokens: 6,
            },
            {
                role: 'assistant',
                content: "I'm doing well, thank you!",
                timestamp: new Date(),
                tokens: 8,
            },
            {
                role: 'user',
                content: 'IMPORTANT: I need to remember that our deployment is scheduled for Friday at 3pm.',
                timestamp: new Date(),
                tokens: 20,
            },
            {
                role: 'assistant',
                content: 'Noted! I will remember that your deployment is scheduled for Friday at 3pm.',
                timestamp: new Date(),
                tokens: 18,
            },
            {
                role: 'user',
                content: 'What was that date again?',
                timestamp: new Date(),
                tokens: 7,
            },
            {
                role: 'assistant',
                content: 'Your deployment is scheduled for Friday at 3pm.',
                timestamp: new Date(),
                tokens: 12,
            },
        ],
        totalTokens: 71,
    };

    console.log(`Original: ${conversation.messages.length} messages, ${conversation.totalTokens} tokens`);

    const result = await compactor.compactConversation(conversation);

    if (result.success) {
        console.log(`\n✅ Compacted ${result.originalMessages.length} low-importance messages`);
        console.log(`Kept important messages about deployment schedule`);
        console.log(`Compression ratio: ${(result.compressionRatio * 100).toFixed(1)}%`);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Example 3: Extract Conversation Essentials
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractEssentialsExample() {
    console.log('\n\n🔍 Example 3: Extract Conversation Essentials\n');

    const compactor = new MemoryCompactor();

    const conversation: Conversation = {
        id: 'conversation-789',
        messages: [
            {
                role: 'user',
                content: 'I prefer TypeScript over JavaScript for this project.',
                timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
                tokens: 15,
            },
            {
                role: 'assistant',
                content: "Got it! I'll use TypeScript for the codebase.",
                timestamp: new Date(Date.now() - 1000 * 60 * 59),
                tokens: 12,
            },
            {
                role: 'user',
                content: 'IMPORTANT: We decided to use PostgreSQL as our database.',
                timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
                tokens: 18,
            },
            {
                role: 'assistant',
                content: 'Understood. PostgreSQL will be our database solution.',
                timestamp: new Date(Date.now() - 1000 * 60 * 29),
                tokens: 13,
            },
            {
                role: 'user',
                content: 'Can you help me design the user authentication flow?',
                timestamp: new Date(),
                tokens: 14,
            },
        ],
        totalTokens: 72,
    };

    const summary = compactor.extractEssentials(conversation);

    console.log('Extracted essentials:');
    console.log('\n📌 Key Facts:');
    summary.keyFacts.forEach((fact, i) => console.log(`  ${i + 1}. ${fact}`));

    console.log('\n🏷️  Main Topics:');
    summary.mainTopics.forEach((topic) => console.log(`  - ${topic}`));

    console.log('\n✅ Important Decisions:');
    summary.importantDecisions.forEach((decision) => console.log(`  - ${decision}`));

    console.log('\n👤 User Preferences:');
    console.log(`  ${JSON.stringify(summary.userPreferences, null, 2)}`);

    console.log(`\n📊 Coverage: ${summary.coverageRange.messagesCount} messages from ${summary.coverageRange.from.toLocaleTimeString()} to ${summary.coverageRange.to.toLocaleTimeString()}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Example 4: Automatic Compaction in Production
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function productionExample() {
    console.log('\n\n🚀 Example 4: Automatic Compaction in Production\n');

    const compactor = new MemoryCompactor({
        maxTokens: 100000,
        compactionThreshold: 0.8,
        strategy: 'sliding-window',
        recentMessagesCount: 15,
    });

    // Simulate a chatbot that automatically compacts
    class ChatBot {
        private conversation: Conversation;
        private compactor: MemoryCompactor;
        private totalTokensSaved = 0;
        private compactionCount = 0;

        constructor(compactor: MemoryCompactor) {
            this.compactor = compactor;
            this.conversation = {
                id: `chat-${Date.now()}`,
                messages: [],
                totalTokens: 0,
            };
        }

        async sendMessage(role: 'user' | 'assistant', content: string): Promise<void> {
            const message: MemoryMessage = {
                role,
                content,
                timestamp: new Date(),
                tokens: Math.ceil(content.length / 4),
            };

            this.conversation.messages.push(message);
            this.conversation.totalTokens += message.tokens!;

            // Check if compaction is needed
            if (this.compactor.shouldCompact(this.conversation)) {
                console.log(`⚠️  Token limit reached (${this.conversation.totalTokens} tokens)`);
                await this.compact();
            }
        }

        private async compact(): Promise<void> {
            const result = await this.compactor.compactConversation(this.conversation);

            if (result.success) {
                this.conversation = this.compactor.applyCompaction(this.conversation, result);
                this.totalTokensSaved += result.tokensSaved;
                this.compactionCount++;

                console.log(`✅ Compacted: -${result.tokensSaved} tokens`);
                console.log(`   New total: ${this.conversation.totalTokens} tokens\n`);
            }
        }

        getStats() {
            return {
                messages: this.conversation.messages.length,
                totalTokens: this.conversation.totalTokens,
                tokensSaved: this.totalTokensSaved,
                compactionCount: this.compactionCount,
                costSaved: `$${((this.totalTokensSaved / 1000000) * 3).toFixed(2)}`, // $3 per 1M tokens (Claude pricing)
            };
        }
    }

    const bot = new ChatBot(compactor);

    // Simulate 100 message exchanges
    console.log('Simulating 100 messages...\n');

    for (let i = 0; i < 50; i++) {
        await bot.sendMessage('user', `User message ${i + 1}: ${generateRandomText(100)}`);
        await bot.sendMessage('assistant', `Assistant response ${i + 1}: ${generateRandomText(150)}`);
    }

    const stats = bot.getStats();
    console.log('\n📊 Final Statistics:');
    console.log(`- Total messages: ${stats.messages}`);
    console.log(`- Current tokens: ${stats.totalTokens}`);
    console.log(`- Tokens saved: ${stats.tokensSaved}`);
    console.log(`- Compactions performed: ${stats.compactionCount}`);
    console.log(`- Cost saved: ${stats.costSaved}`);
    console.log(`- Efficiency gain: ${((stats.tokensSaved / (stats.totalTokens + stats.tokensSaved)) * 100).toFixed(1)}%`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helper Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateSampleMessages(count: number): MemoryMessage[] {
    const messages: MemoryMessage[] = [];

    for (let i = 0; i < count; i++) {
        const isUser = i % 2 === 0;
        const content = isUser
            ? `User message ${i + 1}: ${generateRandomText(50)}`
            : `Assistant response ${i + 1}: ${generateRandomText(100)}`;

        messages.push({
            role: isUser ? 'user' : 'assistant',
            content,
            timestamp: new Date(Date.now() - (count - i) * 60000), // 1 minute apart
            tokens: Math.ceil(content.length / 4),
        });
    }

    return messages;
}

function generateRandomText(length: number): string {
    const words = [
        'hello',
        'world',
        'code',
        'function',
        'variable',
        'class',
        'interface',
        'type',
        'const',
        'let',
        'async',
        'await',
        'promise',
        'typescript',
        'javascript',
        'node',
        'react',
        'vue',
        'angular',
        'component',
    ];

    let text = '';
    while (text.length < length) {
        text += words[Math.floor(Math.random() * words.length)] + ' ';
    }

    return text.trim().substring(0, length);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Run All Examples
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('         PGA MEMORY COMPACTION DEMO');
    console.log('═══════════════════════════════════════════════════════');

    await basicCompactionExample();
    await importanceBasedExample();
    extractEssentialsExample();
    await productionExample();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                   DEMO COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
