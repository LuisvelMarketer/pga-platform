/**
 * WrapOptions — Type definitions for PGA.wrap() API
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { GeneBank } from '../gene-bank/GeneBank.js';
import type { GeneCategory } from '../types/GenomeV2.js';
import type { MetricsCollectorConfig } from '../monitoring/MetricsCollector.js';
import type { DashboardConfig } from '../monitoring/MonitoringDashboard.js';

// ─── Wrap Options ───────────────────────────────────────────

export interface WrapOptions {
    /** Human-readable agent name */
    name?: string;

    /**
     * Base system prompt. Gets parsed into C0 identity + C1 instructions.
     * If protect/evolve/adapt are provided, they override the auto-parse.
     */
    systemPrompt: string;

    /**
     * C0: Immutable rules (NEVER evolve).
     * Each string becomes a layer0 GeneAllele.
     * These are SHA-256 integrity-protected.
     */
    protect?: string[];

    /**
     * C1: Operative genes that evolve SLOWLY with validation.
     * Can be strings (auto-categorized) or explicit { category, content } pairs.
     */
    evolve?: Array<string | { category: GeneCategory; content: string }>;

    /**
     * C2: Fast-adapting epigenetic layer.
     * Typically tone, verbosity, formality preferences.
     */
    adapt?: Array<string | { trait: string; content: string }>;

    // ─── Storage ─────────────────────────────────────────

    /** External storage adapter. Default: InMemoryStorageAdapter */
    storage?: StorageAdapter;

    // ─── Gene Bank ───────────────────────────────────────

    /** Gene Bank for cross-agent knowledge sharing */
    geneBank?: GeneBank;

    // ─── Evolution Config ────────────────────────────────

    evolution?: {
        /** Mutation rate mode. Default: 'balanced' */
        mode?: 'conservative' | 'balanced' | 'aggressive';
        /** Enable canary deployments. Default: true */
        canary?: boolean;
        /** Evolve every N interactions. Default: 10 */
        evolveEveryN?: number;
        /** Auto-mutate when drift detected. Default: true */
        autoMutateOnDrift?: boolean;
        /** Auto-compress when token pressure detected. Default: true */
        autoCompressOnPressure?: boolean;
        /** Enable swarm intelligence (Gene Bank sharing). Default: false */
        enableSwarm?: boolean;
    };

    // ─── Monitoring ──────────────────────────────────────

    monitoring?: {
        /** Enable metrics collection. Default: true */
        enabled?: boolean;
        /** Enable dashboard. Default: false */
        dashboard?: boolean;
        /** Dashboard config */
        dashboardConfig?: DashboardConfig;
        /** Alert configuration */
        alerts?: boolean;
        /** Custom metrics config */
        metricsConfig?: MetricsCollectorConfig;
    };

    // ─── Advanced ────────────────────────────────────────

    /** Family ID for cross-genome inheritance */
    familyId?: string;
    /** Enable self-model */
    enableSelfModel?: boolean;
    /** Enable metacognition */
    enableMetacognition?: boolean;
    /** Enable emotional model */
    enableEmotionalModel?: boolean;
    /** Agent purpose statement */
    agentPurpose?: string;
}

// ─── Function Wrap Options ──────────────────────────────────

export type WrappableFunction = (input: string) => Promise<string>;

export interface FunctionWrapOptions extends WrapOptions {
    /** Required for function wrapping */
    name: string;
}
