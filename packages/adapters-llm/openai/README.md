# @pga-ai/adapters-llm-openai

OpenAI adapter for PGA (Genomic Self-Evolving Prompts).

## Supported Models

- **GPT-4 Turbo** (`gpt-4-turbo-preview`)
- **GPT-4** (`gpt-4`)
- **GPT-3.5 Turbo** (`gpt-3.5-turbo`)

## Features

- ✅ Full LLMAdapter interface implementation
- ✅ Streaming responses support
- ✅ Token usage tracking
- ✅ Configurable temperature and top_p
- ✅ Support for custom base URLs (proxies, Azure)
- ✅ Organization ID support

## Installation

```bash
npm install @pga-ai/adapters-llm-openai
```

## Usage

### Basic Usage

```typescript
import { OpenAIAdapter } from '@pga-ai/adapters-llm-openai';

const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
});

// Chat
const response = await adapter.chat([
  { role: 'user', content: 'Hello, GPT-4!' }
]);

console.log(response.content);
```

### Streaming Responses

```typescript
const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4',
});

for await (const chunk of adapter.chatStream([
  { role: 'user', content: 'Tell me a story' }
])) {
  process.stdout.write(chunk.content);
}
```

### With PGA Genome

```typescript
import { PGA } from '@pga-ai/core';
import { OpenAIAdapter } from '@pga-ai/adapters-llm-openai';
import { PostgresAdapter } from '@pga-ai/adapters-storage-postgres';

const pga = new PGA({
  llmAdapter: new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
  }),
  storageAdapter: new PostgresAdapter({
    connectionString: process.env.DATABASE_URL!,
  }),
});

const genome = await pga.createGenome({
  layer0: {
    systemPrompt: 'You are a helpful AI assistant.',
    constraints: ['Be concise', 'Use examples'],
    capabilities: ['coding', 'debugging'],
  },
});

const response = await genome.chat('Help me debug this code', {
  userId: 'user-123',
});
```

## Configuration

```typescript
interface OpenAIAdapterConfig {
  /** OpenAI API Key (required) */
  apiKey: string;

  /** Model to use (default: 'gpt-4-turbo-preview') */
  model?: string;

  /** Organization ID (optional) */
  organization?: string;

  /** Base URL for proxies or Azure (optional) */
  baseURL?: string;

  /** Temperature 0-2 (default: 1.0) */
  temperature?: number;

  /** Top P 0-1 (default: 1.0) */
  topP?: number;
}
```

## Available Models

| Model | ID | Context | Best For |
|-------|-----|---------|----------|
| **GPT-4 Turbo** | `gpt-4-turbo-preview` | 128K | Complex tasks, latest features |
| **GPT-4** | `gpt-4` | 8K | High-quality responses |
| **GPT-3.5 Turbo** | `gpt-3.5-turbo` | 16K | Fast, cost-effective |

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
OPENAI_ORGANIZATION=org-...
OPENAI_BASE_URL=https://api.openai.com/v1
```

## Error Handling

```typescript
try {
  const response = await adapter.chat(messages);
} catch (error) {
  if (error.status === 401) {
    console.error('Invalid API key');
  } else if (error.status === 429) {
    console.error('Rate limit exceeded');
  } else if (error.status === 500) {
    console.error('OpenAI server error');
  }
}
```

## Token Usage

```typescript
const response = await adapter.chat(messages);

console.log('Usage:', {
  prompt: response.usage.promptTokens,
  completion: response.usage.completionTokens,
  total: response.usage.totalTokens,
});
```

## Advanced Configuration

### Custom Base URL (Azure OpenAI)

```typescript
const adapter = new OpenAIAdapter({
  apiKey: process.env.AZURE_OPENAI_KEY!,
  baseURL: 'https://your-resource.openai.azure.com',
  model: 'gpt-4',
});
```

### Per-Request Options

```typescript
const response = await adapter.chat(messages, {
  temperature: 0.5,
  topP: 0.9,
  maxTokens: 2000,
});
```

## Comparison with Claude

| Feature | OpenAI (GPT-4) | Claude (Opus/Sonnet) |
|---------|----------------|----------------------|
| Context Window | 128K (Turbo) | 200K |
| Streaming | ✅ | ✅ |
| Function Calling | ✅ | ✅ (Tool Use) |
| Vision | ✅ | ✅ |
| Speed | Fast | Very Fast (Sonnet) |
| Cost | Medium | Varies |

## License

MIT

## Author

**Luis Alfredo Velasquez Duran** (Germany, 2025)

## Links

- [PGA Core Documentation](../../core/README.md)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GitHub Repository](https://github.com/LuisvelMarketer/pga-platform)
