# PGA Plugin System

Extensible plugin architecture for community tools and integrations.

## Features

- **Plugin Registry** - Register and discover plugins
- **Lifecycle Hooks** - Before/after hooks for operations
- **Plugin API** - Expose custom functionality
- **Dependency Management** - Plugin dependencies
- **Enable/Disable** - Runtime plugin control
- **Hook Ordering** - Control hook execution order

## Quick Start

### Create a Plugin

```typescript
import { Plugin } from '@pga-ai/core';

const myPlugin: Plugin = {
  metadata: {
    name: 'my-plugin',
    version: '1.0.0',
    author: 'John Doe',
    description: 'My awesome plugin',
    tags: ['analytics', 'logging'],
  },
  hooks: {
    async onLoad() {
      console.log('Plugin loaded!');
    },
    async afterChat(response) {
      console.log('Chat completed:', response);
      return response; // Can modify response
    },
  },
  api: {
    customMethod() {
      return 'Hello from plugin!';
    },
  },
};
```

### Register Plugin

```typescript
import { PluginManager } from '@pga-ai/core';

const plugins = new PluginManager();

await plugins.register(myPlugin, {
  enabled: true,
  config: {
    apiKey: 'secret',
  },
});
```

## Lifecycle Hooks

Plugins can hook into PGA operations:

### onLoad / onUnload

```typescript
const plugin: Plugin = {
  metadata: { name: 'init-plugin', version: '1.0.0' },
  hooks: {
    async onLoad() {
      // Initialize resources
      this.db = await connectDatabase();
    },
    async onUnload() {
      // Cleanup
      await this.db.close();
    },
  },
};
```

### Genome Hooks

```typescript
const plugin: Plugin = {
  metadata: { name: 'genome-logger', version: '1.0.0' },
  hooks: {
    async beforeGenomeCreate(config) {
      console.log('Creating genome:', config);
      return config; // Can modify config
    },
    async afterGenomeCreate(genome) {
      console.log('Genome created:', genome.id);
      // Send notification, log to analytics, etc.
    },
  },
};
```

### Chat Hooks

```typescript
const plugin: Plugin = {
  metadata: { name: 'chat-moderator', version: '1.0.0' },
  hooks: {
    async beforeChat(message, context) {
      // Content moderation
      if (containsProfanity(message)) {
        throw new Error('Message contains inappropriate content');
      }
      return message;
    },
    async afterChat(response) {
      // Log conversation
      await logChat(response);
      return response;
    },
  },
};
```

### Mutation Hooks

```typescript
const plugin: Plugin = {
  metadata: { name: 'mutation-validator', version: '1.0.0' },
  hooks: {
    async beforeMutation(proposal) {
      // Validate mutation
      if (proposal.fitness < 0.5) {
        throw new Error('Mutation fitness too low');
      }
      return proposal;
    },
    async afterMutation(result) {
      // Notify on successful mutation
      await sendSlackNotification({
        text: `🧬 Mutation applied: ${result.gene}`,
      });
    },
  },
};
```

### Metrics & Alerts

```typescript
const plugin: Plugin = {
  metadata: { name: 'metrics-exporter', version: '1.0.0' },
  hooks: {
    async onMetricsUpdate(metrics) {
      // Export to external service
      await prometheus.push(metrics);
    },
    async onAlert(alert) {
      // Send critical alerts to PagerDuty
      if (alert.severity === 'critical') {
        await pagerduty.trigger(alert);
      }
    },
  },
};
```

## Plugin API

Expose custom functionality:

```typescript
const analyticsPlugin: Plugin = {
  metadata: { name: 'analytics', version: '1.0.0' },
  hooks: {},
  api: {
    track(event: string, data: unknown) {
      // Track custom events
      console.log('Track:', event, data);
    },
    getReport(period: string) {
      // Generate custom reports
      return { period, data: [] };
    },
  },
};

// Use plugin API
await plugins.callPluginAPI('analytics', 'track', 'genome_created', {
  genomeId: 'genome-123',
});

const report = await plugins.callPluginAPI('analytics', 'getReport', '30d');
```

## Plugin Dependencies

