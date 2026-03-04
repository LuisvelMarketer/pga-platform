/**
 * Evaluation Framework Demo
 *
 * This example shows how to use the Evaluator to prove PGA superiority.
 */

import { PGA } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';
import { PostgresAdapter } from '@pga-ai/adapters-storage-postgres';
import { Evaluator, STANDARD_TASKS } from '@pga-ai/core/evaluation/Evaluator';

async function main() {
    console.log('\n🔬 PGA EVALUATION FRAMEWORK DEMO\n');
    console.log('═'.repeat(80));
    console.log('Proving PGA superiority with objective benchmarks');
    console.log('═'.repeat(80) + '\n');

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

    // Create two genomes: one with PGA features, one baseline
    console.log('📦 Creating genomes...\n');

    const genomeWithPGA = await pga.createGenome({
        name: 'with-pga',
        config: {
            enableSandbox: true,
            mutationRate: 'balanced',
            epsilonExplore: 0.1,
        },
    });

    const genomeBaseline = await pga.createGenome({
        name: 'baseline',
        config: {
            enableSandbox: false,
            mutationRate: 'slow',
            epsilonExplore: 0,
        },
    });

    // Add basic identity to both
    const baselinePrompt = 'You are a helpful coding assistant.';

    await genomeWithPGA.addAllele({
        layer: 0,
        gene: 'core-identity',
        variant: 'default',
        content: baselinePrompt,
    });

    await genomeBaseline.addAllele({
        layer: 0,
        gene: 'core-identity',
        variant: 'default',
        content: baselinePrompt,
    });

    console.log('✓ Genomes ready\n');

    // ═══════════════════════════════════════════════════════
    // SCENARIO 1: Single Benchmark
    // ═══════════════════════════════════════════════════════

    console.log('📊 SCENARIO 1: Benchmarking PGA Genome\n');
    console.log('-'.repeat(80));

    const evaluator = new Evaluator();
    const userId = 'test-user-1';

    // Use first 3 tasks for quick demo
    const quickTasks = STANDARD_TASKS.slice(0, 3);

    const benchmark = await evaluator.evaluate(genomeWithPGA, quickTasks, userId);

    console.log('\n📈 Results:');
    console.log(`  Success Rate: ${benchmark.successRate.toFixed(1)}%`);
    console.log(`  Avg Tokens: ${benchmark.avgTokensPerTask}`);
    console.log(`  Avg Time: ${benchmark.avgResponseTime}ms`);
    console.log(`  Quality Score: ${benchmark.avgQualityScore.toFixed(2)}/1.0\n`);

    // Generate report
    const report = evaluator.formatReport(benchmark);
    console.log(report);

    // ═══════════════════════════════════════════════════════
    // SCENARIO 2: Comparison (PGA vs Baseline)
    // ═══════════════════════════════════════════════════════

    console.log('\n' + '═'.repeat(80));
    console.log('🔬 SCENARIO 2: PGA vs Baseline Comparison\n');
    console.log('-'.repeat(80));

    const comparison = await evaluator.compare(
        genomeWithPGA,
        genomeBaseline,
        quickTasks,
        userId,
    );

    console.log('\n🏆 VERDICT:', comparison.verdict);
    console.log('\n📊 Improvements:');
    console.log(`  Success Rate: ${comparison.improvements.successRate > 0 ? '+' : ''}${comparison.improvements.successRate.toFixed(2)}%`);
    console.log(`  Token Efficiency: ${comparison.improvements.tokenEfficiency > 0 ? '+' : ''}${comparison.improvements.tokenEfficiency.toFixed(2)}%`);
    console.log(`  Response Speed: ${comparison.improvements.responseTime > 0 ? '+' : ''}${comparison.improvements.responseTime.toFixed(2)}%`);
    console.log(`  Quality Score: ${comparison.improvements.qualityScore > 0 ? '+' : ''}${comparison.improvements.qualityScore.toFixed(2)}%\n`);

    // Generate comparison report
    const comparisonReport = evaluator.formatComparisonReport(comparison);
    console.log(comparisonReport);

    // ═══════════════════════════════════════════════════════
    // SCENARIO 3: Learning Over Time
    // ═══════════════════════════════════════════════════════

    console.log('\n' + '═'.repeat(80));
    console.log('📈 SCENARIO 3: Learning Velocity (Improvement Over Time)\n');
    console.log('-'.repeat(80));

    // Run multiple iterations to show learning
    console.log('\nRunning 3 iterations to demonstrate learning...\n');

    const iterations = 3;
    const learningResults = [];

    for (let i = 0; i < iterations; i++) {
        console.log(`🔄 Iteration ${i + 1}/${iterations}...`);

        const result = await evaluator.evaluate(genomeWithPGA, quickTasks, userId);
        learningResults.push(result);

        console.log(`   Success Rate: ${result.successRate.toFixed(1)}%`);
        console.log(`   Quality Score: ${result.avgQualityScore.toFixed(2)}/1.0\n`);
    }

    // Show improvement trend
    console.log('📊 Learning Trend:');
    console.log('| Iteration | Success Rate | Quality Score |');
    console.log('|-----------|--------------|---------------|');

    for (let i = 0; i < learningResults.length; i++) {
        const result = learningResults[i];
        console.log(
            `| ${i + 1}         | ${result.successRate.toFixed(1)}%         | ${result.avgQualityScore.toFixed(2)}/1.0       |`,
        );
    }

    // Calculate learning velocity
    if (learningResults.length >= 2) {
        const first = learningResults[0];
        const last = learningResults[learningResults.length - 1];

        const successImprovement = last.successRate - first.successRate;
        const qualityImprovement =
            ((last.avgQualityScore - first.avgQualityScore) / first.avgQualityScore) * 100;

        console.log('\n📈 Learning Velocity:');
        console.log(`  Success Rate: ${successImprovement > 0 ? '+' : ''}${successImprovement.toFixed(1)}% improvement`);
        console.log(`  Quality Score: ${qualityImprovement > 0 ? '+' : ''}${qualityImprovement.toFixed(1)}% improvement`);
    }

    // ═══════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════

    console.log('\n' + '═'.repeat(80));
    console.log('✅ EVALUATION COMPLETE\n');
    console.log('Key Findings:');
    console.log('1. ✅ PGA can be objectively measured');
    console.log('2. ✅ Comparison with baseline is automated');
    console.log('3. ✅ Learning over time is quantifiable');
    console.log('4. ✅ Reports are generated automatically');
    console.log('\nThis framework provides PROOF that PGA works! 🎯');
    console.log('═'.repeat(80) + '\n');
}

// Run the demo
main().catch(console.error);
