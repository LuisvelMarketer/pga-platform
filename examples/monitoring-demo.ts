/**
 * Production Monitoring Dashboard Demo
 *
 * Demonstrates how to monitor Evolution Guardrails and economic metrics
 * in a production PGA deployment.
 *
 * Living OS v1.0 Must-Have: Real-time production monitoring
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import { PGA, type EvolutionGuardrails } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';
import { PostgresAdapter } from '@pga-ai/adapters-storage-postgres';

async function productionMonitoringDemo() {
    // ═══════════════════════════════════════════════════════
    // SETUP: Initialize PGA with production configuration
    // ═══════════════════════════════════════════════════════

    const pga = new PGA({
        llm: new ClaudeAdapter({
            apiKey: process.env.ANTHROPIC_API_KEY || 'demo-key',
        }),
        storage: new PostgresAdapter({
            connectionString: process.env.DATABASE_URL || 'postgres://localhost/pga',
        }),
        config: {
            enableSandbox: true,
            mutationRate: 'balanced',
        },
    });

    await pga.initialize();

    // ═══════════════════════════════════════════════════════
    // CREATE GENOME: With custom Evolution Guardrails
    // ═══════════════════════════════════════════════════════

    const customGuardrails: EvolutionGuardrails = {
        minQualityScore: 0.70,
        minSandboxScore: 0.80,
        minCompressionScore: 0.70,
        maxCostPerTask: 0.05,
        minStabilityWindow: 20,
        maxRollbackRate: 0.15,
        gateMode: 'AND',
    };

    const genome = await pga.createGenome({
        name: 'production-agent',
        config: {
            evolutionGuardrails: customGuardrails,
            mutationRate: 'slow',
        },
    });

    console.log('🧬 Production Genome Created:', genome.id);
    console.log('\n📊 Evolution Guardrails Report:');
    console.log(genome.getGuardrailsReport());

    // Test mutation with gate validation
    const result = await genome.mutate({
        operators: ['compress_instructions'],
        layer: 2,
    });

    console.log('\n🛡️ Mutation Result:', result);
}

export { productionMonitoringDemo };
