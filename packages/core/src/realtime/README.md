# PGA Real-Time Features

Real-time event system, streaming responses, and live updates for PGA.

## Features

- **Event System** - Type-safe event emitter with history
- **Streaming Manager** - Stream text, arrays, and data flows
- **Live Updates** - Real-time genome and metrics updates
- **WebSocket Ready** - Integration-ready event system

## Event System

Type-safe event emitter for genome changes, mutations, and system events.

### Quick Start

```typescript
import { PGAEventEmitter } from '@pga-ai/core';

const events = new PGAEventEmitter();

// Subscribe to genome creation
events.on('genome:created', (event) => {
  console.log('New genome:', event.data.genomeId);
});

// Emit event
await events.emit('genome:created', {
  genomeId: 'genome-123',
  name: 'My Assistant',
  userId: 'user-456',
});
```

### Event Types

#### Genome Events
- `genome:created` - New genome created
- `genome:updated` - Genome configuration updated
- `genome:deleted` - Genome deleted
- `genome:evolved` - Genome evolved (mutation applied)

#### Mutation Events
- `mutation:proposed` - New mutation proposed
- `mutation:applied` - Mutation successfully applied
- `mutation:rejected` - Mutation rejected

#### Chat Events
- `chat:started` - Chat session started
- `chat:message` - New chat message
- `chat:completed` - Chat session completed

#### System Events
- `metrics:updated` - Metrics updated
- `alert:triggered` - Alert triggered
- `health:changed` - System health changed
- `user:created` - User created
- `user:updated` - User updated

### Subscribe to Events

```typescript
// Subscribe to specific event
const subscriptionId = events.on('genome:evolved', (event) => {
  const data = event.data as GenomeEvolvedEvent;

  console.log(`Genome ${data.genomeId} evolved`);
  console.log(`Gene: ${data.gene}, Layer: ${data.layer}`);
  console.log(`Fitness: ${data.oldFitness} → ${data.newFitness}`);
  console.log(`Improvement: ${data.improvement.toFixed(2)}`);
});

// Unsubscribe
events.off(subscriptionId);
```

### One-Time Subscriptions

```typescript
// Execute handler only once
events.once('genome:created', (event) => {
  console.log('First genome created!');
});
```

### Wildcard Subscriptions

```typescript
// Listen to all events
events.onAny((event) => {
  console.log(`Event: ${event.type}`, event.data);
});
```

### Event Metadata

```typescript
await events.emit('chat:message', {
  genomeId: 'genome-123',
  userId: 'user-456',
  message: 'Hello!',
}, {
  // Metadata
  correlationId: 'request-789',
  tenantId: 'company-abc',
  source: 'web-ui',
});
```

### Event History

```typescript
// Get all events
const allEvents = events.getHistory();

// Filter by type
const chatEvents = events.getHistory({
  type: 'chat:message',
});

// Filter by time
const recentEvents = events.getHistory({
  since: new Date(Date.now() - 3600000), // Last hour
  limit: 100,
});
```

### Wait for Event

```typescript
// Wait for specific event
const event = await events.waitFor('genome:evolved', 5000);

// With predicate
const myGenomeEvolved = await events.waitFor(
  'genome:evolved',
  10000,
  (event) => event.data.genomeId === 'genome-123'
);
```

### Integration with PGA

```typescript
import { PGA, PGAEventEmitter } from '@pga-ai/core';

const events = new PGAEventEmitter();
const pga = new PGA({
  llmAdapter: new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  }),
  eventEmitter: events, // Pass event emitter
});

// Listen for genome evolution
events.on('genome:evolved', async (event) => {
  const data = event.data as GenomeEvolvedEvent;

  // Send notification
  await sendSlackNotification({
    channel: '#ai-updates',
    text: `🧬 Genome evolved! Fitness improved by ${(data.improvement * 100).toFixed(1)}%`,
  });

  // Log to analytics
  await analytics.track('genome_evolved', data);
});

// Create genome (automatically emits event)
const genome = await pga.createGenome({ name: 'assistant' });
```

## Streaming Manager

Stream text, arrays, and data flows with buffering and flow control.

### Stream Text

```typescript
import { StreamingManager } from '@pga-ai/core';

const streaming = new StreamingManager();

// Stream text with chunks
for await (const chunk of streaming.streamText('Hello, world!', {
  bufferSize: 5,
  chunkDelay: 100,
  onChunk: (chunk) => {
    console.log('Chunk:', chunk.data);
  },
})) {
  process.stdout.write(chunk.data);
}
```

### Stream Arrays

```typescript
const items = [1, 2, 3, 4, 5];

for await (const chunk of streaming.streamArray(items, {
  chunkDelay: 200,
})) {
  console.log('Item:', chunk.data, `(${chunk.index + 1}/${items.length})`);
}
```

### Buffer Stream

```typescript
// Buffer chunks into groups
const buffered = streaming.bufferStream(
  streaming.streamText('123456789', { bufferSize: 1 }),
  3 // Buffer size
);

for await (const chunk of buffered) {
  console.log('Buffer:', chunk.data); // ['1','2','3'], ['4','5','6'], ['7','8','9']
}
```

### Map Stream

```typescript
// Transform stream data
const mapped = streaming.mapStream(
  streaming.streamArray([1, 2, 3, 4, 5]),
  (n) => n * 2
);

for await (const chunk of mapped) {
  console.log(chunk.data); // 2, 4, 6, 8, 10
}
```

### Filter Stream

