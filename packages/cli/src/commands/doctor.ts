/**
 * PGA CLI - Doctor Command
 *
 * Comprehensive diagnostics for PGA environment validation.
 * Checks Node.js, TypeScript, packages, API keys, and LLM connectivity.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import chalk from 'chalk';
import ora from 'ora';

interface CheckResult {
    success: boolean;
    message?: string;
    warning?: boolean;
}

export async function doctor(_options: { fix?: boolean }): Promise<void> {
    console.log(chalk.bold('\n🔍 Running PGA Diagnostics\n'));

    const checks = [
        { name: 'Node.js version (≥20)', check: () => checkNodeVersion() },
        { name: 'TypeScript installed', check: () => checkTypeScript() },
        { name: 'PGA core package', check: () => checkPGACore() },
        { name: 'LLM adapter packages', check: () => checkLLMAdapters() },
        { name: 'LLM API keys configured', check: () => checkLLMApiKeys() },
        { name: 'LLM connectivity', check: () => checkLLMConnectivity() },
    ];

    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const { name, check } of checks) {
        const spinner = ora(name).start();

        try {
            const result = await check();

            if (result.success) {
                if (result.warning) {
                    spinner.warn(chalk.yellow(`${name}: ${result.message}`));
                    warnings++;
                } else {
                    spinner.succeed(chalk.green(name + (result.message ? `: ${result.message}` : '')));
                }
                passed++;
            } else {
                spinner.fail(chalk.red(`${name}: ${result.message}`));
                failed++;
            }
        } catch (error) {
            const err = error as Error;
            spinner.fail(chalk.red(`${name}: ${err.message}`));
            failed++;
        }
    }

    console.log();
    console.log(chalk.bold('Results:'));
    console.log(chalk.green(`  ✓ Passed: ${passed}`));

    if (warnings > 0) {
        console.log(chalk.yellow(`  ⚠ Warnings: ${warnings}`));
    }

    if (failed > 0) {
        console.log(chalk.red(`  ✗ Failed: ${failed}`));
        console.log();
        console.log(chalk.bold('To fix issues:'));
        console.log(chalk.dim('  1. Install missing packages with npm install'));
        console.log(chalk.dim('  2. Set API keys: export ANTHROPIC_API_KEY=sk-ant-...'));
        console.log(chalk.dim('  3. Run "pga doctor" again to verify'));
    } else {
        console.log();
        console.log(chalk.green.bold('  ✓ All checks passed! PGA is ready.'));
    }

    console.log();
}

function checkNodeVersion(): CheckResult {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);

    if (major >= 20) {
        return { success: true, message: version };
    }

    return {
        success: false,
        message: `Node.js ${version} detected. PGA requires Node.js 20+. Upgrade: https://nodejs.org`,
    };
}

function checkTypeScript(): CheckResult {
    try {
        require.resolve('typescript');
        return { success: true };
    } catch {
        return {
            success: false,
            message: 'TypeScript not found. Run: npm install -D typescript',
        };
    }
}

function checkPGACore(): CheckResult {
    try {
        require.resolve('@pga-ai/core');
        return { success: true };
    } catch {
        return {
            success: false,
            message: '@pga-ai/core not found. Run: npm install @pga-ai/core',
        };
    }
}

function checkLLMAdapters(): CheckResult {
    const adapters = [
        { pkg: '@pga-ai/adapters-llm-anthropic', name: 'Claude' },
        { pkg: '@pga-ai/adapters-llm-openai', name: 'OpenAI' },
    ];

    const installed: string[] = [];

    for (const adapter of adapters) {
        try {
            require.resolve(adapter.pkg);
            installed.push(adapter.name);
        } catch {
            // Not installed — that's OK if at least one is present
        }
    }

    if (installed.length > 0) {
        return { success: true, message: installed.join(', ') };
    }

    return {
        success: false,
        message: 'No LLM adapter found. Install at least one:\n'
            + '    npm install @pga-ai/adapters-llm-anthropic   # Claude\n'
            + '    npm install @pga-ai/adapters-llm-openai       # GPT-4',
    };
}

function checkLLMApiKeys(): CheckResult {
    const providers = [
        { key: 'ANTHROPIC_API_KEY', name: 'Anthropic (Claude)', prefix: 'sk-ant-' },
        { key: 'OPENAI_API_KEY', name: 'OpenAI (GPT)', prefix: 'sk-' },
    ];

    const configured: string[] = [];
    const issues: string[] = [];

    for (const provider of providers) {
        const value = process.env[provider.key];
        if (value) {
            if (value === `your-api-key-here` || value === 'sk-...') {
                issues.push(`${provider.key} is set to a placeholder value`);
            } else {
                configured.push(provider.name);
            }
        }
    }

    if (issues.length > 0) {
        return {
            success: true,
            warning: true,
            message: issues.join('; '),
        };
    }

    if (configured.length > 0) {
        return { success: true, message: configured.join(', ') };
    }

    return {
        success: false,
        message: 'No LLM API keys found. Set at least one:\n'
            + '    export ANTHROPIC_API_KEY=sk-ant-...   # Claude\n'
            + '    export OPENAI_API_KEY=sk-...          # GPT-4',
    };
}

async function checkLLMConnectivity(): Promise<CheckResult> {
    // Try Anthropic first
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && anthropicKey !== 'your-api-key-here') {
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'hi' }],
                }),
                signal: AbortSignal.timeout(10000),
            });

            if (response.ok) {
                return { success: true, message: 'Anthropic API responding' };
            }

            const status = response.status;
            if (status === 401) {
                return { success: false, message: 'Anthropic API key is invalid (401 Unauthorized)' };
            }
            if (status === 429) {
                return { success: true, warning: true, message: 'Anthropic API rate-limited (key is valid)' };
            }

            return { success: true, warning: true, message: `Anthropic API returned ${status}` };
        } catch (err) {
            const error = err as Error;
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                return { success: false, message: 'Anthropic API timed out (check network)' };
            }
            return { success: false, message: `Anthropic API unreachable: ${error.message}` };
        }
    }

    // Try OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey !== 'your-api-key-here') {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${openaiKey}` },
                signal: AbortSignal.timeout(10000),
            });

            if (response.ok) {
                return { success: true, message: 'OpenAI API responding' };
            }

            const status = response.status;
            if (status === 401) {
                return { success: false, message: 'OpenAI API key is invalid (401 Unauthorized)' };
            }

            return { success: true, warning: true, message: `OpenAI API returned ${status}` };
        } catch (err) {
            const error = err as Error;
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                return { success: false, message: 'OpenAI API timed out (check network)' };
            }
            return { success: false, message: `OpenAI API unreachable: ${error.message}` };
        }
    }

    return {
        success: true,
        warning: true,
        message: 'No API keys set — skipping connectivity test',
    };
}
