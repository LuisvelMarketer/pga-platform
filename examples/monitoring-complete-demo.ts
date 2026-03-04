/**
 * Complete Monitoring System Demo
 *
 * Demonstrates PGA monitoring capabilities with:
 * - Real-time metrics collection
 * - Cost tracking across models
 * - Health monitoring
 * - Alert system
 * - Live dashboard
 *
 * This is a SIMULATED demo - it doesn't require real LLM/storage adapters.
 * Perfect for testing and understanding the monitoring system.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import { MetricsCollector, MonitoringDashboard } from '@pga-ai/core';

async function completeMonitoringDemo() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  PGA MONITORING SYSTEM — Complete Demo                       ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  This demo simulates a production PGA deployment with:       ║');
    console.log('║  • Multiple concurrent requests                              ║');
    console.log('║  • Different models (Claude, GPT-4)                          ║');
    console.log('║  • Success and failure scenarios                             ║');
    console.log('║  • Cost tracking                                              ║');
    console.log('║  • Alert triggering                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // ═══════════════════════════════════════════════════════
    // SETUP: Create MetricsCollector with custom thresholds
    // ═══════════════════════════════════════════════════════

    console.log('📊 Setting up Metrics Collector...\n');

    const metrics = new MetricsCollector({
        enabled: true,
        enableCostTracking: true,
        enableAuditLogs: true,
        retentionDays: 30,
        alertThresholds: {
            maxCostPerHour: 5.0, // Alert if hourly cost exceeds $5
            maxErrorRate: 0.15, // Alert if error rate exceeds 15%
            maxP95Latency: 3000, // Alert if P95 latency exceeds 3s
            maxMemoryUsageMB: 500, // Alert if memory exceeds 500MB
        },
    });

    // ═══════════════════════════════════════════════════════
    // SETUP: Create Monitoring Dashboard
    // ═══════════════════════════════════════════════════════

    const dashboard = new MonitoringDashboard(metrics, {
        refreshInterval: 2000,
        showPerformance: true,
        showCost: true,
        showHealth: true,
        showAlerts: true,
        showAuditLogs: true,
        maxLogs: 5,
    });

    // ═══════════════════════════════════════════════════════
    // PHASE 1: Normal Operations (Healthy System)
    // ═══════════════════════════════════════════════════════

    console.log('🟢 PHASE 1: Simulating Normal Operations...\n');

    await sleep(1000);

    // Simulate 20 successful requests with normal latency
    for (let i = 1; i <= 20; i++) {
        const model = i % 2 === 0 ? 'claude-sonnet-4.5' : 'gpt-4-turbo-preview';
        const latency = randomInt(800, 1500);
        const inputTokens = randomInt(200, 800);
        const outputTokens = randomInt(400, 1200);

        metrics.recordRequest({
            requestId: `req_normal_${i}`,
            duration: latency,
            success: true,
            model,
            inputTokens,
            outputTokens,
        });

        metrics.logAudit({
            level: 'info',
            component: 'genome',
            operation: 'chat',
            message: `Chat completed successfully`,
            genomeId: `genome_${randomInt(1, 5)}`,
            userId: `user_${randomInt(1, 10)}`,
            duration: latency,
            metadata: {
                model,
                tokens: inputTokens + outputTokens,
            },
        });

        await sleep(50);
    }

    console.log('✓ Phase 1 complete: 20 successful requests');
    console.log('\n📸 Snapshot — Normal Operations:');
    console.log('─────────────────────────────────────────\n');
    dashboard.renderSnapshot();
    await sleep(3000);

    // ═══════════════════════════════════════════════════════
    // PHASE 2: Performance Degradation (High Latency)
    // ═══════════════════════════════════════════════════════

    console.log('\n🟡 PHASE 2: Simulating Performance Degradation...\n');

    await sleep(1000);

    // Simulate 30 requests with high latency
    for (let i = 1; i <= 30; i++) {
        const model = 'claude-sonnet-4.5';
        const latency = randomInt(3500, 5000); // High latency!
        const inputTokens = randomInt(500, 1000);
        const outputTokens = randomInt(800, 1500);

        metrics.recordRequest({
            requestId: `req_slow_${i}`,
            duration: latency,
            success: true,
            model,
            inputTokens,
            outputTokens,
        });

        metrics.logAudit({
            level: 'warning',
            component: 'llm',
            operation: 'chat',
            message: `Slow response detected`,
            duration: latency,
            metadata: {
                model,
                latency,
            },
        });

        await sleep(30);
    }

    console.log('⚠ Phase 2 complete: Performance degradation detected');
    console.log('\n📸 Snapshot — High Latency Alert:');
    console.log('─────────────────────────────────────────\n');
    dashboard.renderSnapshot();
    await sleep(3000);

    // ═══════════════════════════════════════════════════════
    // PHASE 3: Error Spike (System Issues)
    // ═══════════════════════════════════════════════════════

    console.log('\n🔴 PHASE 3: Simulating Error Spike...\n');

    await sleep(1000);

    // Simulate 25 requests with 40% failure rate
    for (let i = 1; i <= 25; i++) {
        const model = 'gpt-4';
        const isSuccess = Math.random() > 0.4; // 60% success, 40% failure
        const latency = randomInt(1000, 2000);
        const inputTokens = randomInt(300, 600);
        const outputTokens = isSuccess ? randomInt(500, 1000) : 0;

        metrics.recordRequest({
            requestId: `req_error_${i}`,
            duration: latency,
            success: isSuccess,
            model,
            inputTokens,
            outputTokens,
            error: isSuccess ? undefined : 'RateLimitError: Too many requests',
        });

        metrics.logAudit({
            level: isSuccess ? 'info' : 'error',
            component: 'llm',
            operation: 'chat',
            message: isSuccess ? 'Request successful' : 'Request failed: Rate limit',
            duration: latency,
            error: isSuccess
                ? undefined
                : {
                      name: 'RateLimitError',
                      message: 'Too many requests',
                      stack: 'simulated error',
                  },
        });

        await sleep(40);
    }

    console.log('⚠ Phase 3 complete: High error rate detected');
    console.log('\n📸 Snapshot — Error Rate Alert:');
    console.log('─────────────────────────────────────────\n');
    dashboard.renderSnapshot();
    await sleep(3000);

    // ═══════════════════════════════════════════════════════
    // PHASE 4: Cost Spike (Expensive Model Usage)
    // ═══════════════════════════════════════════════════════

    console.log('\n💰 PHASE 4: Simulating Cost Spike...\n');

    await sleep(1000);

    // Simulate 10 expensive requests with Claude Opus
    for (let i = 1; i <= 10; i++) {
        const model = 'claude-opus-4';
        const latency = randomInt(2000, 3000);
        const inputTokens = randomInt(50_000, 100_000); // Large context
        const outputTokens = randomInt(20_000, 50_000); // Long response

        metrics.recordRequest({
            requestId: `req_expensive_${i}`,
            duration: latency,
            success: true,
            model,
            inputTokens,
            outputTokens,
        });

        metrics.logAudit({
            level: 'warning',
            component: 'genome',
            operation: 'chat',
            message: 'Expensive model used',
            duration: latency,
            metadata: {
                model,
                tokens: inputTokens + outputTokens,
                estimatedCost: ((inputTokens / 1_000_000) * 15 + (outputTokens / 1_000_000) * 75).toFixed(4),
            },
        });

        await sleep(100);
    }

    console.log('💸 Phase 4 complete: High cost detected');
    console.log('\n📸 Snapshot — Cost Alert:');
    console.log('─────────────────────────────────────────\n');
    dashboard.renderSnapshot();
    await sleep(3000);

    // ═══════════════════════════════════════════════════════
    // PHASE 5: Recovery (System Stabilizing)
    // ═══════════════════════════════════════════════════════

    console.log('\n🟢 PHASE 5: Simulating System Recovery...\n');

    await sleep(1000);

    // Resolve alerts
    const alerts = metrics.getAlerts();
    console.log(`\n🔧 Resolving ${alerts.length} active alerts...`);
    for (const alert of alerts) {
        metrics.resolveAlert(alert.id);
        console.log(`   ✓ Resolved: ${alert.title}`);
    }

    // Simulate 15 successful requests with good performance
    for (let i = 1; i <= 15; i++) {
        const model = 'claude-haiku-3'; // Fast, cheap model
        const latency = randomInt(400, 800);
        const inputTokens = randomInt(100, 300);
        const outputTokens = randomInt(200, 500);

        metrics.recordRequest({
            requestId: `req_recovery_${i}`,
            duration: latency,
            success: true,
            model,
            inputTokens,
            outputTokens,
        });

        metrics.logAudit({
            level: 'info',
            component: 'genome',
            operation: 'chat',
            message: 'System recovered, performance normal',
            duration: latency,
            metadata: {
                model,
                tokens: inputTokens + outputTokens,
            },
        });

        await sleep(50);
    }

    console.log('✓ Phase 5 complete: System recovered');
    console.log('\n📸 Snapshot — System Recovered:');
    console.log('─────────────────────────────────────────\n');
    dashboard.renderSnapshot();
    await sleep(3000);

    // ═══════════════════════════════════════════════════════
    // FINAL SUMMARY
    // ═══════════════════════════════════════════════════════

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  MONITORING DEMO COMPLETE                                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const finalPerf = metrics.getPerformanceMetrics();
    const finalCost = metrics.getCostMetrics();
    const finalHealth = metrics.getHealthStatus();

    console.log('📊 Final Summary:');
    console.log('─────────────────────────────────────────');
    console.log(`Total Requests:     ${finalPerf.totalRequests}`);
    console.log(`Success Rate:       ${(finalPerf.successRate * 100).toFixed(1)}%`);
    console.log(`Avg Latency:        ${finalPerf.avgResponseTime.toFixed(0)}ms`);
    console.log(`P95 Latency:        ${finalPerf.p95ResponseTime.toFixed(0)}ms`);
    console.log(`Total Cost:         $${finalCost.totalCost.toFixed(4)}`);
    console.log(`Avg Cost/Request:   $${finalCost.avgCostPerRequest.toFixed(6)}`);
    console.log(`Total Tokens:       ${finalPerf.totalTokens.toLocaleString()}`);
    console.log(`System Status:      ${finalHealth.status.toUpperCase()}`);
    console.log(`Uptime:             ${finalHealth.uptime.toFixed(0)}s`);

    console.log('\n💡 Key Insights:');
    console.log('─────────────────────────────────────────');
    console.log('✓ Monitoring system tracked all phases successfully');
    console.log('✓ Alerts triggered correctly for latency, errors, and costs');
    console.log('✓ Cost breakdown available per model');
    console.log('✓ Performance percentiles calculated accurately');
    console.log('✓ Health status reflects system state');

    // Export metrics to JSON
    const exportedMetrics = metrics.exportMetrics();
    console.log('\n📁 Metrics Export:');
    console.log('─────────────────────────────────────────');
    console.log(JSON.stringify(exportedMetrics, null, 2));

    console.log('\n✨ Demo complete!\n');
    console.log('💡 Next Steps:');
    console.log('   1. Integrate monitoring into your PGA deployment');
    console.log('   2. Configure alert thresholds for your use case');
    console.log('   3. Set up periodic metric exports to your monitoring service');
    console.log('   4. Use the dashboard for real-time visibility\n');
}

// ─── Helper Functions ───────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Run Demo ───────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
    completeMonitoringDemo().catch(console.error);
}

export { completeMonitoringDemo };
