# @pga-ai/cli

Interactive command-line interface for PGA (Genomic Self-Evolving Prompts).

## Installation

### Global Installation (Recommended)

```bash
npm install -g @pga-ai/cli
```

### Local Installation

```bash
npm install --save-dev @pga-ai/cli
```

## Quick Start

```bash
# Initialize a new PGA project
pga init

# Create a genome
pga create --name my-assistant

# Start an interactive chat session
pga chat

# Run benchmarks
pga benchmark <genome-id>

# View metrics
pga metrics

# Check system health
pga status
```

## Commands

### `pga init`

Initialize a new PGA project with templates.

```bash
pga init                      # Interactive template selection
pga init --template basic     # Basic template
pga init --template advanced  # Advanced with monitoring
pga init --template enterprise # Enterprise-ready
pga init --dir ./my-project   # Specify directory
```

**Templates:**
- **basic** - Simple PGA setup with Claude
- **advanced** - Multi-model support + monitoring
- **enterprise** - Production-ready with PostgreSQL

### `pga create`

Create a new genome.

```bash
pga create                              # Interactive mode
pga create --name my-assistant          # With name
pga create --model claude-sonnet-4.5    # Specify model
```

### `pga chat`

Start an interactive chat session.

```bash
pga chat                    # Select genome interactively
pga chat <genome-id>        # Chat with specific genome
pga chat --user john-doe    # Specify user ID
```

**Chat Commands:**
- Type your message and press Enter
- `exit` or `quit` to end session

### `pga list`

List all genomes.

```bash
pga list                    # Table format
pga list --format json      # JSON output
pga list --sort fitness     # Sort by field
```

### `pga evolve`

Manually trigger genome evolution.

```bash
pga evolve <genome-id>              # Auto-select layer
pga evolve <genome-id> --layer 2    # Specific layer
pga evolve <genome-id> --gene response_style  # Specific gene
```

### `pga benchmark`

Run evaluation benchmarks.

```bash
pga benchmark                       # Interactive genome selection
pga benchmark <genome-id>           # Benchmark specific genome
pga benchmark --tasks debug-1,impl-1  # Specific tasks
pga benchmark --compare <genome-id>   # Compare two genomes
```

### `pga metrics`

View performance and cost metrics.

```bash
pga metrics                    # Last 24 hours
pga metrics --period 1h        # Last hour
pga metrics --period 7d        # Last 7 days
pga metrics --export metrics.json  # Export to file
```

### `pga status`

Show system health status.

```bash
pga status              # Current status
pga status --watch      # Watch mode (updates every 5s)
```

### `pga config`

Configure PGA settings.

```bash
pga config --list                           # List all settings
pga config --get api_key                    # Get specific value
pga config --set model=claude-sonnet-4.5    # Set value
```

### `pga export`

Export genome or data.

```bash
pga export <genome-id>                  # Default JSON
pga export <genome-id> -o backup.json   # Specify output
pga export <genome-id> --format yaml    # YAML format
```

### `pga import`

Import genome from file.

```bash
pga import backup.json                  # Import genome
pga import backup.json --name restored  # With custom name
```

### `pga doctor`

Run diagnostics and check for issues.

```bash
pga doctor          # Run all checks
pga doctor --fix    # Attempt to fix issues
```

**Checks:**
- Node.js version (requires 20+)
- TypeScript installation
- PGA core package
- Environment variables

## Project Templates

### Basic Template

Simple PGA setup for getting started quickly.

**Includes:**
- TypeScript configuration
- Claude adapter
- Basic genome configuration
- Example chat implementation

```typescript
import { PGA } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';

const pga = new PGA({
  llmAdapter: new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  }),
});
```

### Advanced Template

Multi-model support with monitoring.

**Includes:**
- Claude + OpenAI adapters
- MetricsCollector integration
- Performance tracking
- Cost monitoring
- Alert configuration

```typescript
import { PGA, MetricsCollector } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';
import { OpenAIAdapter } from '@pga-ai/adapters-llm-openai';

const metrics = new MetricsCollector({
  alertThresholds: {
    maxCostPerHour: 50,
    maxErrorRate: 0.05,
  },
});
```

### Enterprise Template

Production-ready with all features.

**Includes:**
- PostgreSQL storage adapter
- Comprehensive monitoring
- Evaluation framework
- Health monitoring
- Audit logging
- Graceful shutdown handling

```typescript
import { PGA, MetricsCollector, Evaluator } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';
import { PostgresAdapter } from '@pga-ai/adapters-storage-postgres';

const storage = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL!,
});

const pga = new PGA({
  llmAdapter: new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  }),
  storageAdapter: storage,
});
```

## Configuration

The CLI uses environment variables for configuration:

```bash
# Required
ANTHROPIC_API_KEY=your-api-key

# Optional
OPENAI_API_KEY=your-openai-key
DATABASE_URL=postgresql://localhost/pga
PGA_CONFIG_DIR=~/.pga
```

## Examples

### Initialize and Run a Project

```bash
# 1. Create new project
pga init --template advanced

# 2. Navigate to project
cd my-pga-project

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 5. Run the application
npm run dev
```

### Create and Test a Genome

```bash
# Create genome
pga create --name coding-assistant

# Run benchmark
pga benchmark <genome-id>

# Chat with genome
pga chat <genome-id>
```

### Monitor Production System

```bash
# Check system status
pga status --watch

# View metrics
pga metrics --period 24h

# Export metrics for analysis
pga metrics --export daily-metrics.json
```

### Genome Backup and Restore

```bash
# Export genome
pga export genome-123 -o backup.json

# Import genome
pga import backup.json --name restored-genome
```

## Global Options

Available for all commands:

```bash
-v, --verbose     # Enable verbose output
--no-color        # Disable colored output
--help            # Show help for command
--version         # Show CLI version
```

## Best Practices

### 1. Use Templates

Start with a template that matches your use case:
- **Prototyping** → Basic
- **Development** → Advanced
- **Production** → Enterprise

### 2. Version Control

Always commit your `package.json` and `tsconfig.json`:

```bash
git add package.json tsconfig.json src/
git commit -m "Initialize PGA project"
```

### 3. Environment Variables

Never commit `.env` files:

```bash
# In .gitignore
.env
*.env.local
```

### 4. Regular Backups

Export genomes regularly:

```bash
pga export <genome-id> -o backups/genome-$(date +%Y%m%d).json
```

### 5. Monitoring

Use `doctor` command to check for issues:

```bash
pga doctor
```

## Troubleshooting

### Command Not Found

```bash
# Ensure global installation
npm install -g @pga-ai/cli

# Or use npx
npx @pga-ai/cli init
```

### Permission Errors

```bash
# macOS/Linux
sudo npm install -g @pga-ai/cli

# Or use user directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### TypeScript Errors

```bash
# Install TypeScript globally
npm install -g typescript

# Or locally
npm install --save-dev typescript
```

## Development

To contribute to the CLI:

```bash
# Clone repository
git clone https://github.com/pga-ai/pga-platform

# Navigate to CLI package
cd packages/cli

# Install dependencies
npm install

# Build
npm run build

# Test locally
npm link
pga --help
```

## License

MIT

## Author

**Luis Alfredo Velasquez Duran** (Germany, 2025)

## Links

- [PGA Core](../../core/README.md)
- [Documentation](https://pga.ai/docs)
- [GitHub](https://github.com/pga-ai/pga-platform)
