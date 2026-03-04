/**
 * PGA CLI - Init Command
 *
 * @author Luis Alfredo Velasquez Duran (Germany, 2025)
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import boxen from 'boxen';

interface InitOptions {
    template?: string;
    dir?: string;
}

export async function init(options: InitOptions): Promise<void> {
    console.log(chalk.bold('\n🚀 Initialize PGA Project\n'));

    // Prompt for template if not provided
    let template = options.template || 'basic';

    if (!options.template) {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'template',
                message: 'Choose a project template:',
                choices: [
                    {
                        name: '📦 Basic - Simple PGA setup',
                        value: 'basic',
                    },
                    {
                        name: '🔧 Advanced - With monitoring and multi-model',
                        value: 'advanced',
                    },
                    {
                        name: '🏢 Enterprise - Production-ready with all features',
                        value: 'enterprise',
                    },
                ],
                default: 'basic',
            },
        ]);

        template = answers.template;
    }

    const spinner = ora('Initializing PGA project...').start();

    try {
        const projectDir = path.resolve(options.dir || '.');

        // Create project structure
        await createProjectStructure(projectDir, template);

        spinner.succeed(chalk.green('Project initialized successfully!'));

        // Display next steps
        displayNextSteps(projectDir, template);
    } catch (error) {
        spinner.fail(chalk.red('Failed to initialize project'));
        console.error(error);
        process.exit(1);
    }
}

async function createProjectStructure(
    projectDir: string,
    template: string
): Promise<void> {
    // Create directories
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'genomes'), { recursive: true });

    // Create package.json
    const packageJson: {
        name: string;
        version: string;
        type: string;
        description: string;
        main: string;
        scripts: Record<string, string>;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
    } = {
        name: 'my-pga-project',
        version: '1.0.0',
        type: 'module',
        description: 'PGA-powered AI application',
        main: 'dist/index.js',
        scripts: {
            dev: 'tsx watch src/index.ts',
            build: 'tsc',
            start: 'node dist/index.js',
        },
        dependencies: {
            '@pga-ai/core': '^0.1.0',
            '@pga-ai/adapters-llm-anthropic': '^0.1.0',
        },
        devDependencies: {
            typescript: '^5.4.5',
            tsx: '^4.7.1',
            '@types/node': '^20.12.7',
        },
    };

    // Add dependencies based on template
    if (template === 'advanced' || template === 'enterprise') {
        packageJson.dependencies['@pga-ai/adapters-llm-openai'] = '^0.1.0';
    }

    if (template === 'enterprise') {
        packageJson.dependencies['@pga-ai/adapters-storage-postgres'] = '^0.1.0';
    }

    await fs.writeFile(
        path.join(projectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );

    // Create tsconfig.json
    const tsconfig = {
        compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'node',
            esModuleInterop: true,
            strict: true,
            skipLibCheck: true,
            outDir: './dist',
            rootDir: './src',
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
    };

    await fs.writeFile(
        path.join(projectDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
    );

    // Create .env.example
    const envExample = getEnvTemplate(template);
    await fs.writeFile(path.join(projectDir, '.env.example'), envExample);

    // Create .gitignore
    const gitignore = `
node_modules/
dist/
.env
*.log
.DS_Store
genomes/*.json
`.trim();

    await fs.writeFile(path.join(projectDir, '.gitignore'), gitignore);

    // Create main application file
    const mainFile = getMainTemplate(template);
    await fs.writeFile(path.join(projectDir, 'src', 'index.ts'), mainFile);

    // Create README.md
    const readme = getReadmeTemplate(template);
    await fs.writeFile(path.join(projectDir, 'README.md'), readme);
}

function getEnvTemplate(template: string): string {
    let env = '# PGA Configuration\n\n';
    env += '# Anthropic API Key\n';
    env += 'ANTHROPIC_API_KEY=your-api-key-here\n\n';

    if (template === 'advanced' || template === 'enterprise') {
        env += '# OpenAI API Key (optional)\n';
        env += 'OPENAI_API_KEY=your-openai-api-key\n\n';
    }

    if (template === 'enterprise') {
        env += '# PostgreSQL Connection\n';
        env += 'DATABASE_URL=postgresql://user:password@localhost:5432/pga\n\n';
    }

    return env;
}

function getMainTemplate(template: string): string {
    if (template === 'basic') {
        return `/**
 * Basic PGA Application
 */

