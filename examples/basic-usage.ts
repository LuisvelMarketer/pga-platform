/**
 * PGA Basic Usage Example
 *
 * This example demonstrates how to:
 * 1. Initialize PGA with Claude and Postgres
 * 2. Create a genome
 * 3. Use it in a conversational agent
 * 4. Record feedback for evolution
 */

import { PGA } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';
import { PostgresAdapter } from '@pga-ai/adapters-storage-postgres';

async function main() {
    // ═══════════════════════════════════════════════════════
    // Step 1: Initialize PGA with adapters
    // ═══════════════════════════════════════════════════════

    const pga = new PGA({
        llm: new ClaudeAdapter({
            apiKey: process.env.ANTHROPIC_API_KEY!,
            model: 'claude-sonnet-4-20250514',
        }),
        storage: new PostgresAdapter({
            connectionString: process.env.DATABASE_URL!,
        }),
        config: {
            enableSandbox: true,
            mutationRate: 'balanced',
            epsilonExplore: 0.1,
        },
    });

    // Initialize database tables
    await pga.initialize();
    console.log('✓ PGA initialized');

    // ═══════════════════════════════════════════════════════
    // Step 2: Create a genome for your agent
    // ═══════════════════════════════════════════════════════

    const genome = await pga.createGenome({
        name: 'customer-support-agent',
        config: {
            mutationRate: 'aggressive', // Override default
        },
    });

    console.log(`✓ Genome created: ${genome.getId()}`);

    // ═══════════════════════════════════════════════════════
    // Step 3: Display Welcome Message (Agent Announcement)
    // ═══════════════════════════════════════════════════════

    // Get the welcome message - choose style:
    // 'short' | 'detailed' | 'technical' | 'casual'
    const welcomeMessage = genome.getWelcomeMessage('detailed');

    console.log('\n' + '='.repeat(60));
    console.log('🤖 AGENT ANNOUNCEMENT:');
    console.log('='.repeat(60));
    console.log(welcomeMessage);
    console.log('='.repeat(60) + '\n');

    // ═══════════════════════════════════════════════════════
    // Step 4: Add initial prompts to Layer 0 (Immutable DNA)
    // ═══════════════════════════════════════════════════════

    await genome.addAllele({
        layer: 0,
        gene: 'core-identity',
        variant: 'default',
        content: `You are a helpful customer support agent.
Your goal is to resolve customer issues quickly and professionally.
Always be polite, empathetic, and solution-oriented.`,
    });

    console.log('✓ Layer 0 (Immutable DNA) initialized');

    // ═══════════════════════════════════════════════════════
    // Step 4: Add Layer 1 prompts (Operative Genes)
    // ═══════════════════════════════════════════════════════

    await genome.addAllele({
        layer: 1,
        gene: 'troubleshooting-approach',
        variant: 'default',
        content: `When troubleshooting:
1. Ask clarifying questions
2. Reproduce the issue
3. Identify root cause
4. Provide clear solution steps`,
    });

    await genome.addAllele({
        layer: 1,
        gene: 'troubleshooting-approach',
        variant: 'v2-direct',
        content: `When troubleshooting:
- Jump directly to the most likely solution
- Provide step-by-step instructions immediately
- Only ask for clarification if solution doesn't work`,
    });

    console.log('✓ Layer 1 (Operative Genes) initialized');

    // ═══════════════════════════════════════════════════════
    // Step 5: Add Layer 2 prompts (Epigenomes - User Prefs)
    // ═══════════════════════════════════════════════════════

    await genome.addAllele({
        layer: 2,
        gene: 'communication-style',
        variant: 'default',
        content: 'Use a friendly, professional tone with balanced detail.',
    });

    console.log('✓ Layer 2 (Epigenomes) initialized');

    // ═══════════════════════════════════════════════════════
    // Step 6: Use the genome in a conversation
    // ═══════════════════════════════════════════════════════

    const userId = 'user-123';
    const userMessage = "My app keeps crashing when I click the submit button";

    const response = await genome.chat({
        userId,
        message: userMessage,
    });

    console.log('\n📩 User:', userMessage);
    console.log('🤖 Assistant:', response.content);

    // ═══════════════════════════════════════════════════════
    // Step 7: Record user feedback (for evolution)
    // ═══════════════════════════════════════════════════════

    // Positive feedback (score: 0.0 to 1.0)
    await genome.recordFeedback({
        userId,
        score: 0.9, // User was satisfied
        sentiment: 'positive',
    });

    console.log('✓ Positive feedback recorded');

    // ═══════════════════════════════════════════════════════
    // Step 8: View genome analytics
    // ═══════════════════════════════════════════════════════

    const analytics = await genome.getAnalytics();
    console.log('\n📊 Genome Analytics:');
    console.log('  - Total interactions:', analytics.totalInteractions);
    console.log('  - Average satisfaction:', analytics.averageSatisfaction);
    console.log('  - Active alleles:', analytics.activeAlleles);

    // ═══════════════════════════════════════════════════════
    // Step 9: Export User DNA profile
    // ═══════════════════════════════════════════════════════

    const userDNA = await genome.getUserDNA(userId);
    console.log('\n🧬 User DNA Profile:');
    console.log('  - Communication style:', userDNA.traits.communicationStyle);
    console.log('  - Verbosity:', userDNA.traits.verbosity);
    console.log('  - Generation:', userDNA.generation);

    // ═══════════════════════════════════════════════════════
    // Step 10: Load existing genome (for future sessions)
    // ═══════════════════════════════════════════════════════

    const genomeId = genome.getId();
    const reloadedGenome = await pga.loadGenome(genomeId);

    if (reloadedGenome) {
        console.log('\n✓ Genome reloaded successfully');
    }

    console.log('\n✅ Example completed successfully!');
}

// Run the example
main().catch(console.error);
