# PGA Monitoring & Observability

Enterprise-grade monitoring and observability for PGA (Genomic Self-Evolving Prompts).

## Features

- **Performance Metrics** - Track latency, throughput, success rates
- **Cost Tracking** - Monitor costs per token/interaction across multiple models
- **Health Monitoring** - Component-level health checks and system status
- **Audit Logging** - Comprehensive operation logging with structured data
- **Alerting System** - Configurable alerts for cost, performance, and errors
- **Multi-Model Support** - Track costs for Claude, GPT-4, and other models

## Quick Start

```typescript
import { MetricsCollector } from '@pga-ai/core';

const metrics = new MetricsCollector({
  alertThresholds: {
    maxCostPerHour: 100,
    maxErrorRate: 0.05,
    maxP95Latency: 3000,
    maxMemoryUsageMB: 500,
  },
});

// Record a request
metrics.recordRequest({
  requestId: 'req_123',
  duration: 1250,
  success: true,
  model: 'claude-sonnet-4.5',
  inputTokens: 500,
  outputTokens: 1200,
});

// Get metrics
const performance = metrics.getPerformanceMetrics();
const costs = metrics.getCostMetrics();
const health = metrics.getHealthStatus();
const alerts = metrics.getAlerts();
```

## Performance Metrics

Track key performance indicators:

```typescript
const perfMetrics = metrics.getPerformanceMetrics();

console.log('Performance:', {
  avgResponseTime: perfMetrics.avgResponseTime, // ms
  p95ResponseTime: perfMetrics.p95ResponseTime, // ms
  p99ResponseTime: perfMetrics.p99ResponseTime, // ms
  successRate: perfMetrics.successRate, // 0-1
  totalRequests: perfMetrics.totalRequests,
  totalTokens: perfMetrics.totalTokens,
});
```

**Available Metrics:**
- Average response time
- P95 and P99 response times
- Total/successful/failed requests
- Success rate
- Average tokens per request
- Total tokens used

## Cost Tracking

Monitor costs across multiple LLM providers:

```typescript
const costMetrics = metrics.getCostMetrics();

console.log('Costs:', {
  totalCost: costMetrics.totalCost, // USD
  avgCostPerRequest: costMetrics.avgCostPerRequest,
  costByModel: costMetrics.costByModel,
});
```

**Supported Models with Pricing:**

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| claude-sonnet-4.5 | $3.00 | $15.00 |
| claude-opus-4 | $15.00 | $75.00 |
| claude-haiku-3 | $0.25 | $1.25 |
| gpt-4-turbo-preview | $10.00 | $30.00 |
| gpt-4 | $30.00 | $60.00 |
| gpt-3.5-turbo | $0.50 | $1.50 |

**Custom Pricing:**

```typescript
const metrics = new MetricsCollector({
  costPerMillionInputTokens: {
    'my-custom-model': 5.0,
  },
  costPerMillionOutputTokens: {
    'my-custom-model': 25.0,
  },
});
```

## Health Monitoring

Check system health in real-time:

```typescript
const health = metrics.getHealthStatus();

console.log('Health:', {
  status: health.status, // 'healthy' | 'degraded' | 'unhealthy'
  uptime: health.uptime, // seconds
  memoryUsage: health.memoryUsage, // MB
  components: {
    llm: health.components.llm.status,
    storage: health.components.storage.status,
    genome: health.components.genome.status,
  },
});
```

**Component Health:**
- `up` - Component is operational
- `degraded` - Component is operational but performance is reduced
- `down` - Component is not operational

## Audit Logging

Log operations with structured data:

```typescript
metrics.logAudit({
  level: 'info',
  component: 'genome',
  operation: 'chat',
  userId: 'user-123',
  genomeId: 'genome-abc',
  message: 'Chat completed successfully',
  duration: 1250,
  metadata: {
    model: 'claude-sonnet-4.5',
    tokens: 1700,
  },
});

// Get recent logs
const logs = metrics.getAuditLogs(100);
```

**Log Levels:**
- `info` - Normal operations
- `warning` - Potential issues
- `error` - Errors that need attention
- `critical` - Critical failures

## Alerting System

Automatic alerts based on thresholds:

```typescript
const metrics = new MetricsCollector({
  alertThresholds: {
    maxCostPerHour: 100, // Alert if hourly cost exceeds $100
    maxErrorRate: 0.05, // Alert if error rate exceeds 5%
    maxP95Latency: 3000, // Alert if P95 latency exceeds 3s
    maxMemoryUsageMB: 500, // Alert if memory exceeds 500MB
  },
});

// Check for active alerts
const alerts = metrics.getAlerts();

for (const alert of alerts) {
  console.log(`[${alert.severity}] ${alert.title}`);
  console.log(alert.description);

  // Resolve alert when fixed
  metrics.resolveAlert(alert.id);
}
```

