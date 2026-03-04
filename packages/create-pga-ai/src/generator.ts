/**
 * Project generator
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import type { ProjectConfig } from './prompts.js';

export async function generateProject(
    projectName: string,
    config: ProjectConfig
): Promise<void> {
    const spinner = ora('Creating project structure...').start();

    try {
        const projectPath = path.join(process.cwd(), projectName);

        // Create project directory
        await fs.ensureDir(projectPath);

        // Generate files
        await generatePackageJson(projectPath, projectName, config);
        await generateTsConfig(projectPath);
        await generateEnvFile(projectPath, config);
        await generateEnvExample(projectPath, config);
        await generateGitignore(projectPath);
        await generateReadme(projectPath, projectName, config);
        await generateSourceFiles(projectPath, config);

        spinner.succeed(chalk.green('Project structure created!'));
    } catch (error) {
        spinner.fail(chalk.red('Failed to create project'));
        throw error;
    }
}

async function generatePackageJson(
    projectPath: string,
    projectName: string,
    config: ProjectConfig
) {
    const packageJson = {
        name: projectName,
        version: '0.1.0',
        type: 'module',
        scripts: {
            dev: 'tsx src/index.ts',
            build: 'tsc',
            start: 'node dist/index.js',
            test: 'vitest',
        },
        dependencies: {},
        devDependencies: {},
    };

    await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
}

async function generateTsConfig(projectPath: string) {
    const tsconfig = {
        compilerOptions: {
            target: 'ES2022',
            module: 'ES2022',
            lib: ['ES2022'],
            moduleResolution: 'node',
            rootDir: './src',
            outDir: './dist',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
    };

    await fs.writeJson(path.join(projectPath, 'tsconfig.json'), tsconfig, { spaces: 2 });
}

async function generateEnvFile(projectPath: string, config: ProjectConfig) {
    let envContent = '# PGA Platform Configuration\n\n';

    if (config.llmProvider === 'anthropic' || config.llmProvider === 'both') {
        envContent += '# Anthropic API Key\nANTHROPIC_API_KEY=your-api-key-here\n\n';
    }

    if (config.llmProvider === 'openai' || config.llmProvider === 'both') {
        envContent += '# OpenAI API Key\nOPENAI_API_KEY=your-api-key-here\n\n';
    }

    if (config.storage === 'postgres') {
        envContent += '# PostgreSQL Connection\nDATABASE_URL=postgresql://user:password@localhost:5432/pga_db\n\n';
    }

    envContent += '# Evolution Configuration\nEVOLUTION_MODE=' + (config.evolutionBoost ? 'aggressive' : 'balanced') + '\n';

    await fs.writeFile(path.join(projectPath, '.env'), envContent);
}

async function generateEnvExample(projectPath: string, config: ProjectConfig) {
    let envContent = '# PGA Platform Configuration\n\n';

    if (config.llmProvider === 'anthropic' || config.llmProvider === 'both') {
        envContent += '# Anthropic API Key\nANTHROPIC_API_KEY=\n\n';
    }

    if (config.llmProvider === 'openai' || config.llmProvider === 'both') {
        envContent += '# OpenAI API Key\nOPENAI_API_KEY=\n\n';
    }

    if (config.storage === 'postgres') {
        envContent += '# PostgreSQL Connection\nDATABASE_URL=\n\n';
    }

    envContent += '# Evolution Configuration\nEVOLUTION_MODE=balanced\n';

    await fs.writeFile(path.join(projectPath, '.env.example'), envContent);
}

async function generateGitignore(projectPath: string) {
    const gitignore = `node_modules/
dist/
.env
.DS_Store
*.log
`;

    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
}

async function generateReadme(
    projectPath: string,
    projectName: string,
    config: ProjectConfig
) {
    const readme = `# ${projectName}

Created with [PGA Platform](https://pga.ai) — Genomic Self-Evolving Prompts

## 🚀 Quick Start

1. **Configure environment**:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your API keys
   \`\`\`

2. **Run development server**:
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Build for production**:
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

## 📦 Configuration

- **LLM Provider**: ${config.llmProvider}
- **Storage**: ${config.storage}
- **Evolution Boost**: ${config.evolutionBoost ? 'Enabled (10x faster!)' : 'Disabled'}
- **Template**: ${config.template}

## 📚 Documentation

- [PGA Documentation](https://pga.ai/docs)
- [API Reference](https://pga.ai/api)
- [Discord Community](https://discord.gg/pga)

## 🛠️ Development

\`\`\`bash
npm run dev      # Run in development mode
npm run build    # Build for production
npm start        # Run production build
npm test         # Run tests
\`\`\`

---

**Built with PGA** 🧬
`;

    await fs.writeFile(path.join(projectPath, 'README.md'), readme);
}

async function generateSourceFiles(projectPath: string, config: ProjectConfig) {
    const srcPath = path.join(projectPath, 'src');
    await fs.ensureDir(srcPath);

    // Generate main index.ts based on template
    const indexContent = generateIndexFile(config);
    await fs.writeFile(path.join(srcPath, 'index.ts'), indexContent);

    // Generate example agent file
    const agentContent = generateAgentFile(config);
    await fs.writeFile(path.join(srcPath, 'agent.ts'), agentContent);
}

function generateIndexFile(config: ProjectConfig): string {
    let imports = `import 'dotenv/config';\nimport { PGA } from '@pga-ai/core';\n`;

    if (config.llmProvider === 'anthropic') {
        imports += `import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';\n`;
    } else if (config.llmProvider === 'openai') {
        imports += `import { OpenAIAdapter } from '@pga-ai/adapters-llm-openai';\n`;
    } else {
        imports += `import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';\nimport { OpenAIAdapter } from '@pga-ai/adapters-llm-openai';\n`;
    }

    if (config.storage === 'postgres') {
        imports += `import { PostgresAdapter } from '@pga-ai/adapters-storage-postgres';\n`;
    } else {
        imports += `import { InMemoryStorage } from '@pga-ai/core';\n`;
    }

    imports += `\nimport { setupAgent } from './agent.js';\n\n`;

    const llmSetup = config.llmProvider === 'anthropic'
        ? `const llm = new ClaudeAdapter({\n  apiKey: process.env.ANTHROPIC_API_KEY!,\n  model: 'claude-sonnet-4-20250514',\n});\n`
        : `const llm = new OpenAIAdapter({\n  apiKey: process.env.OPENAI_API_KEY!,\n  model: 'gpt-4-turbo-preview',\n});\n`;

    const storageSetup = config.storage === 'postgres'
        ? `const storage = new PostgresAdapter({\n  connectionString: process.env.DATABASE_URL!,\n});\n`
        : `const storage = new InMemoryStorage();\n`;

    return `${imports}async function main() {
  console.log('🧬 Starting PGA Agent...\\n');

  // Initialize LLM adapter
  ${llmSetup}
  // Initialize storage
  ${storageSetup}
  // Initialize PGA
  const pga = new PGA({
    llm,
    storage,
    config: {
      evolutionMode: process.env.EVOLUTION_MODE || 'balanced',
    },
  });

  await pga.initialize();
  console.log('✅ PGA initialized\\n');

  // Setup agent genome
  const genome = await setupAgent(pga);

  // Example conversation
  const userId = 'demo-user';
  const message = 'Hello! What can you do?';

  console.log(\`User: \${message}\\n\`);
  const response = await genome.chat(message, { userId });
  console.log(\`Agent: \${response.content}\\n\`);

  console.log('✨ Your PGA-powered agent is working!');
  console.log('Next: Customize the genome in agent.ts\\n');
}

main().catch(console.error);
`;
}

function generateAgentFile(config: ProjectConfig): string {
    const template = config.template;

    let coreIdentity = '';
    let capabilities = '';

    switch (template) {
        case 'chatbot':
            coreIdentity = 'You are a helpful AI assistant that provides friendly and informative responses.';
            capabilities = 'You can answer questions, provide explanations, and help with various tasks.';
            break;
        case 'code-assistant':
            coreIdentity = 'You are an expert programming assistant with deep knowledge of software development.';
            capabilities = 'You can help with code reviews, debugging, architecture design, and best practices.';
            break;
        case 'customer-support':
            coreIdentity = 'You are a professional customer support agent focused on solving user problems efficiently.';
            capabilities = 'You can handle inquiries, troubleshoot issues, and provide product information.';
            break;
        case 'data-analysis':
            coreIdentity = 'You are a data analysis expert who helps users understand their data.';
            capabilities = 'You can analyze datasets, create visualizations, and provide statistical insights.';
            break;
        default:
            coreIdentity = 'You are an AI agent designed to assist users effectively.';
            capabilities = 'You can help with various tasks and adapt to user needs.';
    }

    return `import type { PGA, Genome } from '@pga-ai/core';

/**
 * Setup the agent genome with initial configuration
 */
export async function setupAgent(pga: PGA): Promise<Genome> {
  console.log('🧬 Creating agent genome...\\n');

  // Create a new genome for this agent
  const genome = await pga.createGenome({
    name: 'my-agent',
    description: 'A PGA-powered agent with self-evolution capabilities',
  });

  // Layer 0 (C0): Core immutable identity
  await genome.addAllele({
    layer: 0,
    gene: 'core-identity',
    variant: 'default',
    content: \`${coreIdentity}\`,
  });

  // Layer 1 (C1): Operative instructions
  await genome.addAllele({
    layer: 1,
    gene: 'capabilities',
    variant: 'default',
    content: \`${capabilities}\`,
  });

  await genome.addAllele({
    layer: 1,
    gene: 'response-style',
    variant: 'default',
    content: 'Be clear, concise, and helpful in your responses.',
  });

  console.log('✅ Genome configured with initial alleles\\n');

  return genome;
}
`;
}