```typescript
const dependentPlugin: Plugin = {
  metadata: {
    name: 'advanced-analytics',
    version: '1.0.0',
    dependencies: ['analytics'], // Requires analytics plugin
  },
  hooks: {
    async onLoad() {
      // Use analytics plugin API
      const analytics = plugins.getPluginAPI('analytics');
      analytics.track('advanced_loaded', {});
    },
  },
};

// Register in correct order
await plugins.register(analyticsPlugin);
await plugins.register(dependentPlugin); // Will fail if analytics not loaded
```

## Hook Execution Order

Control the order hooks are executed:

```typescript
// Register plugins
await plugins.register(pluginA);
await plugins.register(pluginB);
await plugins.register(pluginC);

// Set execution order for beforeChat hook
plugins.setHookOrder('beforeChat', ['pluginA', 'pluginC', 'pluginB']);

// Now beforeChat will execute in order: A -> C -> B
```

## Enable/Disable Plugins

```typescript
// Disable plugin at runtime
await plugins.disable('my-plugin');

// Enable plugin
await plugins.enable('my-plugin');

// Register plugin as disabled
await plugins.register(myPlugin, { enabled: false });
```

## Plugin Configuration

```typescript
// Register with config
await plugins.register(myPlugin, {
  enabled: true,
  config: {
    apiKey: process.env.API_KEY,
    endpoint: 'https://api.example.com',
    retries: 3,
  },
});

// Get plugin config
const config = plugins.getConfig('my-plugin');

// Update config
plugins.updateConfig('my-plugin', {
  retries: 5,
});
```

## Plugin Discovery

```typescript
// List all plugins
const allPlugins = plugins.list();

console.log(allPlugins);
// [
//   {
//     name: 'analytics',
//     version: '1.0.0',
//     author: 'John Doe',
//     enabled: true,
//     loadedAt: Date,
//   },
//   ...
// ]

// Search by tag
const loggingPlugins = plugins.search('logging');

// Get metadata
const metadata = plugins.getMetadata('analytics');

// Get statistics
const stats = plugins.getStats();
// {
//   totalPlugins: 5,
//   enabledPlugins: 4,
//   disabledPlugins: 1,
//   pluginsByTag: { analytics: 2, logging: 3 }
// }
```

## Example Plugins

### Slack Notifications Plugin

```typescript
const slackPlugin: Plugin = {
  metadata: {
    name: 'slack-notifications',
    version: '1.0.0',
    description: 'Send notifications to Slack',
    tags: ['notifications', 'integrations'],
  },
  hooks: {
    async onAlert(alert) {
      if (alert.severity === 'high' || alert.severity === 'critical') {
        await fetch('https://hooks.slack.com/...', {
          method: 'POST',
          body: JSON.stringify({
            text: `🚨 ${alert.title}: ${alert.description}`,
          }),
        });
      }
    },
    async afterMutation(result) {
      await fetch('https://hooks.slack.com/...', {
        method: 'POST',
        body: JSON.stringify({
          text: `🧬 Genome evolved: ${result.gene} (fitness: ${result.fitness})`,
        }),
      });
    },
  },
};
```

### Analytics Plugin

```typescript
const analyticsPlugin: Plugin = {
  metadata: {
    name: 'google-analytics',
    version: '1.0.0',
    description: 'Track events in Google Analytics',
    tags: ['analytics', 'tracking'],
  },
  hooks: {
    async afterChat(response) {
      // Track chat completion
      await gtag('event', 'chat_completed', {
        genome_id: response.genomeId,
        duration: response.duration,
      });
    },
  },
  api: {
    trackCustomEvent(event: string, data: unknown) {
      gtag('event', event, data);
    },
  },
};
```

### Content Moderation Plugin

```typescript
const moderationPlugin: Plugin = {
  metadata: {
    name: 'content-moderator',
    version: '1.0.0',
    description: 'Moderate chat content',
    tags: ['moderation', 'safety'],
  },
  hooks: {
    async beforeChat(message) {
      // Check for inappropriate content
      const result = await moderateContent(message);

      if (!result.safe) {
        throw new Error('Message flagged by moderation');
      }

      return message;
    },
  },
};
```

### Cost Tracking Plugin