import { PGA } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';

async function main() {
    // Initialize PGA
    const pga = new PGA({
        llmAdapter: new ClaudeAdapter({
            apiKey: process.env.ANTHROPIC_API_KEY!,
        }),
    });

    // Create a genome
    const genome = await pga.createGenome({
        name: 'my-assistant',
        config: {
            layer0: {
                systemPrompt: 'You are a helpful AI assistant.',
                constraints: ['Be concise', 'Be accurate'],
                capabilities: ['coding', 'analysis'],
            },
        },
    });

    console.log('Genome created:', genome.id);

    // Chat with the genome
    const response = await genome.chat('Hello! How can you help me?', {
        userId: 'user-123',
    });

    console.log('Response:', response.content);
}

main().catch(console.error);
`;
    }

    if (template === 'advanced') {
        return `/**
 * Advanced PGA Application
 * Includes monitoring and multi-model support
 */

import { PGA, MetricsCollector } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';
import { OpenAIAdapter } from '@pga-ai/adapters-llm-openai';

async function main() {
    // Initialize metrics collector
    const metrics = new MetricsCollector({
        alertThresholds: {
            maxCostPerHour: 50,
            maxErrorRate: 0.05,
            maxP95Latency: 3000,
        },
    });

    // Initialize PGA with Claude
    const pgaClaude = new PGA({
        llmAdapter: new ClaudeAdapter({
            apiKey: process.env.ANTHROPIC_API_KEY!,
            model: 'claude-sonnet-4.5',
        }),
    });

    // Initialize PGA with OpenAI (alternative)
    const pgaOpenAI = new PGA({
        llmAdapter: new OpenAIAdapter({
            apiKey: process.env.OPENAI_API_KEY!,
            model: 'gpt-4-turbo-preview',
        }),
    });

    // Create genome
    const genome = await pgaClaude.createGenome({
        name: 'monitored-assistant',
        config: {
            layer0: {
                systemPrompt: 'You are an advanced AI assistant with self-evolving capabilities.',
                constraints: ['Be precise', 'Learn from interactions'],
                capabilities: ['coding', 'debugging', 'architecture'],
            },
        },
    });

    // Chat with metrics tracking
    const startTime = Date.now();

    try {
        const response = await genome.chat('Explain PGA architecture', {
            userId: 'user-123',
        });

        metrics.recordRequest({
            requestId: crypto.randomUUID(),
            duration: Date.now() - startTime,
            success: true,
            model: 'claude-sonnet-4.5',
            inputTokens: response.usage?.inputTokens || 0,
            outputTokens: response.usage?.outputTokens || 0,
        });

        console.log('Response:', response.content);
    } catch (error) {
        metrics.recordRequest({
            requestId: crypto.randomUUID(),
            duration: Date.now() - startTime,
            success: false,
            model: 'claude-sonnet-4.5',
            inputTokens: 0,
            outputTokens: 0,
            error: error.message,
        });

        throw error;
    }

    // Display metrics
    console.log('\\nMetrics:', metrics.getPerformanceMetrics());
    console.log('Costs:', metrics.getCostMetrics());
}

main().catch(console.error);
`;
    }

    // Enterprise template
    return `/**
 * Enterprise PGA Application
 * Production-ready with PostgreSQL, monitoring, and multi-model support
 */

import { PGA, MetricsCollector, Evaluator } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';
import { OpenAIAdapter } from '@pga-ai/adapters-llm-openai';
import { PostgresAdapter } from '@pga-ai/adapters-storage-postgres';

