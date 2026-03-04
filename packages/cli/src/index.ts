#!/usr/bin/env node

/**
 * PGA CLI - Interactive Command Line Interface
 *
 * @author Luis Alfredo Velasquez Duran (Germany, 2025)
 * @license MIT
 */

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { VERSION } from '@pga-ai/core';

const program = new Command();

// ASCII Art Banner
console.log(
    chalk.cyan(
        figlet.textSync('PGA CLI', {
            font: 'Standard',
            horizontalLayout: 'default',
        })
    )
);

console.log(
    chalk.gray(
        '  Genomic Self-Evolving Prompts | World-Class AI Agent Platform\n'
    )
);

// CLI Configuration
program
    .name('pga')
    .description('Interactive CLI for PGA (Genomic Self-Evolving Prompts)')
    .version(VERSION)
    .option('-v, --verbose', 'Enable verbose output')
    .option('--no-color', 'Disable colored output');

// ─── INIT Command ───────────────────────────────────────────

program
    .command('init')
    .description('Initialize a new PGA project')
    .option('-t, --template <name>', 'Use a template (basic, advanced, enterprise)', 'basic')
    .option('-d, --dir <path>', 'Project directory', '.')
    .action(async (options) => {
        const { init } = await import('./commands/init.js');
        await init(options);
    });

// ─── CREATE Command ─────────────────────────────────────────

program
    .command('create')
    .description('Create a new genome')
    .option('-n, --name <name>', 'Genome name')
    .option('-m, --model <model>', 'LLM model (claude-sonnet-4.5, gpt-4, etc.)')
    .option('-i, --interactive', 'Interactive mode', true)
    .action(async (options) => {
        const { create } = await import('./commands/create.js');
        await create(options);
    });

// ─── LIST Command ───────────────────────────────────────────

program
    .command('list')
    .description('List all genomes')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .option('-s, --sort <field>', 'Sort by field (name, fitness, created)', 'created')
    .action(async (options) => {
        const { list } = await import('./commands/list.js');
        await list(options);
    });

// ─── CHAT Command ───────────────────────────────────────────

program
    .command('chat')
    .description('Start an interactive chat session with a genome')
    .argument('[genome-id]', 'Genome ID (will prompt if not provided)')
    .option('-u, --user <userId>', 'User ID', 'cli-user')
    .action(async (genomeId, options) => {
        const { chat } = await import('./commands/chat.js');
        await chat(genomeId, options);
    });

// ─── EVOLVE Command ─────────────────────────────────────────

program
    .command('evolve')
    .description('Manually trigger genome evolution')
    .argument('<genome-id>', 'Genome ID')
    .option('-l, --layer <layer>', 'Layer to evolve (0, 1, 2)', '2')
    .option('-g, --gene <gene>', 'Specific gene to evolve')
    .action(async (genomeId, options) => {
        const { evolve } = await import('./commands/evolve.js');
        await evolve(genomeId, options);
    });

// ─── BENCHMARK Command ──────────────────────────────────────

program
    .command('benchmark')
    .description('Run evaluation benchmarks')
    .argument('[genome-id]', 'Genome ID to benchmark')
    .option('-t, --tasks <tasks>', 'Task IDs (comma-separated)')
    .option('-c, --compare <genome-id>', 'Compare with another genome')
    .action(async (genomeId, options) => {
        const { benchmark } = await import('./commands/benchmark.js');
        await benchmark(genomeId, options);
    });

// ─── METRICS Command ────────────────────────────────────────

program
    .command('metrics')
    .description('View performance and cost metrics')
    .option('-p, --period <period>', 'Time period (1h, 24h, 7d, 30d)', '24h')
    .option('-e, --export <file>', 'Export to file')
    .action(async (options) => {
        const { metrics } = await import('./commands/metrics.js');
        await metrics(options);
    });

// ─── STATUS Command ─────────────────────────────────────────

program
    .command('status')
    .description('Show system health status')
    .option('-w, --watch', 'Watch mode (updates every 5s)')
    .action(async (options) => {
        const { status } = await import('./commands/status.js');
        await status(options);
    });

// ─── CONFIG Command ─────────────────────────────────────────

program
    .command('config')
    .description('Configure PGA settings')
    .option('-s, --set <key=value>', 'Set a configuration value')
    .option('-g, --get <key>', 'Get a configuration value')
    .option('--list', 'List all configuration')
    .action(async (options) => {
        const { config } = await import('./commands/config.js');
        await config(options);
    });

// ─── EXPORT Command ─────────────────────────────────────────

program
    .command('export')
    .description('Export genome or data')
    .argument('<genome-id>', 'Genome ID')
    .option('-o, --output <file>', 'Output file', 'genome-export.json')
    .option('-f, --format <format>', 'Export format (json, yaml)', 'json')
    .action(async (genomeId, options) => {
        const { exportGenome } = await import('./commands/export.js');
        await exportGenome(genomeId, options);
    });

// ─── IMPORT Command ─────────────────────────────────────────

program
    .command('import')
    .description('Import genome from file')
    .argument('<file>', 'File to import')
    .option('-n, --name <name>', 'New genome name')
    .action(async (file, options) => {
        const { importGenome } = await import('./commands/import.js');
        await importGenome(file, options);
    });

// ─── DOCTOR Command ─────────────────────────────────────────

program
    .command('doctor')
    .description('Run diagnostics and check for issues')
    .option('--fix', 'Attempt to fix issues automatically')
    .action(async (options) => {
        const { doctor } = await import('./commands/doctor.js');
        await doctor(options);
    });

// ─── Parse and Execute ──────────────────────────────────────

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
