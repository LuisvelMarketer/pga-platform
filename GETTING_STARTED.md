# 🚀 Getting Started with PGA Platform

Complete guide for installing and using PGA in your AI agents.

---

## ⚡ Quick Start (2 minutes - Ultra Simple!)

### Installation in 3 Lines

```typescript
import { GeneBank, InMemoryGeneStorage } from '@pga-ai/core';

// That's it! Gene Bank ready to use
const geneBank = new GeneBank(new InMemoryGeneStorage(), {
    tenantId: 'my-app',
    agentId: 'agent-001',
});

// Use it immediately
await geneBank.storeGene(myGene);
const results = await geneBank.searchGenes({ type: ['error-recovery'] });
```

**No configuration needed. No setup required. Just install and go!** 🚀

See [examples/quick-start.ts](./examples/quick-start.ts) for complete working example.

---

## 📋 Full Setup (5 minutes)

### 1. Install Dependencies

```bash
# Clone the repository (for local testing)
git clone https://github.com/pga-ai/pga-platform.git
cd pga-platform

# Install dependencies
npm install

# Build the core package
npm run build
```

### 2. Set Your API Key

```bash
# For Anthropic (Claude)
export ANTHROPIC_API_KEY='your-api-key-here'

# OR for OpenAI (GPT)
export OPENAI_API_KEY='your-api-key-here'
```

### 3. Run Your First Agent

```bash
# Run the getting started example
npx tsx examples/getting-started-agent.ts
```

**Expected Output:**
```
═══════════════════════════════════════════════════════
   PGA Platform - Getting Started Demo
═══════════════════════════════════════════════════════

🚀 Initializing PGA Agent...
✅ PGA Agent initialized successfully!

🧬 Seeding Gene Bank with sample genes...
✅ Stored 2 sample genes in Gene Bank

📊 Gene Bank Stats:
   Total Genes: 2
   Average Fitness: 0.89

✅ Demo completed successfully!
```

---

## 📦 Installation Methods

### Option A: Local Development (Before npm Publish)

**Use this for testing the latest code:**

```typescript
import {
    PGA,
    ClaudeAdapter,
    GeneBank,
    InMemoryGeneStorage,
} from './packages/core/src/index';
```

### Option B: npm Package (After Publish)

**Once published to npm:**

```bash
npm install @pga-ai/core
```

```typescript
import {
    PGA,
    ClaudeAdapter,
    GeneBank,
    InMemoryGeneStorage,
} from '@pga-ai/core';
```

---

## 💻 Basic Usage

### Minimal Setup (Gene Bank Only)

The simplest way to add PGA to your agent:

```typescript
import { GeneBank, InMemoryGeneStorage, createGeneId } from '@pga-ai/core';

// 1. Create Gene Bank (one line!)
const geneBank = new GeneBank(new InMemoryGeneStorage(), {
    tenantId: 'my-app',
    agentId: 'my-agent',
});

// 2. Store a gene
await geneBank.storeGene({
    id: createGeneId('my-app', 'pattern-001'),
    name: 'My First Pattern',
    type: 'reasoning-pattern',
    // ... other fields
});

// 3. Search genes
const genes = await geneBank.searchGenes({
    type: ['reasoning-pattern'],
    minFitness: 0.8,
});
```

**That's it!** Storage is included. No external dependencies needed.

---

### Full PGA Setup (Advanced)

For complete genomic evolution system with LLM integration:

```typescript
import {
    PGA,
    ClaudeAdapter,
    GeneBank,
    InMemoryGeneStorage,
} from '@pga-ai/core';

// 1. Create Gene Bank
const geneBank = new GeneBank(new InMemoryGeneStorage(), {
    tenantId: 'my-tenant',
    agentId: 'my-agent',
    enableTHK: true,
});

// 2. Initialize PGA with LLM
const pga = new PGA({
    llm: new ClaudeAdapter({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-sonnet-4-5',
    }),
    storage: yourStorageAdapter, // For genome storage
});

// 3. Create genome
const genome = await pga.createGenome({ name: 'assistant' });

// 4. Chat with agent
const response = await genome.chat('Hello!', { userId: 'user123' });
```

---

## 🧬 Working with Gene Bank

### Creating and Storing a Gene