async function main() {
    // Initialize storage
    const storage = new PostgresAdapter({
        connectionString: process.env.DATABASE_URL!,
    });

    await storage.initialize();

    // Initialize metrics
    const metrics = new MetricsCollector({
        alertThresholds: {
            maxCostPerHour: 100,
            maxErrorRate: 0.05,
            maxP95Latency: 3000,
            maxMemoryUsageMB: 500,
        },
    });

    // Initialize PGA
    const pga = new PGA({
        llmAdapter: new ClaudeAdapter({
            apiKey: process.env.ANTHROPIC_API_KEY!,
            model: 'claude-sonnet-4.5',
        }),
        storageAdapter: storage,
    });

    // Create genome
    const genome = await pga.createGenome({
        name: 'enterprise-assistant',
        config: {
            layer0: {
                systemPrompt: 'You are an enterprise-grade AI assistant with genomic evolution.',
                constraints: ['Security-first', 'Audit all operations', 'Performance optimized'],
                capabilities: ['enterprise-coding', 'architecture', 'security-analysis'],
            },
        },
    });

    // Run evaluation
    const evaluator = new Evaluator(pga, metrics);
    const benchmark = await evaluator.evaluate(genome, STANDARD_TASKS, 'admin');

    console.log('Benchmark Results:');
    console.log(\`Success Rate: \${(benchmark.successRate * 100).toFixed(1)}%\`);
    console.log(\`Avg Response Time: \${benchmark.avgResponseTime.toFixed(0)}ms\`);
    console.log(\`Total Cost: $\${benchmark.totalCost.toFixed(4)}\`);

    // Monitor health
    setInterval(() => {
        const health = metrics.getHealthStatus();
        const alerts = metrics.getAlerts();

        if (health.status !== 'healthy') {
            console.warn('Health degraded:', health);
        }

        if (alerts.length > 0) {
            console.warn('Active alerts:', alerts);
        }
    }, 60000); // Check every minute

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\\nShutting down...');
        await storage.close();
        process.exit(0);
    });
}

main().catch(console.error);
`;
}

function getReadmeTemplate(template: string): string {
    return `# My PGA Project

${template.charAt(0).toUpperCase() + template.slice(1)} PGA application with genomic self-evolving prompts.

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Copy \`.env.example\` to \`.env\` and fill in your API keys:
\`\`\`bash
cp .env.example .env
\`\`\`

3. Run the application:
\`\`\`bash
npm run dev
\`\`\`

## Project Structure

\`\`\`
my-pga-project/
├── src/
│   └── index.ts          # Main application
├── genomes/              # Genome exports
├── package.json
├── tsconfig.json
├── .env                  # Configuration (not committed)
└── .env.example          # Example configuration
\`\`\`

## Commands

- \`npm run dev\` - Run in development mode
- \`npm run build\` - Build for production
- \`npm start\` - Run production build

## Learn More

- [PGA Documentation](https://github.com/pga-ai/pga-platform)
- [API Reference](https://pga.ai/docs)
- [Examples](https://github.com/pga-ai/pga-platform/tree/main/examples)

## License

MIT
`;
}

function displayNextSteps(projectDir: string, template: string): void {
    const dirName = path.basename(projectDir);

    const message = `
${chalk.bold.green('✨ Project Created Successfully!')}

${chalk.bold('Next steps:')}

  ${chalk.cyan('1.')} ${chalk.gray('cd')} ${dirName}
  ${chalk.cyan('2.')} ${chalk.gray('npm install')}
  ${chalk.cyan('3.')} ${chalk.gray('cp .env.example .env')}
  ${chalk.cyan('4.')} ${chalk.gray('# Edit .env with your API keys')}
  ${chalk.cyan('5.')} ${chalk.gray('npm run dev')}

${chalk.bold('Template:')} ${template}
${chalk.bold('Location:')} ${projectDir}

${chalk.gray('Run')} ${chalk.cyan('pga --help')} ${chalk.gray('for more commands')}
    `.trim();

    console.log(
        boxen(message, {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan',
        })
    );
}
