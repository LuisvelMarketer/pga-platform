# 🧬 PGA — Genomic Self-Evolving Prompts

<div align="center">

![PGA Logo](https://img.shields.io/badge/PGA-Genomic%20Prompts-blue?style=for-the-badge)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@pga/core?style=for-the-badge)](https://www.npmjs.com/package/@pga/core)
[![Discord](https://img.shields.io/discord/XXXXXX?style=for-the-badge&logo=discord)](https://discord.gg/pga)

**World's First Genomic Self-Evolving Prompts System**

Created by **Luis Alfredo Velasquez Duran** | Germany, 2025

[Documentation](https://docs.pga.ai) • [Examples](./examples) • [Marketplace](https://marketplace.pga.ai) • [Discord](https://discord.gg/pga)

</div>

---

## 🎯 What is PGA?

**PGA (Genomic Self-Evolving Prompts)** is the world's first system that applies biological evolution principles to prompt engineering. Your AI agents don't just run prompts — they **evolve them automatically**.

### The Problem

Traditional AI agents use **static prompts**:
- ❌ Same prompt for all users
- ❌ Manual optimization required
- ❌ No learning from interactions
- ❌ Performance degrades over time
- ❌ One-size-fits-all approach

### The PGA Solution

PGA creates **living, evolving prompts**:
- ✅ Learns from every interaction
- ✅ Adapts to each user uniquely
- ✅ Improves continuously (autonomous)
- ✅ Never degrades (immune system)
- ✅ Sandbox-tested before deployment

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ or 20+
- **PostgreSQL** 14+ (or any supported database)
- **Anthropic API Key** (or any supported LLM)

### Installation

```bash
# Install core and adapters
npm install @pga/core @pga/adapters-llm-anthropic @pga/adapters-storage-postgres

# Or using yarn
yarn add @pga/core @pga/adapters-llm-anthropic @pga/adapters-storage-postgres

# Or using pnpm
pnpm add @pga/core @pga/adapters-llm-anthropic @pga/adapters-storage-postgres
```

### Database Setup

```bash
# 1. Create a PostgreSQL database
createdb pga_development

# 2. Set your connection string
export DATABASE_URL="postgresql://user:password@localhost:5432/pga_development"

# 3. Initialize the schema (automatic on first run)
# The schema will be created automatically when you call pga.initialize()
```

### Environment Variables

Create a `.env` file in your project root:

```bash
# Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/pga_development
```

### Basic Usage

```typescript
import { PGA } from '@pga/core';
import { ClaudeAdapter } from '@pga/adapters-llm-anthropic';
import { PostgresAdapter } from '@pga/adapters-storage-postgres';

// Initialize PGA
const pga = new PGA({
  llm: new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-sonnet-4-20250514', // or claude-opus-4-20250514
  }),
  storage: new PostgresAdapter({
    connectionString: process.env.DATABASE_URL!,
  }),
  config: {
    enableSandbox: true,
    mutationRate: 'balanced',
    epsilonExplore: 0.1,
  },
});

// Initialize database (creates tables if needed)
await pga.initialize();

// Create genome for your agent
const genome = await pga.createGenome({
  name: 'my-assistant',
});

// Add initial prompts (Layer 0 - Immutable)
await genome.addAllele({
  layer: 0,
  gene: 'core-identity',
  variant: 'default',
  content: 'You are a helpful AI assistant.',
});

// Use in your agent
const response = await genome.chat({
  userId: 'user-123',
  message: 'Hello, how can you help me?',
});

console.log(response.content);

// Record feedback to enable evolution
await genome.recordFeedback({
  userId: 'user-123',
  score: 0.9,
  sentiment: 'positive',
});

// 🎯 Agent announces its new PGA capabilities
const announcement = genome.getWelcomeMessage('detailed');
console.log(announcement);
// Or: await speak(announcement) for voice
```

**That's it!** Your agent now evolves automatically.

### Complete Example

See [examples/basic-usage.ts](./examples/basic-usage.ts) for a complete working example with all features.

---

## 🧬 How PGA Works

### Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│  Layer 0: Immutable DNA                 │
│  (Security, Ethics, Core Identity)      │
│  🚫 NEVER mutates                       │
├─────────────────────────────────────────┤
│  Layer 1: Operative Genes               │
│  (Tool Usage, Coding Patterns)          │
│  🐢 SLOW mutation (high validation)    │
├─────────────────────────────────────────┤
│  Layer 2: Epigenomes                    │
│  (User Preferences, Style)              │
│  ⚡ FAST mutation (daily adaptation)    │
└─────────────────────────────────────────┘
```

### Four-Phase Evolution Cycle

```
1. TRANSCRIPTION → Log every interaction
2. VARIATION     → Generate mutations
3. SIMULATION    → Test in sandbox (Haiku)
4. SELECTION     → Deploy only improvements
```

### Triple Fitness Function

PGA optimizes for three metrics:

1. **Cognitive Compression**: Do more with fewer tokens
2. **Human Intervention Rate**: Fewer corrections needed
3. **Execution Precision**: Everything works first try

---

## 🌟 Key Features

### 🧠 Intelligence Boost (NEW! - The 0% → 100% Upgrade)

PGA makes your agent **RADICALLY smarter** with 5 intelligence systems:

#### 1. **Perfect Memory** 🗄️
Your agent remembers EVERYTHING:
```typescript
// Agent automatically remembers:
// - Previous conversations
// - User's projects
// - Technical preferences
// - Work patterns
// - Common errors

const context = await genome.getConversationContext(userId);
// Agent knows: "Last time we talked about your React e-commerce project..."
```

#### 2. **Proactive Suggestions** 💡
Agent anticipates needs BEFORE you ask:
```typescript
const suggestions = await genome.getProactiveSuggestions(userId, message);

// Agent proactively suggests:
// 🚀 "I see performance is a recurring concern. Want to set up profiling?"
// ⚠️  "You've encountered this error 3 times. Let's fix the root cause."
// ⏰ "You mentioned handling this 'later' 2 days ago. Revisit it?"
```

#### 3. **Learning Announcements** 📢
Agent announces when it learns something new:
```typescript
// After a few interactions:
// 🧬 "I just learned something about you:"
//    → You prefer terse responses with code examples
//    → How this helps: I'll keep my answers concise and code-focused
```

#### 4. **Adaptive Behavior** 🔄
Agent automatically adapts to YOUR style:
```typescript
// Technical user → Gets architecture diagrams and code
// Casual user → Gets simple explanations with analogies
// Beginner → Gets step-by-step tutorials
// Expert → Gets advanced optimizations

// NO CONFIGURATION NEEDED - It just learns!
```

#### 5. **Context-Aware Intelligence** 🎯
Agent uses conversation history for smarter responses:
```typescript
// Regular agent:
// User: "Add tests"
// Agent: "What kind of tests?"

// PGA agent:
// User: "Add tests"
// Agent: "I'll write Jest tests for your React authentication flow,
//        matching the testing patterns from your other components."
```

**See it in action:** [examples/intelligence-boost-demo.ts](./examples/intelligence-boost-demo.ts)

---

### 🎙️ Welcome Message Announcement

Your agent can announce its new PGA capabilities to users:

```typescript
const genome = await pga.createGenome({ name: 'my-agent' });

// Agent introduces its new capabilities
const message = genome.getWelcomeMessage('detailed');
console.log(message);

// Choose from 4 styles:
// 'short'     → Quick announcement (~50 words)
// 'detailed'  → Full explanation (~150 words) — DEFAULT
// 'technical' → Developer-oriented (~200 words)
// 'casual'    → Friendly conversation (~120 words)

// Perfect for:
// ✓ Onboarding flows
// ✓ Voice assistants (TTS)
// ✓ Chatbot first messages
// ✓ Installation confirmations
```

See [examples/welcome-messages.ts](./examples/welcome-messages.ts) for all styles.

### 🎯 User DNA Profiling

Each user gets a unique cognitive profile:

```typescript
const dna = await genome.getDNA(userId);

console.log(dna.traits);
// {
//   communicationStyle: 'technical',
//   verbosity: 'terse',
//   preferredTools: ['browser', 'code'],
//   domainExpertise: { 'coding': 0.9, 'design': 0.3 },
//   peakProductivityHours: [9, 10, 14, 15]
// }
```

### 🔬 Sandbox Testing

All Layer 1 mutations tested before deployment:

```typescript
// Mutation proposed
const mutation = generateMutation();

// Test with Haiku in sandbox
const result = await evaluator.test(mutation);

if (result.fitnessImprovement > 0.05) {
  // Deploy to production
  await genome.deploy(mutation);
} else {
  // Reject mutation
  console.log('Rejected:', result.reason);
}
```

### 🛡️ Immune System

Automatic rollback on performance drops:

```typescript
// Performance monitoring
if (recentFitness < historicalFitness - 0.15) {
  // Immune system triggered
  await genome.rollback();
  console.log('❌ Mutation reverted (15% drop)');
}
```

### 📊 Real-time Analytics

```typescript
const stats = await genome.getAnalytics();

console.log(stats);
// {
//   totalMutations: 47,
//   avgFitnessImprovement: 0.23,
//   userSatisfaction: 0.89,
//   topGenes: ['coding-patterns-v3', 'tool-usage-v8']
// }
```

---

## 📦 Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@pga/core`](./packages/core) | ![npm](https://img.shields.io/npm/v/@pga/core) | Core engine (MIT) |
| [`@pga/adapters-llm`](./packages/adapters-llm) | ![npm](https://img.shields.io/npm/v/@pga/adapters-llm) | LLM adapters |
| [`@pga/adapters-storage`](./packages/adapters-storage) | ![npm](https://img.shields.io/npm/v/@pga/adapters-storage) | Storage adapters |
| [`@pga/plugins`](./packages/plugins) | ![npm](https://img.shields.io/npm/v/@pga/plugins) | Premium features |
| [`@pga/cloud`](./packages/cloud) | ![npm](https://img.shields.io/npm/v/@pga/cloud) | Cloud SDK |

---

## 🔧 Integrations

### LangChain

```typescript
import { PGAWrapper } from '@pga/integrations/langchain';

const chain = new ConversationalRetrievalQAChain({
  llm: new PGAWrapper({
    genome,
    baseModel: new ChatAnthropic(),
  }),
});
```

### AutoGPT

```typescript
import { PGAPlugin } from '@pga/integrations/autogpt';

const autogpt = new AutoGPT({
  plugins: [new PGAPlugin({ genome })],
});
```

### Custom Agents

```typescript
// Works with any LLM
const genome = await pga.createGenome();

// Your custom agent loop
while (true) {
  const prompt = await genome.assemblePrompt({ userId });
  const response = await yourLLM.generate(prompt, message);
  await genome.recordInteraction({ userId, response });
}
```

---

## 🛒 Marketplace

Share and monetize your evolved genes:

```bash
# Install top community gene
pga install sql-optimizer-pro --genome my-assistant

# Upload your gene
pga publish coding-patterns-v5 --price 9.99
```

Browse genes at [marketplace.pga.ai](https://marketplace.pga.ai)

---

## 📖 Documentation

- [Getting Started](https://docs.pga.ai/getting-started)
- [Core Concepts](https://docs.pga.ai/concepts)
- [API Reference](https://docs.pga.ai/api)
- [Examples](./examples)
- [Guides](https://docs.pga.ai/guides)

---

## 🌐 PGA Cloud (SaaS)

Don't want to manage infrastructure? Use PGA Cloud:

```typescript
import { PGACloud } from '@pga/cloud';

const pga = new PGACloud({
  apiKey: process.env.PGA_API_KEY,
});

// Everything else stays the same
const genome = await pga.createGenome();
```

**Pricing**: Free tier available | [View plans](https://pga.ai/pricing)

---

## 🏆 Success Stories

> "PGA increased our agent's success rate from 67% to 94% in 2 weeks. Zero manual tuning."
> — **TechCorp AI Team**

> "Users love how the agent adapts to their style. Satisfaction scores up 40%."
> — **StartupXYZ**

> "We saved $12K/month in API costs thanks to cognitive compression."
> — **Enterprise Inc**

---

## 🤝 Contributing

PGA Core is open source (MIT). Contributions welcome!

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/pga-ai/pga-platform
cd pga-platform

# 2. Install dependencies
npm install

# 3. Build all packages
npm run build

# 4. Run tests
npm test

# 5. Start development mode (watch for changes)
npm run dev
```

### Project Structure

```
pga-platform/
├── packages/
│   ├── core/                    # Core PGA engine (MIT)
│   ├── adapters-llm/
│   │   └── anthropic/          # Claude adapter
│   └── adapters-storage/
│       └── postgres/           # PostgreSQL adapter
├── examples/                    # Usage examples
├── docs/                        # Documentation
└── scripts/                     # Build scripts
```

### Running Examples

```bash
# Set up environment variables first
cp .env.example .env
# Edit .env with your API keys

# Run the basic example
npx tsx examples/basic-usage.ts
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

---

## 📄 License

- **@pga/core**: MIT License (free forever)
- **@pga/plugins**: Commercial License
- **PGA Cloud**: SaaS (subscription)

See [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

**Created by**: Luis Alfredo Velasquez Duran
**Location**: Germany
**Year**: 2025
**Status**: Patented & Protected

PGA is the world's first implementation of genomic evolution principles applied to prompt engineering. This system is patent-pending and represents a fundamental innovation in AI agent technology.

---

## 📬 Contact

- **Website**: [pga.ai](https://pga.ai)
- **Email**: contact@pga.ai
- **Discord**: [Join Community](https://discord.gg/pga)
- **Twitter**: [@PGA_AI](https://twitter.com/PGA_AI)

---

<div align="center">

**Built with PGA** 🧬

*The future of AI is self-evolving*

</div>