```typescript
const costPlugin: Plugin = {
  metadata: {
    name: 'cost-tracker',
    version: '1.0.0',
    description: 'Track and limit costs',
    tags: ['cost', 'budgets'],
  },
  hooks: {
    async beforeChat(message, context) {
      // Check budget
      const usage = await getCostUsage(context.userId);

      if (usage.monthlyCost > 1000) {
        throw new Error('Monthly budget exceeded');
      }

      return message;
    },
    async onMetricsUpdate(metrics) {
      // Check cost alerts
      if (metrics.cost.totalCost > 500) {
        await sendAlert({
          severity: 'high',
          message: 'Cost threshold exceeded',
        });
      }
    },
  },
};
```

### Logging Plugin

```typescript
const loggingPlugin: Plugin = {
  metadata: {
    name: 'structured-logger',
    version: '1.0.0',
    description: 'Structured logging for all operations',
    tags: ['logging', 'observability'],
  },
  hooks: {
    async beforeGenomeCreate(config) {
      logger.info('genome.create.start', { config });
      return config;
    },
    async afterGenomeCreate(genome) {
      logger.info('genome.create.complete', {
        genomeId: genome.id,
        name: genome.name,
      });
    },
    async beforeChat(message, context) {
      logger.info('chat.start', {
        genomeId: context.genomeId,
        userId: context.userId,
        messageLength: message.length,
      });
      return message;
    },
    async afterChat(response) {
      logger.info('chat.complete', {
        duration: response.duration,
        tokens: response.usage?.totalTokens,
      });
      return response;
    },
  },
};
```

## Integration with PGA

```typescript
import { PGA, PluginManager } from '@pga-ai/core';

const plugins = new PluginManager();

// Register plugins
await plugins.register(slackPlugin);
await plugins.register(analyticsPlugin);
await plugins.register(loggingPlugin);

const pga = new PGA({
  llmAdapter: new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  }),
  pluginManager: plugins, // Pass plugin manager
});

// Plugins will automatically hook into PGA operations
const genome = await pga.createGenome({ name: 'assistant' });
// beforeGenomeCreate and afterGenomeCreate hooks are called

const response = await genome.chat('Hello!', { userId: 'user-123' });
// beforeChat and afterChat hooks are called
```

## Best Practices

### 1. Error Handling

```typescript
const plugin: Plugin = {
  metadata: { name: 'safe-plugin', version: '1.0.0' },
  hooks: {
    async afterChat(response) {
      try {
        await riskyOperation();
      } catch (error) {
        console.error('Plugin error:', error);
        // Don't throw - let other plugins run
      }
      return response;
    },
  },
};
```

### 2. Configuration Validation

```typescript
const plugin: Plugin = {
  metadata: { name: 'validated-plugin', version: '1.0.0' },
  hooks: {
    async onLoad() {
      const config = plugins.getConfig('validated-plugin');

      if (!config.apiKey) {
        throw new Error('API key is required');
      }

      if (!config.endpoint) {
        throw new Error('Endpoint is required');
      }
    },
  },
};
```

### 3. Cleanup Resources

```typescript
const plugin: Plugin = {
  metadata: { name: 'resource-plugin', version: '1.0.0' },
  hooks: {
    async onLoad() {
      this.interval = setInterval(() => {
        // Periodic task
      }, 60000);
    },
    async onUnload() {
      // Clean up
      if (this.interval) {
        clearInterval(this.interval);
      }
    },
  },
};
```

### 4. Version Compatibility

```typescript
const plugin: Plugin = {
  metadata: {
    name: 'version-aware',
    version: '2.0.0',
  },
  hooks: {
    async onLoad() {
      // Check PGA version
      if (!isCompatibleVersion(PGA.VERSION, '>=0.1.0')) {
        throw new Error('Requires PGA >= 0.1.0');
      }
    },
  },
};
```

## Community Plugins

Create and share your plugins:

1. **Structure**: Follow the Plugin interface
2. **Documentation**: Include README and examples
3. **Testing**: Test with different PGA versions
4. **Publishing**: Publish to npm with `@pga-plugin/` prefix
5. **Tagging**: Use descriptive tags for discovery

Example package.json:

```json
{
  "name": "@pga-plugin/slack-notifications",
  "version": "1.0.0",
  "description": "Slack notifications for PGA",
  "main": "dist/index.js",
  "keywords": ["pga", "plugin", "slack", "notifications"],
  "peerDependencies": {
    "@pga-ai/core": "^0.1.0"
  }
}
```

## License

MIT

## Author

**Luis Alfredo Velasquez Duran** (Germany, 2025)