```typescript
import { createGeneId, type CognitiveGene } from '@pga-ai/core';

// Create a gene that captures a behavioral pattern
const errorRecoveryGene: CognitiveGene = {
    id: createGeneId('my-tenant', 'error-recovery-pattern'),
    version: '1.0.0',
    name: 'Graceful Error Recovery',
    description: 'Pattern for handling errors gracefully with retry logic',
    type: 'error-recovery-pattern',
    domain: 'general',

    // Fitness metrics (how well this pattern performs)
    fitness: {
        overallFitness: 0.85,
        taskSuccessRate: 0.87,
        tokenEfficiency: 0.15,
        responseQuality: 0.88,
        adoptionCount: 0,
        adoptionPerformance: null,
    },

    // Lineage (evolutionary history)
    lineage: {
        parentGeneId: null,
        generation: 0,
        ancestors: [],
        mutationHistory: [],
    },

    // The actual behavioral instruction
    content: {
        instruction: `When encountering an error:
1. Log the error details clearly
2. Check if the error is recoverable
3. If recoverable, retry with exponential backoff (max 3 attempts)
4. If not recoverable, provide a clear error message to the user
5. Always maintain state consistency`,
        examples: [
            {
                scenario: 'API call fails with timeout',
                expectedBehavior: 'Retry up to 3 times with 1s, 2s, 4s delays',
            },
        ],
        requiredCapabilities: ['error-handling', 'state-management'],
        applicableContexts: ['api-calls', 'external-services'],
        contraindications: ['critical-operations'],
        metadata: {},
    },

    // Tenant info (for multi-tenancy)
    tenant: {
        tenantId: 'my-tenant',
        createdBy: 'my-agent',
        scope: 'tenant', // Share within tenant
        verified: false,
    },

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['error-handling', 'resilience'],
};

// Store in Gene Bank
await geneBank.storeGene(errorRecoveryGene);
console.log('✅ Gene stored successfully!');
```

### Searching for Genes

```typescript
// Search by type
const errorPatterns = await geneBank.searchGenes({
    type: ['error-recovery-pattern'],
    minFitness: 0.8,
    limit: 10,
});

console.log(`Found ${errorPatterns.length} error patterns`);

// Search by domain
const codingGenes = await geneBank.searchGenes({
    domain: ['coding'],
    sortBy: 'fitness',
    sortOrder: 'desc',
});

// Search by tags
const securityGenes = await geneBank.searchGenes({
    tags: ['security', 'validation'],
});
```

### Adopting a Gene

```typescript
// When your agent successfully uses a gene, record it
const geneId = errorPatterns[0].id;
const performanceScore = 0.88; // How well it performed (0-1)

await geneBank.recordAdoption(
    geneId,
    'my-agent-id',
    performanceScore
);

// The gene's fitness will be updated automatically
const updatedGene = await geneBank.getGene(geneId);
console.log(`Adoptions: ${updatedGene.fitness.adoptionCount}`);
console.log(`Avg Performance: ${updatedGene.fitness.adoptionPerformance}`);
```

### Gene Bank Statistics

```typescript
const stats = await geneBank.getStats();

console.log('📊 Gene Bank Stats:');
console.log(`  Total Genes: ${stats.totalGenes}`);
console.log(`  Average Fitness: ${stats.averageFitness.toFixed(2)}`);
console.log(`  Highest Fitness: ${stats.highestFitness.toFixed(2)}`);
console.log(`  Genes by Type:`, stats.genesByType);
console.log(`  Genes by Domain:`, stats.genesByDomain);
```

---

## 🎯 Multi-Model Support

PGA supports multiple LLM providers out of the box:

### Using Claude (Anthropic)

```typescript
import { ClaudeAdapter } from '@pga-ai/core';

const llm = new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-sonnet-4-5', // Options: claude-opus-4, claude-haiku-4
    temperature: 0.7,
    maxTokens: 4000,
});
```

### Using GPT (OpenAI)

```typescript
import { OpenAIAdapter } from '@pga-ai/core';

const llm = new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo', // Options: gpt-4, gpt-3.5-turbo
    temperature: 0.7,
    maxTokens: 4000,
});
```

### Creating a Custom Adapter

```typescript
import { LLMAdapter, CompletionParams, CompletionResult } from '@pga-ai/core';

class MyCustomAdapter implements LLMAdapter {
    async complete(params: CompletionParams): Promise<CompletionResult> {
        // Call your custom LLM API
        const response = await fetch('https://my-llm-api.com/complete', {
            method: 'POST',
            body: JSON.stringify({
                prompt: params.prompt,
                max_tokens: params.maxTokens,
            }),
        });

        const data = await response.json();

        return {
            content: data.text,
            usage: {
                promptTokens: data.usage.prompt,
                completionTokens: data.usage.completion,
                totalTokens: data.usage.total,
            },
        };
    }

    async chat(params: ChatParams): Promise<ChatResult> {
        // Implement chat endpoint
    }
}

const llm = new MyCustomAdapter();
```