**Alert Types:**
- `performance` - Latency or throughput issues
- `cost` - Cost threshold exceeded
- `error` - High error rate
- `health` - System health degraded

**Alert Severity:**
- `low` - Informational
- `medium` - Needs attention
- `high` - Requires immediate action
- `critical` - Emergency

## Export & Integration

Export metrics for external monitoring:

```typescript
const data = metrics.exportMetrics();

// Save to file
import fs from 'fs';
fs.writeFileSync('metrics.json', JSON.stringify(data, null, 2));

// Send to monitoring service
await fetch('https://monitoring.example.com/metrics', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

**Integration Examples:**

### Grafana
```typescript
// Export metrics periodically
setInterval(() => {
  const metrics = metricsCollector.exportMetrics();

  // Send to Prometheus/Grafana
  promClient.gauge('pga_response_time').set(metrics.performance.avgResponseTime);
  promClient.gauge('pga_cost_total').set(metrics.cost.totalCost);
  promClient.gauge('pga_success_rate').set(metrics.performance.successRate);
}, 60000);
```

### Datadog
```typescript
import { StatsD } from 'node-dogstatsd';

const dogstatsd = new StatsD();

setInterval(() => {
  const perf = metrics.getPerformanceMetrics();

  dogstatsd.gauge('pga.response_time', perf.avgResponseTime);
  dogstatsd.gauge('pga.success_rate', perf.successRate);
  dogstatsd.increment('pga.requests', perf.totalRequests);
}, 60000);
```

### Custom Dashboard
```typescript
app.get('/metrics', (req, res) => {
  res.json(metrics.exportMetrics());
});
```

## Configuration

Full configuration options:

```typescript
interface MetricsCollectorConfig {
  // Enable metrics collection (default: true)
  enabled?: boolean;

  // Retention period in days (default: 30)
  retentionDays?: number;

  // Enable cost tracking (default: true)
  enableCostTracking?: boolean;

  // Enable audit logging (default: true)
  enableAuditLogs?: boolean;

  // Custom pricing per 1M tokens (USD)
  costPerMillionInputTokens?: Record<string, number>;
  costPerMillionOutputTokens?: Record<string, number>;

  // Alert thresholds
  alertThresholds?: {
    maxCostPerHour?: number; // USD
    maxErrorRate?: number; // 0-1
    maxP95Latency?: number; // milliseconds
    maxMemoryUsageMB?: number; // MB
  };
}
```

## Best Practices

### 1. Wrap PGA Calls

```typescript
async function monitoredChat(genome, message, userId) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const response = await genome.chat(message, { userId });

    metrics.recordRequest({
      requestId,
      duration: Date.now() - startTime,
      success: true,
      model: 'claude-sonnet-4.5',
      inputTokens: response.usage?.inputTokens || 0,
      outputTokens: response.usage?.outputTokens || 0,
    });

    return response;
  } catch (error) {
    metrics.recordRequest({
      requestId,
      duration: Date.now() - startTime,
      success: false,
      model: 'claude-sonnet-4.5',
      inputTokens: 0,
      outputTokens: 0,
      error: error.message,
    });

    throw error;
  }
}
```

### 2. Periodic Health Checks

```typescript
setInterval(() => {
  const health = metrics.getHealthStatus();

  if (health.status !== 'healthy') {
    console.error('Health check failed:', health);
    // Send notification
  }
}, 60000); // Every minute
```

### 3. Alert Notifications

```typescript
setInterval(() => {
  const alerts = metrics.getAlerts();

  for (const alert of alerts) {
    // Send to Slack
    await slack.send({
      text: `🚨 [${alert.severity}] ${alert.title}`,
      details: alert.description,
    });

    // Mark as notified
    metrics.resolveAlert(alert.id);
  }
}, 30000); // Every 30 seconds
```

### 4. Cost Budget Monitoring

```typescript
function checkDailyBudget() {
  const cost = metrics.getCostMetrics();
  const dailyBudget = 1000; // $1000/day

  if (cost.totalCost > dailyBudget) {
    console.error('Daily budget exceeded!');
    // Disable or throttle requests
  }
}
```

## Examples

See [examples/monitoring-demo.ts](../../../examples/monitoring-demo.ts) for a comprehensive demonstration.

## License

MIT

## Author

**Luis Alfredo Velasquez Duran** (Germany, 2025)