```typescript
// Filter stream data
const filtered = streaming.filterStream(
  streaming.streamArray([1, 2, 3, 4, 5]),
  (n) => n % 2 === 0
);

for await (const chunk of filtered) {
  console.log(chunk.data); // 2, 4
}
```

### Rate Limit Stream

```typescript
// Limit to 2 chunks per second
const rateLimited = streaming.rateLimitStream(
  streaming.streamArray([1, 2, 3, 4, 5]),
  2 // Max 2 chunks/second
);

for await (const chunk of rateLimited) {
  console.log(chunk.data);
}
```

### Collect Stream

```typescript
// Collect all chunks into array
const result = await streaming.collectStream(
  streaming.streamText('Hello', { bufferSize: 1 })
);

console.log(result); // ['H', 'e', 'l', 'l', 'o']
```

### Merge Streams

```typescript
const stream1 = streaming.streamArray([1, 2, 3]);
const stream2 = streaming.streamArray([4, 5, 6]);

const merged = streaming.mergeStreams(stream1, stream2);

for await (const chunk of merged) {
  console.log(chunk.data); // 1, 2, 3, 4, 5, 6
}
```

## Real-Time Chat Example

```typescript
import { PGA, PGAEventEmitter, StreamingManager } from '@pga-ai/core';

const events = new PGAEventEmitter();
const streaming = new StreamingManager();

// Listen for chat events
events.on('chat:message', (event) => {
  console.log(`User: ${event.data.message}`);
});

// Stream chat response
async function streamChat(genome, message, userId) {
  // Start chat
  await events.emit('chat:started', {
    genomeId: genome.id,
    userId,
  });

  // Get response stream
  const response = await genome.chatStream(message, { userId });

  let fullResponse = '';

  // Stream to client
  for await (const chunk of response) {
    fullResponse += chunk.delta;

    // Send chunk to client (WebSocket, SSE, etc.)
    sendToClient({
      type: 'chunk',
      data: chunk.delta,
      done: chunk.done,
    });
  }

  // Complete
  await events.emit('chat:completed', {
    genomeId: genome.id,
    userId,
    message,
    response: fullResponse,
  });
}
```

## WebSocket Integration

```typescript
import { WebSocketServer } from 'ws';
import { PGAEventEmitter } from '@pga-ai/core';

const wss = new WebSocketServer({ port: 8080 });
const events = new PGAEventEmitter();

wss.on('connection', (ws) => {
  // Subscribe to all events for this client
  const subscriptionId = events.onAny((event) => {
    ws.send(JSON.stringify(event));
  });

  // Clean up on disconnect
  ws.on('close', () => {
    events.off(subscriptionId);
  });
});

// Events are automatically sent to all connected clients
await events.emit('genome:evolved', {
  genomeId: 'genome-123',
  improvement: 0.15,
});
```

## Server-Sent Events (SSE)

```typescript
import express from 'express';
import { PGAEventEmitter } from '@pga-ai/core';

const app = express();
const events = new PGAEventEmitter();

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const subscriptionId = events.onAny((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on('close', () => {
    events.off(subscriptionId);
  });
});

app.listen(3000);
```

## Live Metrics Dashboard

```typescript
import { PGAEventEmitter, MetricsCollector } from '@pga-ai/core';

const events = new PGAEventEmitter();
const metrics = new MetricsCollector();

// Update metrics every second
setInterval(() => {
  const performance = metrics.getPerformanceMetrics();
  const costs = metrics.getCostMetrics();
  const health = metrics.getHealthStatus();

  events.emitSync('metrics:updated', {
    type: 'all',
    data: { performance, costs, health },
  });
}, 1000);

// Client receives live updates
events.on('metrics:updated', (event) => {
  updateDashboard(event.data);
});
```

## Best Practices

### 1. Use Event History for Debugging

```typescript
// Log all events for debugging
events.onAny((event) => {
  console.log(`[${event.timestamp.toISOString()}] ${event.type}`, event.data);
});

// Replay recent events
const recentEvents = events.getHistory({ limit: 10 });
for (const event of recentEvents) {
  console.log(event);
}
```

### 2. Correlation IDs for Request Tracking

```typescript
const correlationId = crypto.randomUUID();

await events.emit('chat:started', data, {
  correlationId,
  userId: 'user-123',
});

await events.emit('chat:completed', data, {
  correlationId,
  userId: 'user-123',
});

// Track request flow
const requestEvents = events.getHistory().filter(
  (e) => e.metadata?.correlationId === correlationId
);
```

### 3. Graceful Cleanup

```typescript
class ChatService {
  private subscriptionIds: string[] = [];

  start() {
    this.subscriptionIds.push(
      events.on('chat:message', this.handleMessage)
    );
  }

  stop() {
    for (const id of this.subscriptionIds) {
      events.off(id);
    }
    this.subscriptionIds = [];
  }
}
```

### 4. Error Handling in Streams

```typescript
const stream = streaming.streamText('content', {
  onError: (error) => {
    console.error('Stream error:', error);
    // Send error to client
    sendToClient({ type: 'error', error: error.message });
  },
});
```

## Performance Considerations

- **Event History**: Limited to 1000 events by default (configurable)
- **Memory Usage**: ~100 bytes per event in history
- **Async Handlers**: Handlers run in parallel, use `await` for ordering
- **Stream Buffering**: Adjust buffer size based on network conditions

## License

MIT

## Author

**Luis Alfredo Velasquez Duran** (Germany, 2025)