---

## 🔍 Storage Options

### In-Memory Storage (Testing)

```typescript
import { InMemoryGeneStorage } from '@pga-ai/core';

const storage = new InMemoryGeneStorage();
// ✅ Fast, no setup required
// ❌ Data lost on restart
```

### PostgreSQL Storage (Production)

```typescript
import { PostgresGeneStorage } from '@pga-ai/core';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

const storage = new PostgresGeneStorage(pool);
// ✅ Persistent, scalable
// ✅ Full SQL query capabilities
// ❌ Requires database setup
```

See [PostgresGeneStorage.ts](./packages/core/src/gene-bank/adapters/PostgresGeneStorage.ts) for the SQL schema.

---

## 📊 Monitoring & Observability

Enable metrics collection to track your agent's performance:

```typescript
import { MetricsCollector } from '@pga-ai/core';

const metrics = new MetricsCollector({
    enabled: true,
    flushInterval: 60000, // Flush every minute
});

const pga = new PGA({
    llm,
    geneBank,
    agentId: 'my-agent',
    tenantId: 'my-tenant',
    metricsCollector: metrics,
});

// Later, view metrics
const stats = metrics.getStats();
console.log('Total requests:', stats.totalRequests);
console.log('Avg latency:', stats.avgLatency);
console.log('Total cost:', stats.totalCost);
```

---

## 🧪 Running Examples

The `examples/` directory contains complete working examples:

### 1. Getting Started (This Guide)
```bash
npx tsx examples/getting-started-agent.ts
```

### 2. Gene Bank Demo
```bash
npx tsx examples/gene-bank-demo.ts
```

### 3. Reasoning Engine
```bash
npx tsx examples/reasoning-demo.ts
```

### 4. RAG Integration
```bash
npx tsx examples/rag-demo.ts
```

### 5. Monitoring & Observability
```bash
npx tsx examples/monitoring-demo.ts
```

### 6. THK (Horizontal Knowledge Transfer)
```bash
npx tsx examples/thk-real-world-example.ts
```

---

## 🔑 API Keys

### Get Anthropic API Key

1. Visit: https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys
4. Create a new key
5. Set it:
   ```bash
   export ANTHROPIC_API_KEY='sk-ant-...'
   ```

### Get OpenAI API Key

1. Visit: https://platform.openai.com/api-keys
2. Sign up or log in
3. Create new secret key
4. Set it:
   ```bash
   export OPENAI_API_KEY='sk-...'
   ```

---

## 🐛 Troubleshooting

### Issue: "Module not found"

**Solution:** Make sure you've built the packages:
```bash
npm run build
```

### Issue: "API key not found"

**Solution:** Set your API key environment variable:
```bash
export ANTHROPIC_API_KEY='your-key-here'
```

### Issue: "Gene fitness below threshold"

**Solution:** Lower the fitness threshold in your Gene Bank config:
```typescript
const geneBank = new GeneBank(storage, {
    minFitnessThreshold: 0.6, // Lower from default 0.7
});
```

### Issue: "Cannot connect to database"

**Solution:** Check your PostgreSQL connection string:
```bash
export DATABASE_URL='postgresql://user:password@localhost:5432/dbname'
```

---

## 📚 Next Steps

1. **Explore Examples**
   - Check out all examples in `examples/` directory
   - Run each one to see different features

2. **Read the Documentation**
   - [Gene Bank Guide](./docs/GENE_BANK.md)
   - [API Reference](./docs/API.md)
   - [Architecture Overview](./docs/ARCHITECTURE.md)

3. **Build Your Agent**
   - Copy `getting-started-agent.ts`
   - Customize for your use case
   - Add your own genes!

4. **Join the Community**
   - Star the repo: https://github.com/pga-ai/pga-platform
   - Report issues
   - Contribute improvements

---

## 🤝 Need Help?

- **Documentation:** [README.md](./README.md)
- **Examples:** [examples/](./examples/)
- **Issues:** https://github.com/pga-ai/pga-platform/issues
- **Discussions:** GitHub Discussions (coming soon)

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Happy Evolving!** 🧬✨
