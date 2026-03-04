/**
 * Dependency installer
 */

import { execa } from 'execa';
import ora from 'ora';
import chalk from 'chalk';
import type { ProjectConfig } from './prompts.js';

export async function installDependencies(
    projectName: string,
    config: ProjectConfig
): Promise<void> {
    const spinner = ora('Installing dependencies...').start();

    try {
        // Determine which packages to install
        const packages = ['@pga-ai/core'];

        // LLM adapters
        if (config.llmProvider === 'anthropic' || config.llmProvider === 'both') {
            packages.push('@pga-ai/adapters-llm-anthropic');
        }
        if (config.llmProvider === 'openai' || config.llmProvider === 'both') {
            packages.push('@pga-ai/adapters-llm-openai');
        }

        // Storage adapters
        if (config.storage === 'postgres') {
            packages.push('@pga-ai/adapters-storage-postgres');
        }

        // Additional dependencies
        packages.push('dotenv', 'zod');

        spinner.text = `Installing ${packages.length} packages...`;

        // Install using npm
        await execa('npm', ['install', ...packages], {
            cwd: projectName,
            stdio: 'ignore',
        });

        // Install dev dependencies
        const devPackages = ['typescript', '@types/node', 'tsx', 'vitest'];

        spinner.text = 'Installing dev dependencies...';

        await execa('npm', ['install', '--save-dev', ...devPackages], {
            cwd: projectName,
            stdio: 'ignore',
        });

        spinner.succeed(chalk.green('Dependencies installed successfully!'));
    } catch (error) {
        spinner.fail(chalk.red('Failed to install dependencies'));
        throw error;
    }
}
