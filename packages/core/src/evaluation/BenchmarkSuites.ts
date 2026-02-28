/**
 * Benchmark Suites - Versioned Test Suites
 *
 * Provides versioned, governed benchmark suites for consistent evaluation.
 * Each suite is frozen on publication - new versions created for changes.
 *
 * Living OS v1.0 - Week 4: Benchmark Governance
 * Living OS v1.0 - Week 5: External JSON fixtures
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import type { EvaluationTask } from './Evaluator.js';

// Import JSON fixtures (Living OS v1.0 Week 5)
import coreGeneralV1Fixture from './fixtures/core-general-v1.json';
import coreCodingV1Fixture from './fixtures/core-coding-v1.json';

// ─── Suite Metadata ─────────────────────────────────────────

export interface BenchmarkSuiteMetadata {
    id: string;
    version: string;
    owner: string;
    createdAt: string;
    changedAt: string;
    changelog: string[];
    frozen: boolean;
}

export interface BenchmarkSuite {
    metadata: BenchmarkSuiteMetadata;
    tasks: EvaluationTask[];
}

// ─── Core General Suite v1 ──────────────────────────────────
// Living OS v1.0 Week 5: Loaded from external JSON fixture

export const CORE_GENERAL_V1: BenchmarkSuite = coreGeneralV1Fixture as BenchmarkSuite;

// ─── Core Coding Suite v1 ───────────────────────────────────
// Living OS v1.0 Week 5: Loaded from external JSON fixture

export const CORE_CODING_V1: BenchmarkSuite = coreCodingV1Fixture as BenchmarkSuite;

// ─── PGA-Specific Suite v1 ──────────────────────────────────

export const PGA_SPECIFIC_V1: BenchmarkSuite = {
    metadata: {
        id: 'pga-specific-v1',
        version: '1.0.0',
        owner: 'Luis Alfredo Velasquez Duran',
        createdAt: '2026-02-27',
        changedAt: '2026-02-27',
        changelog: ['Initial release - PGA-specific knowledge'],
        frozen: true,
    },
    tasks: [
        {
            id: 'pga-architecture',
            name: 'PGA Architecture',
            description: 'Test understanding of PGA architecture',
            userMessage: 'Explain the three-layer architecture of PGA',
            expectedOutcome: {
                keywords: ['layer0', 'layer1', 'layer2', 'immutable', 'mutation'],
                minLength: 100,
            },
            difficulty: 'easy',
        },
        {
            id: 'pga-evolution',
            name: 'Evolution Mechanism',
            description: 'Test understanding of evolution process',
            userMessage: 'How does PGA evolve prompts?',
            expectedOutcome: {
                keywords: ['fitness', 'mutation', 'selection', 'genome'],
                minLength: 100,
            },
            difficulty: 'medium',
        },
        {
            id: 'pga-userdna',
            name: 'User DNA Concept',
            description: 'Test understanding of user DNA',
            userMessage: 'What is User DNA in PGA?',
            expectedOutcome: {
                keywords: ['user', 'preferences', 'traits', 'cognitive'],
                minLength: 80,
            },
            difficulty: 'medium',
        },
    ],
};

// ─── Suite Registry ─────────────────────────────────────────

export const BENCHMARK_SUITES = {
    'core-general-v1': CORE_GENERAL_V1,
    'core-coding-v1': CORE_CODING_V1,
    'pga-specific-v1': PGA_SPECIFIC_V1,
} as const;

export type BenchmarkSuiteId = keyof typeof BENCHMARK_SUITES;

// ─── Suite Selector ─────────────────────────────────────────

/**
 * Get benchmark suite by ID
 */
export function getBenchmarkSuite(suiteId: BenchmarkSuiteId): BenchmarkSuite {
    const suite = BENCHMARK_SUITES[suiteId];
    if (!suite) {
        throw new Error(`Unknown benchmark suite: ${suiteId}`);
    }
    return suite;
}

/**
 * Get all available suite IDs
 */
export function getAvailableSuites(): BenchmarkSuiteId[] {
    return Object.keys(BENCHMARK_SUITES) as BenchmarkSuiteId[];
}

/**
 * Validate suite is frozen (immutable)
 */
export function validateSuiteFrozen(suiteId: BenchmarkSuiteId): boolean {
    return getBenchmarkSuite(suiteId).metadata.frozen;
}
