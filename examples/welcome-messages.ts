/**
 * PGA Welcome Messages Example
 *
 * This example demonstrates the different welcome message styles
 * that your agent can use to announce PGA integration to users.
 */

import { PGA } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';
import { PostgresAdapter } from '@pga-ai/adapters-storage-postgres';

async function main() {
    // Initialize PGA
    const pga = new PGA({
        llm: new ClaudeAdapter({
            apiKey: process.env.ANTHROPIC_API_KEY!,
            model: 'claude-sonnet-4-20250514',
        }),
        storage: new PostgresAdapter({
            connectionString: process.env.DATABASE_URL!,
        }),
    });

    await pga.initialize();

    // Create genome
    const genome = await pga.createGenome({
        name: 'welcome-demo',
        config: {
            mutationRate: 'balanced',
            epsilonExplore: 0.1,
            enableSandbox: true,
        },
    });

    console.log('🧬 PGA Welcome Message Styles Demo\n');
    console.log('='.repeat(80) + '\n');

    // ═══════════════════════════════════════════════════════
    // Style 1: SHORT (Quick announcement)
    // ═══════════════════════════════════════════════════════

    console.log('📱 STYLE: SHORT (Mobile-friendly, quick announcement)');
    console.log('-'.repeat(80));
    console.log(genome.getWelcomeMessage('short'));
    console.log('\n' + '='.repeat(80) + '\n');

    // ═══════════════════════════════════════════════════════
    // Style 2: DETAILED (Full explanation)
    // ═══════════════════════════════════════════════════════

    console.log('📋 STYLE: DETAILED (Comprehensive explanation)');
    console.log('-'.repeat(80));
    console.log(genome.getWelcomeMessage('detailed'));
    console.log('\n' + '='.repeat(80) + '\n');

    // ═══════════════════════════════════════════════════════
    // Style 3: TECHNICAL (For developers/power users)
    // ═══════════════════════════════════════════════════════

    console.log('⚙️  STYLE: TECHNICAL (Developer-oriented)');
    console.log('-'.repeat(80));
    console.log(genome.getWelcomeMessage('technical'));
    console.log('\n' + '='.repeat(80) + '\n');

    // ═══════════════════════════════════════════════════════
    // Style 4: CASUAL (Friendly, conversational)
    // ═══════════════════════════════════════════════════════

    console.log('😊 STYLE: CASUAL (Friendly and approachable)');
    console.log('-'.repeat(80));
    console.log(genome.getWelcomeMessage('casual'));
    console.log('\n' + '='.repeat(80) + '\n');

    // ═══════════════════════════════════════════════════════
    // Usage Recommendations
    // ═══════════════════════════════════════════════════════

    console.log('💡 USAGE RECOMMENDATIONS:');
    console.log('-'.repeat(80));
    console.log(`
📱 SHORT:
   → Use for: Mobile apps, chat bots, notifications
   → When: User has limited attention
   → Length: ~50 words

📋 DETAILED (DEFAULT):
   → Use for: Web apps, onboarding flows, documentation
   → When: First-time users need full context
   → Length: ~150 words

⚙️  TECHNICAL:
   → Use for: Developer tools, APIs, CLIs
   → When: Technical users want system details
   → Length: ~200 words

😊 CASUAL:
   → Use for: Consumer apps, friendly interfaces
   → When: Building rapport with end users
   → Length: ~120 words
    `);

    console.log('='.repeat(80));
    console.log('\n✅ Demo complete! Choose the style that fits your use case.\n');
}

// Run the example
main().catch(console.error);
