/**
 * Observability Demo for Layered Memory
 *
 * Demonstrates metrics tracking via audit logs for:
 * - Memory compaction operations
 * - Fact extraction operations
 * - Performance metrics collection
 *
 * This simulates what happens when LayeredMemory integrates with MetricsCollector
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-01
 */

import { MetricsCollector } from '../packages/core/src/monitoring/MetricsCollector.js';

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  LAYERED MEMORY OBSERVABILITY DEMO                        ║');
    console.log('║  Step A: Metrics Tracking for Production Readiness       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // ─── 1. Setup MetricsCollector ─────────────────────────────
    console.log('📋 Setting up MetricsCollector with audit logging...\n');

    const metricsCollector = new MetricsCollector({
        enabled: true,
        enableAuditLogs: true,
        enableCostTracking: true,
        retentionDays: 30,
    });

    // ─── 2. Simulate Layered Memory Operations ────────────────
    console.log('💬 Simulating Layered Memory operations...\n');

    // Simulate compaction operation
    console.log('1️⃣  Compacting medium-term memory...');
    metricsCollector.logAudit({
        level: 'info',
        component: 'LayeredMemory',
        operation: 'compaction',
        userId: 'demo-user',
        genomeId: 'genome-123',
        message: 'Compacted 15 messages with 4.2x compression ratio',
        duration: 125.5,
        metadata: {
            messagesCompacted: 15,
            tokensBeforeCompaction: 8500,
            tokensAfterCompaction: 2000,
            compressionRatio: 0.765, // 76.5% reduction
        },
    });

    // Simulate successful fact extraction
    console.log('2️⃣  Extracting semantic facts...');
    metricsCollector.logAudit({
        level: 'info',
        component: 'LayeredMemory',
        operation: 'fact_extraction',
        userId: 'demo-user',
        genomeId: 'genome-123',
        message: 'Extracted 7 semantic facts with avg confidence 0.89',
        duration: 342.8,
        metadata: {
            factsExtracted: 7,
            avgConfidence: 0.89,
            success: true,
        },
    });

    // Simulate warning: low confidence facts
    console.log('3️⃣  Warning: Low confidence extraction...');
    metricsCollector.logAudit({
        level: 'warning',
        component: 'LayeredMemory',
        operation: 'fact_extraction',
        userId: 'demo-user-2',
        genomeId: 'genome-123',
        message: 'No facts extracted from messages',
        duration: 98.2,
        metadata: {
            factsExtracted: 0,
            avgConfidence: 0,
            success: false,
        },
    });

    // Simulate error: extraction failure
    console.log('4️⃣  Error: Extraction failed...');
    metricsCollector.logAudit({
        level: 'error',
        component: 'LayeredMemory',
        operation: 'fact_extraction',
        userId: 'demo-user-3',
        genomeId: 'genome-123',
        message: 'Failed to extract semantic facts',
        duration: 1250.0,
        metadata: {
            factsExtracted: 0,
            success: false,
        },
        error: {
            name: 'LLMTimeoutError',
            message: 'LLM request timed out after 5000ms',
            stack: 'Error: LLM request timed out\n    at extractFacts...',
        },
    });

    // Simulate LLM request tracking
    console.log('5️⃣  Recording LLM requests...\n');
    metricsCollector.recordRequest({
        requestId: 'req-001',
        duration: 1250,
        success: true,
        model: 'claude-sonnet-4.5',
        inputTokens: 8500,
        outputTokens: 2000,
    });

    metricsCollector.recordRequest({
        requestId: 'req-002',
        duration: 850,
        success: true,
        model: 'claude-sonnet-4.5',
        inputTokens: 500,
        outputTokens: 150,
    });

    metricsCollector.recordRequest({
        requestId: 'req-003',
        duration: 5000,
        success: false,
        model: 'claude-sonnet-4.5',
        inputTokens: 1200,
        outputTokens: 0,
        error: 'Timeout',
    });

    // ─── 3. Display Audit Logs ─────────────────────────────────
    console.log('\n📊 AUDIT LOGS (Layered Memory Operations):\n');
    console.log('─'.repeat(80));

    const auditLogs = metricsCollector.getAuditLogs();

    for (const log of auditLogs) {
        const levelEmoji = {
            info: '✅',
            warning: '⚠️ ',
            error: '❌',
            critical: '🚨',
        }[log.level];

        console.log(`${levelEmoji} [${log.level.toUpperCase()}] ${log.component}.${log.operation}`);
        console.log(`   Message: ${log.message}`);

        if (log.duration) {
            console.log(`   Duration: ${log.duration.toFixed(2)}ms`);
        }

        if (log.metadata) {
            console.log(`   Metadata:`, JSON.stringify(log.metadata, null, 2).split('\n').map((line, i) => i === 0 ? line : `             ${line}`).join('\n'));
        }

        if (log.error) {
            console.log(`   Error: ${log.error.message}`);
        }

        console.log(`   Timestamp: ${log.timestamp.toISOString()}`);
        console.log('─'.repeat(80));
    }

    // ─── 4. Display Performance Metrics ────────────────────────
    console.log('\n📈 PERFORMANCE METRICS:\n');

    const perfMetrics = metricsCollector.getPerformanceMetrics();
    console.log(`Total Requests:       ${perfMetrics.totalRequests}`);
    console.log(`Successful:           ${perfMetrics.successfulRequests} (${(perfMetrics.successRate * 100).toFixed(1)}%)`);
    console.log(`Failed:               ${perfMetrics.failedRequests}`);
    console.log(`Avg Response Time:    ${perfMetrics.avgResponseTime.toFixed(2)}ms`);
    console.log(`P95 Response Time:    ${perfMetrics.p95ResponseTime.toFixed(2)}ms`);
    console.log(`P99 Response Time:    ${perfMetrics.p99ResponseTime.toFixed(2)}ms`);
    console.log(`Total Tokens:         ${perfMetrics.totalTokens.toLocaleString()}`);
    console.log(`Avg Tokens/Request:   ${perfMetrics.avgTokensPerRequest.toFixed(0)}`);

    // ─── 5. Display Cost Metrics ───────────────────────────────
    console.log('\n💰 COST METRICS:\n');

    const costMetrics = metricsCollector.getCostMetrics();
    console.log(`Total Cost:           $${costMetrics.totalCost.toFixed(4)}`);
    console.log(`Avg Cost/Request:     $${costMetrics.avgCostPerRequest.toFixed(6)}`);
    console.log(`Input Tokens:         ${costMetrics.totalInputTokens.toLocaleString()} ($${costMetrics.inputTokensCost.toFixed(4)})`);
    console.log(`Output Tokens:        ${costMetrics.totalOutputTokens.toLocaleString()} ($${costMetrics.outputTokensCost.toFixed(4)})`);
    console.log('\nCost by Model:');
    for (const [model, cost] of Object.entries(costMetrics.costByModel)) {
        console.log(`  ${model}: $${cost.toFixed(4)}`);
    }

    // ─── 6. Display Health Status ──────────────────────────────
    console.log('\n💚 HEALTH STATUS:\n');

    const health = metricsCollector.getHealthStatus();
    const statusEmoji = {
        healthy: '✅',
        degraded: '⚠️ ',
        unhealthy: '❌',
    }[health.status];

    console.log(`Overall Status:       ${statusEmoji} ${health.status.toUpperCase()}`);
    console.log(`LLM:                  ${health.components.llm.status}`);
    console.log(`Storage:              ${health.components.storage.status}`);
    console.log(`Genome:               ${health.components.genome.status}`);
    console.log(`Uptime:               ${health.uptime.toFixed(2)}s`);
    console.log(`Memory Usage:         ${health.memoryUsage.toFixed(2)} MB`);

    // ─── 7. Display Active Alerts ──────────────────────────────
    console.log('\n🚨 ACTIVE ALERTS:\n');

    const alerts = metricsCollector.getAlerts();
    if (alerts.length === 0) {
        console.log('✅ No active alerts');
    } else {
        for (const alert of alerts) {
            console.log(`[${alert.severity.toUpperCase()}] ${alert.title}`);
            console.log(`   ${alert.description}`);
            console.log(`   Type: ${alert.type}`);
            console.log(`   Time: ${alert.timestamp.toISOString()}`);
            console.log('─'.repeat(80));
        }
    }

    // ─── 8. Summary ────────────────────────────────────────────
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ OBSERVABILITY STEP A: COMPLETED                       ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  What was demonstrated:                                   ║');
    console.log('║  ✓ Audit logging for LayeredMemory operations            ║');
    console.log('║  ✓ Performance metrics (latency, success rate)           ║');
    console.log('║  ✓ Cost tracking (tokens, pricing by model)              ║');
    console.log('║  ✓ Health monitoring (components, memory usage)          ║');
    console.log('║  ✓ Alert system (automatic threshold monitoring)         ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Next Steps:                                              ║');
    console.log('║  - Step B: Create Evaluation Suite for KPI validation    ║');
    console.log('║  - Measure: Context Retention Score                       ║');
    console.log('║  - Measure: Token Reduction Rate (target: 85-95%)         ║');
    console.log('║  - Measure: Latency Impact (target: <10% increase)        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
