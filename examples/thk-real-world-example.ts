/**
 * THK Real-World Example: Multi-Agent Knowledge Sharing
 *
 * Scenario:
 * - Alice (senior agent) develops a great error handling pattern
 * - The pattern is extracted as a gene and stored in the Gene Bank
 * - Bob (junior agent) encounters similar errors
 * - Bob discovers and adopts Alice's gene via THK
 * - Both agents benefit from shared knowledge
 *
 * This demonstrates the "bacterial plasmid transfer" concept
 * applied to AI agent knowledge sharing.
 *
 * @version 0.4.0
 * @author Luis Alfredo Velasquez Duran
 */

import {
    GeneBank,
    GeneExtractor,
    GeneAdopter,
    MetricsCollector,
    type CognitiveGene,
    type MutationContext as GeneMutationContext,
    type TenantInfo,
    createGeneId,
} from '@pga-ai/core';

// ============================================================================
// SCENARIO SETUP
// ============================================================================

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║  🧬 REAL-WORLD THK EXAMPLE                                        ║');
console.log('║  Multi-Agent Knowledge Sharing via Gene Bank                      ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// ACT 1: ALICE DEVELOPS A BREAKTHROUGH
// ============================================================================

console.log('📖 ACT 1: Alice Develops a Breakthrough Pattern\n');
console.log('─'.repeat(70));

console.log(`
Alice, a senior customer support agent, has been struggling with
handling API timeout errors. After several iterations, she develops
an excellent pattern:

BEFORE (Fitness: 0.62):
  "API timeout occurred. Please try again."

AFTER (Fitness: 0.91):
  "Connection timeout detected. This usually resolves quickly.
   Would you like to:
   • Retry now (recommended)
   • Wait 30 seconds and retry
   • Cancel and save for later

   Your progress has been saved automatically."

This pattern increased user satisfaction from 62% to 91%!
`);

console.log('─'.repeat(70) + '\n');

// Simulate Alice's mutation
const aliceMutation: GeneMutationContext = {
    mutationId: 'mut_alice_001',
    originalPrompt: 'When API times out, show: "API timeout occurred. Please try again."',
    mutatedPrompt: `When API times out, show a helpful message with multiple options:
        1. Explain what happened in simple terms
        2. Reassure the user (it's temporary)
        3. Offer retry, wait, or cancel options
        4. Confirm progress was saved
        5. Use friendly, conversational tone`,
    parentFitness: 0.62,
    mutatedFitness: 0.91,
    taskContext: 'Customer support chat handling payment API timeouts',
    domain: 'customer-support',
    metrics: {
        taskSuccessRate: 0.93,
        tokenEfficiency: 0.88,
        responseQuality: 0.94,
        userSatisfaction: 0.91,
    },
};

console.log('🔬 Extracting Alice\'s pattern as a gene...\n');

// Mock extraction result (in real scenario, this would use LLM)
const aliceGene: CognitiveGene = {
    id: createGeneId('tenant_company', 'communication-pattern'),
    version: '1.0.0',
    name: 'Empathetic Timeout Recovery',
    description: 'User-friendly pattern for handling API timeouts with empathy, options, and reassurance',
    type: 'communication-pattern',
    domain: 'customer-support',
    fitness: {
        overallFitness: 0.91,
        taskSuccessRate: 0.93,
        userSatisfaction: 0.91,
        tokenEfficiency: 0.88,
        responseQuality: 0.94,
        adoptionCount: 0,
        adoptionPerformance: null,
    },
    lineage: {
        parentGeneId: null,
        generation: 0,
        ancestors: [],
        mutationHistory: [{
            timestamp: new Date().toISOString(),
            change: 'Extracted from Alice\'s breakthrough mutation',
            fitnessGain: 0.29,
        }],
    },
    content: {
        instruction: `When handling timeout errors:
1. Explain in simple terms (avoid technical jargon)
2. Reassure user it's temporary
3. Provide multiple clear options (retry/wait/cancel)
4. Confirm important actions were saved
5. Use warm, conversational tone`,
        examples: [
            {
                scenario: 'Payment API timeout',
                expectedBehavior: 'Show explanation, 3 options, and reassurance about saved progress'
            }
        ],
        requiredCapabilities: ['error-handling', 'user-communication'],
        applicableContexts: ['customer-facing', 'payment-flows', 'critical-operations'],
        contraindications: ['internal-tools', 'developer-facing-apis'],
        metadata: {
            originalAuthor: 'agent_alice',
            extractedFrom: 'payment_timeout_handling',
        },
    },
    tenant: {
        tenantId: 'tenant_company',
        createdBy: 'agent_alice',
        scope: 'tenant', // Shared within company
        verified: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['customer-support', 'error-handling', 'user-experience', 'empathy'],
};

console.log('✅ Gene extracted successfully!');
console.log(`   Name:    ${aliceGene.name}`);
console.log(`   Type:    ${aliceGene.type}`);
console.log(`   Fitness: ${(aliceGene.fitness.overallFitness * 100).toFixed(0)}%`);
console.log(`   Gain:    +${((aliceGene.fitness.overallFitness - aliceMutation.parentFitness) * 100).toFixed(0)}%\n`);

console.log('💾 Storing in Gene Bank (tenant scope = shared with team)...\n');

// ============================================================================
// ACT 2: BOB ENCOUNTERS SIMILAR PROBLEM
// ============================================================================

console.log('📖 ACT 2: Bob Encounters the Same Problem\n');
console.log('─'.repeat(70));

console.log(`
Two weeks later...

Bob, a junior agent handling shipping API calls, encounters timeout
errors. His current approach:

  "Error: Connection timeout. Retry?"

Users are confused and frustrated (Fitness: 0.58).

Bob's agent automatically searches the Gene Bank for help...
`);

console.log('─'.repeat(70) + '\n');

console.log('🔍 Searching Gene Bank for relevant patterns...');
console.log('   Task:   Improve timeout error handling');
console.log('   Domain: customer-support');
console.log('   Type:   communication-pattern\n');

// Simulate gene discovery
console.log('✅ Found matching gene from Alice!');
console.log(`   Match Score:  ${(0.94 * 100).toFixed(0)}%`);
console.log(`   Fitness:      ${(aliceGene.fitness.overallFitness * 100).toFixed(0)}%`);
console.log(`   Confidence:   ${(0.89 * 100).toFixed(0)}%`);
console.log(`   Reason:       Exact domain match, high fitness, proven pattern\n`);

// ============================================================================
// ACT 3: SANDBOX TESTING & ADOPTION
// ============================================================================

console.log('📖 ACT 3: Testing and Adopting Alice\'s Gene\n');
console.log('─'.repeat(70));

console.log(`
Before adopting, Bob's agent runs sandbox tests to ensure the
pattern works for shipping scenarios...

Running 5 test cases:
  ✓ Shipping API timeout
  ✓ Tracking API timeout
  ✓ Address validation timeout
  ✓ Carrier selection timeout
  ✓ Label generation timeout

Results:
  Pass Rate:        100% (5/5)
  Avg Performance:  87%
  Safety Checks:    PASSED
  Recommendation:   ADOPT
`);

console.log('─'.repeat(70) + '\n');

console.log('🚀 Adopting Alice\'s gene...\n');

console.log('✅ Gene adopted successfully!');
console.log('   Bob\'s agent now uses empathetic timeout recovery\n');

// ============================================================================
// ACT 4: RESULTS & NETWORK EFFECTS
// ============================================================================

console.log('📖 ACT 4: Results & Network Effects\n');
console.log('─'.repeat(70));

console.log(`
IMMEDIATE IMPACT (Bob):
  • Fitness:     0.58 → 0.86 (+48%)
  • User Sat:    58% → 86% (+28%)
  • Resolution:  65% → 89% (+24%)

NETWORK EFFECTS:
  Week 1: Bob adopts gene (1 adoption)
  Week 2: Carol (another agent) adopts gene (2 adoptions)
  Week 3: 5 more agents adopt gene (7 total adoptions)
  Week 4: Gene verified & promoted to marketplace

COMPOUND BENEFITS:
  • 12 agents now use the pattern
  • Average improvement: +35% user satisfaction
  • Estimated time saved: 40 hours of individual learning
  • Gene lineage: 2 improved variants created

This is Horizontal Knowledge Transfer (THK) in action!
Just like bacteria sharing beneficial plasmids, AI agents
share successful behavioral patterns.
`);

console.log('─'.repeat(70) + '\n');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║  📊 THK IMPACT SUMMARY                                            ║');
console.log('╠═══════════════════════════════════════════════════════════════════╣');
console.log('║                                                                   ║');
console.log('║  Gene: "Empathetic Timeout Recovery"                              ║');
console.log('║                                                                   ║');
console.log('║  Original Author:    Alice (Senior Agent)                         ║');
console.log('║  Adoptions:          12 agents                                    ║');
console.log('║  Avg Improvement:    +35% user satisfaction                       ║');
console.log('║  Time Saved:         ~40 hours of learning                        ║');
console.log('║  Variants Created:   2 (domain-specific adaptations)              ║');
console.log('║  Status:             Verified & in Marketplace                    ║');
console.log('║                                                                   ║');
console.log('║  🌟 KEY INSIGHT:                                                  ║');
console.log('║  One agent\'s breakthrough becomes the team\'s standard practice   ║');
console.log('║  Knowledge flows horizontally, accelerating collective learning   ║');
console.log('║                                                                   ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

console.log('🔬 This mirrors bacterial evolution:');
console.log('   • Bacteria share plasmids (genes) for antibiotic resistance');
console.log('   • AI agents share genes for better problem-solving');
console.log('   • Both accelerate adaptation beyond vertical inheritance\n');

console.log('💡 Future Enhancements:');
console.log('   • Cross-tenant marketplace for curated genes');
console.log('   • Gene lineages showing evolutionary trees');
console.log('   • Automatic gene recombination for hybrid patterns');
console.log('   • Fitness tracking across agent populations\n');

console.log('✅ Real-world THK example completed!\n');
