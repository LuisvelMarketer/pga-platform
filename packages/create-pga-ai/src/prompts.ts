/**
 * Interactive prompts for project configuration
 */

import inquirer from 'inquirer';
import chalk from 'chalk';

export interface ProjectConfig {
    llmProvider: 'anthropic' | 'openai' | 'both';
    storage: 'postgres' | 'memory';
    evolutionBoost: boolean;
    template: 'chatbot' | 'code-assistant' | 'customer-support' | 'data-analysis' | 'custom';
}

export async function promptUser(cliOptions: any): Promise<ProjectConfig> {
    const questions: any[] = [];

    // LLM Provider
    if (!cliOptions.llm) {
        questions.push({
            type: 'list',
            name: 'llmProvider',
            message: 'Which LLM provider?',
            choices: [
                {
                    name: chalk.cyan('Anthropic Claude') + chalk.gray(' (Recommended)'),
                    value: 'anthropic',
                },
                {
                    name: 'OpenAI GPT',
                    value: 'openai',
                },
                {
                    name: 'Both (maximum flexibility)',
                    value: 'both',
                },
            ],
            default: 'anthropic',
        });
    }

    // Storage
    if (!cliOptions.storage) {
        questions.push({
            type: 'list',
            name: 'storage',
            message: 'Which storage?',
            choices: [
                {
                    name: chalk.cyan('PostgreSQL') + chalk.gray(' (Production-ready)'),
                    value: 'postgres',
                },
                {
                    name: 'In-Memory' + chalk.gray(' (Development/Testing)'),
                    value: 'memory',
                },
            ],
            default: 'postgres',
        });
    }

    // Evolution Boost
    if (!cliOptions.boost) {
        questions.push({
            type: 'confirm',
            name: 'evolutionBoost',
            message: 'Enable Evolution Boost 2.0? ' + chalk.gray('(10x faster evolution)'),
            default: true,
        });
    }

    // Template
    if (!cliOptions.template) {
        questions.push({
            type: 'list',
            name: 'template',
            message: 'Project template?',
            choices: [
                {
                    name: chalk.cyan('Chatbot Agent') + chalk.gray(' (General conversation)'),
                    value: 'chatbot',
                },
                {
                    name: 'Code Assistant' + chalk.gray(' (Programming helper)'),
                    value: 'code-assistant',
                },
                {
                    name: 'Customer Support' + chalk.gray(' (Support automation)'),
                    value: 'customer-support',
                },
                {
                    name: 'Data Analysis' + chalk.gray(' (Analytics & insights)'),
                    value: 'data-analysis',
                },
                {
                    name: 'Custom' + chalk.gray(' (Blank starter)'),
                    value: 'custom',
                },
            ],
            default: 'chatbot',
        });
    }

    const answers = await inquirer.prompt(questions);

    return {
        llmProvider: cliOptions.llm || answers.llmProvider,
        storage: cliOptions.storage || answers.storage,
        evolutionBoost: cliOptions.boost || answers.evolutionBoost,
        template: cliOptions.template || answers.template,
    };
}
