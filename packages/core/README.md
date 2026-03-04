# @pga-ai/core

> 🧬 **Genomic Self-Evolving Prompts** — Core Engine

[![npm version](https://img.shields.io/npm/v/@pga-ai/core)](https://www.npmjs.com/package/@pga-ai/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Created by Luis Alfredo Velasquez Duran | Germany, 2025**

---

## What is @pga-ai/core?

The core engine for PGA (Genomic Self-Evolving Prompts) — the world's first system that makes AI prompts **evolve automatically** like biological organisms.

Instead of manually tweaking prompts, PGA:
- ✅ Learns from every interaction
- ✅ Adapts to each user uniquely
- ✅ Improves continuously (autonomous)
- ✅ Never degrades (immune system)
- ✅ Tests changes before deployment (sandbox)

## Installation

```bash
npm install @pga-ai/core
```

You'll also need adapters for your LLM and database:

```bash
npm install @pga-ai/adapters-llm @pga-ai/adapters-storage
```

## Quick Start

```typescript
import { PGA } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm/anthropic';
import { PostgresAdapter } from '@pga-ai/adapters-storage/postgres';

// 1. Initialize PGA
const pga = new PGA({
  llm: new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_KEY,
  }),
  storage: new PostgresAdapter({
    connectionString: process.env.DATABASE_URL,
  }),
});

await pga.initialize();

// 2. Create genome
const genome = await pga.createGenome({
  name: 'my-assistant',
});

// 3. Use in your agent loop
async function chat(userId: string, message: string) {
  const response = await genome.chat(message, { userId });
  return response;
}

// 4. PGA learns automatically from interactions
await genome.recordInteraction({
  userId: 'user123',
  userMessage: 'Hello!',
  assistantResponse: 'Hi there!',
  toolCalls: [],
  score: 0.9,
  timestamp: new Date(),
});
```

That's it! Your agent now evolves automatically.

## Core Concepts

### Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│  Layer 0: Immutable DNA                 │
│  Security, Ethics, Core Identity        │
│  🚫 NEVER mutates                       │
├─────────────────────────────────────────┤
│  Layer 1: Operative Genes               │
│  Tool Usage, Coding Patterns            │
│  🐢 SLOW mutation (high validation)    │
├─────────────────────────────────────────┤
│  Layer 2: Epigenomes                    │
│  User Preferences, Communication Style  │
│  ⚡ FAST mutation (daily adaptation)    │
└─────────────────────────────────────────┘
```

### User DNA Profiling

Each user gets a unique cognitive profile:

```typescript
const dna = await genome.getDNA('user123');

console.log(dna.traits);
// {
//   communicationStyle: 'technical',
//   verbosity: 'terse',
//   preferredTools: ['browser', 'code'],
//   domainExpertise: { 'coding': 0.9 }
// }
```

### Automatic Evolution

PGA evolves through a 4-phase cycle:

1. **Transcription**: Log every interaction
2. **Variation**: Generate mutations
3. **Simulation**: Test in sandbox
4. **Selection**: Deploy only improvements

## API Reference

### PGA Class

#### `new PGA(config)`

Create PGA instance.

```typescript
const pga = new PGA({
  llm: new ClaudeAdapter({ apiKey: '...' }),
  storage: new PostgresAdapter({ connectionString: '...' }),
  config: {
    enableSandbox: true,      // Test mutations before deploy
    mutationRate: 'balanced',  // 'slow' | 'balanced' | 'aggressive'
  },
});
```

#### `pga.initialize()`

Initialize storage (create tables, etc.).

```typescript
await pga.initialize();
```

#### `pga.createGenome(options)`

Create new genome.

```typescript
const genome = await pga.createGenome({
  name: 'my-assistant',
  config: {
    enableSandbox: true,
    mutationRate: 'balanced',
  },
});
```

### GenomeInstance Class

#### `genome.assemblePrompt(context)`

Get optimized prompt for current context.

```typescript
const prompt = await genome.assemblePrompt({
  userId: 'user123',
  taskType: 'coding',
});
```

#### `genome.chat(message, context)`

Chat with PGA optimization.

```typescript
const response = await genome.chat('Hello!', {
  userId: 'user123',
});
```

#### `genome.recordInteraction(interaction)`

Record interaction (enables learning).

```typescript
await genome.recordInteraction({
  userId: 'user123',
  userMessage: 'Fix this bug',
  assistantResponse: 'Bug fixed!',
  toolCalls: [],
  score: 0.95,
  timestamp: new Date(),
});
```

#### `genome.getDNA(userId)`

Get user's DNA profile.

```typescript
const dna = await genome.getDNA('user123');
```

#### `genome.recordFeedback(userId, gene, sentiment)`

Record user feedback.

```typescript
await genome.recordFeedback('user123', 'communication-style', 'positive');
```

## Adapters

### LLM Adapters

Implement `LLMAdapter` interface:

```typescript
import type { LLMAdapter } from '@pga-ai/core';

export class MyLLMAdapter implements LLMAdapter {
  readonly name = 'my-llm';
  readonly model = 'my-model-v1';

  async chat(messages, options) {
    // Your implementation
  }
}
```

Available adapters:
- `@pga-ai/adapters-llm/anthropic` - Claude
- `@pga-ai/adapters-llm/openai` - GPT
- `@pga-ai/adapters-llm/google` - Gemini
- `@pga-ai/adapters-llm/local` - Ollama

### Storage Adapters

Implement `StorageAdapter` interface:

```typescript
import type { StorageAdapter } from '@pga-ai/core';

export class MyStorageAdapter implements StorageAdapter {
  async initialize() { /* ... */ }
  async saveGenome(genome) { /* ... */ }
  async loadGenome(id) { /* ... */ }
  // ... other methods
}
```

Available adapters:
- `@pga-ai/adapters-storage/postgres`
- `@pga-ai/adapters-storage/mongodb`
- `@pga-ai/adapters-storage/redis`
- `@pga-ai/adapters-storage/sqlite`

## Examples

See [/examples](../../examples) directory for:
- Basic usage
- LangChain integration
- Custom agents
- Next.js app

## License

MIT © Luis Alfredo Velasquez Duran

---

**Created with 🧬 by [Luis Alfredo Velasquez Duran](https://pga.ai)**
