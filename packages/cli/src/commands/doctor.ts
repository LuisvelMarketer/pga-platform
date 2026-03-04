/**
 * PGA CLI - Doctor Command
 */

import chalk from 'chalk';
import ora from 'ora';

export async function doctor(_options: { fix?: boolean }): Promise<void> {
    console.log(chalk.bold('\n🔍 Running PGA Diagnostics\n'));

    const checks = [
        { name: 'Node.js version', check: () => checkNodeVersion() },
        { name: 'TypeScript installed', check: () => checkTypeScript() },
        { name: 'PGA core package', check: () => checkPGACore() },
        { name: 'Environment variables', check: () => checkEnvVars() },
    ];

    let passed = 0;
    let failed = 0;

    for (const { name, check } of checks) {
        const spinner = ora(name).start();

        try {
            const result = await check();

            if (result.success) {
                spinner.succeed(chalk.green(name));
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
    console.log(chalk.green(`✓ Passed: ${passed}`));

    if (failed > 0) {
        console.log(chalk.red(`✗ Failed: ${failed}`));
    }

    console.log();
}

function checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);

    if (major >= 20) {
        return { success: true };
    }

    return {
        success: false,
        message: `Node.js ${version} detected. PGA requires Node.js 20+`,
    };
}

function checkTypeScript() {
    try {
        require.resolve('typescript');
        return { success: true };
    } catch {
        return {
            success: false,
            message: 'TypeScript not found. Run: npm install -g typescript',
        };
    }
}

function checkPGACore() {
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

function checkEnvVars() {
    const required = ['ANTHROPIC_API_KEY'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length === 0) {
        return { success: true };
    }

    return {
        success: false,
        message: `Missing environment variables: ${missing.join(', ')}`,
    };
}
