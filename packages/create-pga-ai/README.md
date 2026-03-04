# create-pga-ai

**The fastest way to start building with PGA Platform** — Create a complete PGA agent project with a single command.

```bash
npm create pga-ai@latest my-agent
```

That's it! 🎉

## What You Get

✨ **Interactive Setup** — Answer a few questions, get a fully configured project
🧬 **Evolution Boost 2.0** — 10x faster agent evolution built-in
🔌 **Multiple LLM Support** — Anthropic Claude, OpenAI GPT, or both
💾 **Production-Ready Storage** — PostgreSQL or in-memory for development
📦 **Zero Configuration** — Everything works out of the box
🚀 **Template System** — Pre-built agents for common use cases

## Quick Start

### 1. Create Your Project

```bash
npm create pga-ai@latest my-agent
cd my-agent
```

### 2. Configure API Keys

```bash
# Edit .env with your API keys
nano .env
```

### 3. Run Your Agent

```bash
npm run dev
```

That's it! Your agent is now running with PGA's self-evolution capabilities.

## Usage

### Interactive Mode (Recommended)

Simply run without arguments for an interactive setup:

```bash
npm create pga-ai@latest
```

You'll be asked:
- **Project name** — Your agent's folder name
- **LLM Provider** — Anthropic Claude (recommended), OpenAI GPT, or both
- **Storage** — PostgreSQL (production) or in-memory (development)
- **Evolution Boost** — Enable 10x faster evolution (recommended: Yes)
- **Template** — Choose a starter template

### Command-Line Mode

Skip the prompts with CLI flags:

```bash
npm create pga-ai@latest my-agent \
  --template chatbot \
  --llm anthropic \
  --storage postgres \
  --boost
```

### Available Options

| Option | Values | Description |
|--------|--------|-------------|
| `--template` | `chatbot`, `code-assistant`, `customer-support`, `data-analysis`, `custom` | Project template |
| `--llm` | `anthropic`, `openai`, `both` | LLM provider |
| `--storage` | `postgres`, `memory` | Storage backend |
| `--boost` | flag | Enable Evolution Boost 2.0 |
| `--skip-install` | flag | Skip npm install |

## Templates

### 🤖 Chatbot Agent
General-purpose conversational agent. Perfect for:
- Customer service bots
- Personal assistants
- Interactive Q&A systems

### 💻 Code Assistant
Programming helper with code understanding. Great for:
- Code review automation
- Documentation generation
- Developer productivity tools

### 🎧 Customer Support
Specialized support automation. Ideal for:
- Ticket triage
- FAQ automation
- Support escalation

### 📊 Data Analysis
Analytics and insights expert. Perfect for:
- Business intelligence
- Data visualization
- Report generation

### ⚙️ Custom
Blank starter for your own use case. Maximum flexibility.

## Project Structure

```
my-agent/
├── src/
│   ├── index.ts        # Main entry point
│   └── agent.ts        # Agent logic
├── .env                # API keys & configuration
├── .env.example        # Example environment file
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies & scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Evolution Boost 2.0

All projects include Evolution Boost 2.0 — the world's first genetic algorithm for prompt evolution.

**Regular Evolution:**
- 20-30 generations for 2x improvement
- Sequential mutations
- 8-15% improvement per generation

**Evolution Boost 2.0:**
- **2-3 generations for 2x improvement** (10x faster!)
- Parallel mutations (10 branches simultaneously)
- 40-80% improvement per generation
- Meta-learning system
- Pareto optimization

Enable it during setup or in your `.env`:
```bash
EVOLUTION_MODE=aggressive  # Options: conservative, balanced, aggressive
```

## What Gets Installed

Depending on your configuration, the installer adds:

**Core Package:**
- `@pga-ai/core` — Main PGA framework

**LLM Adapters:**
- `@pga-ai/adapters-llm-anthropic` — Claude integration
- `@pga-ai/adapters-llm-openai` — GPT integration

**Storage Adapters:**
- `@pga-ai/adapters-storage-postgres` — PostgreSQL storage

**Dev Dependencies:**
- `typescript` — TypeScript compiler
- `tsx` — TypeScript execution
- `vitest` — Testing framework
- `@types/node` — Node.js types

## Requirements

- **Node.js** — v18 or higher
- **npm** — v9 or higher
- **PostgreSQL** — (if using postgres storage)

## Examples

### Create a Chatbot with Claude

```bash
npm create pga-ai@latest my-chatbot \
  --template chatbot \
  --llm anthropic \
  --boost
```

### Create a Code Assistant with Both LLMs

```bash
npm create pga-ai@latest code-helper \
  --template code-assistant \
  --llm both \
  --storage postgres \
  --boost
```

### Create Custom Agent (Development)

```bash
npm create pga-ai@latest my-agent \
  --template custom \
  --llm openai \
  --storage memory
```

## Development Scripts

Generated projects include these npm scripts:

```bash
npm run dev      # Run with hot-reload (tsx)
npm run build    # Compile TypeScript
npm start        # Run compiled version
npm test         # Run tests
```

## Environment Variables

The installer creates a `.env` file with these variables:

```bash
# Anthropic API (if selected)
ANTHROPIC_API_KEY=your-api-key-here

# OpenAI API (if selected)
OPENAI_API_KEY=your-api-key-here

# PostgreSQL (if selected)
DATABASE_URL=postgresql://user:password@localhost:5432/pga_db

# Evolution Configuration
EVOLUTION_MODE=balanced  # conservative | balanced | aggressive
```

## Troubleshooting

### "Permission denied" error

Make sure you're using npm 7+ which supports `npm create`:
```bash
npm --version  # Should be 7.0.0 or higher
npm update -g npm
```

### "Module not found" errors

Ensure dependencies installed correctly:
```bash
cd my-agent
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors

Check your Node.js version:
```bash
node --version  # Should be v18 or higher
```

## Learn More

- **Documentation:** [https://pga.ai/docs](https://pga.ai/docs)
- **API Reference:** [https://pga.ai/api](https://pga.ai/api)
- **Discord Community:** [https://discord.gg/pga](https://discord.gg/pga)
- **GitHub:** [https://github.com/pga-platform](https://github.com/pga-platform)

## License

MIT © PGA Platform

---

**Built with PGA** 🧬 — The world's first genomic self-evolving AI system
