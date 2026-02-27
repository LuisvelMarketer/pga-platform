/**
 * Genome Kernel - Living OS Core
 *
 * The heart of PGA's "Living OS" - manages genome lifecycle,
 * enforces C0 immutability, and coordinates evolution.
 *
 * Key Responsibilities:
 * 1. C0 Integrity verification (SHA-256 hash)
 * 2. Quarantine on violation
 * 3. Mutation orchestration
 * 4. Fitness tracking
 * 5. Rollback mechanism
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0
 */

import * as crypto from 'crypto';
import type {
    GenomeV2,
    Chromosome0,
    IntegrityMetadata,
    FitnessVector,
    MutationRecord,
    GenomeState,
    GenomeSnapshot,
} from '../types/GenomeV2.js';

// ─── Security Event Types ───────────────────────────────────

interface SecurityEvent {
    level: 'info' | 'warning' | 'error' | 'critical';
    event: string;
    details: Record<string, unknown>;
    timestamp: Date;
}

interface IntegrityViolation {
    genomeId: string;
    genomeName: string;
    expected: string; // Expected C0 hash
    actual: string; // Actual C0 hash
    timestamp: Date;
    stackTrace?: string;
}

// ─── Genome Kernel Options ─────────────────────────────────

export interface GenomeKernelOptions {
    // Integrity enforcement
    strictMode?: boolean; // Default: true - Quarantine on violation
    autoRollback?: boolean; // Default: true - Auto-rollback on integrity fail
    maxViolations?: number; // Default: 3 - Max violations before permanent quarantine

    // Performance
    enableCaching?: boolean; // Default: true - Cache C0 hash
    cacheInvalidationMs?: number; // Default: 0 - Always recompute

    // Monitoring
    onIntegrityViolation?: (violation: IntegrityViolation) => void;
    onSecurityEvent?: (event: SecurityEvent) => void;
    onQuarantine?: (genomeId: string, reason: string) => void;
}

// ─── Genome Kernel ──────────────────────────────────────────

/**
 * GenomeKernel - Living OS Core
 *
 * Enforces C0 immutability and manages genome lifecycle.
 */
export class GenomeKernel {
    private genome: GenomeV2;
    private c0Hash: string;
    private options: Required<GenomeKernelOptions>;

    // Caching
    private c0HashCache: string | null = null;
    private lastHashComputation: number = 0;

    // History
    private snapshots: GenomeSnapshot[] = [];
    private maxSnapshots = 100;

    constructor(genome: GenomeV2, options: GenomeKernelOptions = {}) {
        this.genome = genome;

        // Set defaults
        this.options = {
            strictMode: options.strictMode ?? true,
            autoRollback: options.autoRollback ?? true,
            maxViolations: options.maxViolations ?? 3,
            enableCaching: options.enableCaching ?? true,
            cacheInvalidationMs: options.cacheInvalidationMs ?? 0,
            onIntegrityViolation: options.onIntegrityViolation ?? (() => {}),
            onSecurityEvent: options.onSecurityEvent ?? (() => {}),
            onQuarantine: options.onQuarantine ?? (() => {}),
        };

        // Compute initial C0 hash
        this.c0Hash = this.computeC0Hash(genome.chromosomes.c0);

        // Initialize integrity metadata if missing
        if (!genome.integrity) {
            genome.integrity = {
                c0Hash: this.c0Hash,
                lastVerified: new Date(),
                violations: 0,
                quarantined: false,
            };
        }

        // Verify genome on creation
        this.verifyIntegrity();
    }

    // ─── C0 Integrity Verification ──────────────────────────────

    /**
     * Compute SHA-256 hash of C0 content
     *
     * Only includes semantic content (identity, security, attribution).
     * Explicitly excludes metadata like timestamps.
     *
     * @param c0 - Chromosome 0 to hash
     * @returns SHA-256 hash (64 hex characters)
     */
    private computeC0Hash(c0: Chromosome0): string {
        // Create canonical representation (no metadata)
        const canonical = {
            identity: c0.identity,
            security: c0.security,
            attribution: c0.attribution,
        };

        // Deterministic JSON serialization (sorted keys)
        const keys = Object.keys(canonical).sort();
        const sorted = keys.reduce(
            (acc, key) => {
                acc[key] = canonical[key as keyof typeof canonical];
                return acc;
            },
            {} as Record<string, unknown>
        );

        const content = JSON.stringify(sorted);

        // SHA-256 hash
        return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    }

    /**
     * Verify C0 integrity
     *
     * CRITICAL SECURITY CHECK - Must be called before every prompt assembly.
     *
     * @returns true if integrity verified, false if violated
     * @throws Error in strict mode if integrity violated
     */
    public verifyIntegrity(): boolean {
        // Check if quarantined
        if (this.genome.integrity.quarantined) {
            this.logSecurityEvent({
                level: 'error',
                event: 'integrity_check_blocked',
                details: {
                    reason: 'Genome is quarantined',
                    genomeId: this.genome.id,
                },
                timestamp: new Date(),
            });

            if (this.options.strictMode) {
                throw new Error(
                    `Genome ${this.genome.id} is quarantined. Cannot verify integrity.`
                );
            }

            return false;
        }

        // Compute current hash (with caching)
        let currentHash: string;

        if (this.options.enableCaching && this.c0HashCache) {
            const now = Date.now();
            const elapsed = now - this.lastHashComputation;

            if (elapsed < this.options.cacheInvalidationMs) {
                currentHash = this.c0HashCache;
            } else {
                currentHash = this.computeC0Hash(this.genome.chromosomes.c0);
                this.c0HashCache = currentHash;
                this.lastHashComputation = now;
            }
        } else {
            currentHash = this.computeC0Hash(this.genome.chromosomes.c0);
            this.c0HashCache = currentHash;
            this.lastHashComputation = Date.now();
        }

        // Compare with expected hash
        if (currentHash !== this.c0Hash) {
            this.handleIntegrityViolation(currentHash);
            return false;
        }

        // Integrity verified
        this.genome.integrity.lastVerified = new Date();

        this.logSecurityEvent({
            level: 'info',
            event: 'integrity_verified',
            details: {
                genomeId: this.genome.id,
                hash: currentHash,
            },
            timestamp: new Date(),
        });

        return true;
    }

    /**
     * Handle C0 integrity violation
     *
     * CRITICAL SECURITY RESPONSE:
     * 1. Increment violation counter
     * 2. Quarantine genome if threshold exceeded
     * 3. Trigger automatic rollback
     * 4. Log security event
     * 5. Alert monitoring systems
     */
    private handleIntegrityViolation(actualHash: string): void {
        const violation: IntegrityViolation = {
            genomeId: this.genome.id,
            genomeName: this.genome.name,
            expected: this.c0Hash,
            actual: actualHash,
            timestamp: new Date(),
            stackTrace: new Error().stack,
        };

        // Increment violations
        this.genome.integrity.violations += 1;

        // Log violation
        this.logSecurityEvent({
            level: 'critical',
            event: 'c0_integrity_violation',
            details: {
                genomeId: this.genome.id,
                genomeName: this.genome.name,
                expectedHash: this.c0Hash,
                actualHash: actualHash,
                violationCount: this.genome.integrity.violations,
            },
            timestamp: new Date(),
        });

        // Notify callback
        this.options.onIntegrityViolation(violation);

        // Quarantine if threshold exceeded
        if (this.genome.integrity.violations >= this.options.maxViolations) {
            this.quarantine(
                `C0 integrity violated ${this.genome.integrity.violations} times. ` +
                    `Expected: ${this.c0Hash.substring(0, 16)}..., ` +
                    `Got: ${actualHash.substring(0, 16)}...`
            );
        }

        // Auto-rollback if enabled
        if (this.options.autoRollback) {
            this.rollbackToSafeVersion();
        }

        // Strict mode: throw error
        if (this.options.strictMode) {
            throw new IntegrityViolationError(
                `C0 integrity violation detected in genome "${this.genome.name}" (${this.genome.id}). ` +
                    `Expected hash: ${this.c0Hash}, Got: ${actualHash}. ` +
                    `Genome has been quarantined.`
            );
        }
    }

    // ─── Quarantine Management ──────────────────────────────────

    /**
     * Quarantine genome
     *
     * Puts genome in lockdown - no mutations, no prompt assembly allowed.
     */
    private quarantine(reason: string): void {
        this.genome.state = 'quarantined';
        this.genome.integrity.quarantined = true;
        this.genome.integrity.quarantineReason = reason;

        this.logSecurityEvent({
            level: 'critical',
            event: 'genome_quarantined',
            details: {
                genomeId: this.genome.id,
                reason,
            },
            timestamp: new Date(),
        });

        // Notify callback
        this.options.onQuarantine(this.genome.id, reason);
    }

    /**
     * Release from quarantine (manual intervention required)
     */
    public releaseQuarantine(authorizedBy: string): void {
        if (!this.genome.integrity.quarantined) {
            return;
        }

        // Re-verify integrity before release
        const currentHash = this.computeC0Hash(this.genome.chromosomes.c0);

        if (currentHash !== this.c0Hash) {
            throw new Error(
                'Cannot release quarantine: C0 integrity still violated. ' +
                    'Rollback to safe version first.'
            );
        }

        this.genome.state = 'active';
        this.genome.integrity.quarantined = false;
        this.genome.integrity.violations = 0; // Reset counter
        delete this.genome.integrity.quarantineReason;

        this.logSecurityEvent({
            level: 'warning',
            event: 'quarantine_released',
            details: {
                genomeId: this.genome.id,
                authorizedBy,
            },
            timestamp: new Date(),
        });
    }

    // ─── Rollback System ────────────────────────────────────────

    /**
     * Create snapshot of current genome state
     */
    public createSnapshot(reason: string): void {
        const snapshot: GenomeSnapshot = {
            genomeId: this.genome.id,
            version: this.genome.version,
            snapshot: JSON.parse(JSON.stringify(this.genome)), // Deep clone
            createdAt: new Date(),
            reason,
        };

        this.snapshots.push(snapshot);

        // Limit snapshots
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift(); // Remove oldest
        }

        this.logSecurityEvent({
            level: 'info',
            event: 'snapshot_created',
            details: {
                genomeId: this.genome.id,
                version: this.genome.version,
                reason,
            },
            timestamp: new Date(),
        });
    }

    /**
     * Rollback to last known good version
     */
    private rollbackToSafeVersion(): void {
        if (this.snapshots.length === 0) {
            this.logSecurityEvent({
                level: 'error',
                event: 'rollback_failed',
                details: {
                    genomeId: this.genome.id,
                    reason: 'No snapshots available',
                },
                timestamp: new Date(),
            });
            return;
        }

        // Find last snapshot with valid C0
        let safeSnapshot: GenomeSnapshot | null = null;

        for (let i = this.snapshots.length - 1; i >= 0; i--) {
            const snapshot = this.snapshots[i];
            const snapshotHash = this.computeC0Hash(snapshot.snapshot.chromosomes.c0);

            if (snapshotHash === this.c0Hash) {
                safeSnapshot = snapshot;
                break;
            }
        }

        if (!safeSnapshot) {
            this.logSecurityEvent({
                level: 'error',
                event: 'rollback_failed',
                details: {
                    genomeId: this.genome.id,
                    reason: 'No safe snapshots found',
                },
                timestamp: new Date(),
            });
            return;
        }

        // Restore from snapshot
        Object.assign(this.genome, safeSnapshot.snapshot);
        this.genome.version += 1; // Increment version

        this.logSecurityEvent({
            level: 'warning',
            event: 'rollback_completed',
            details: {
                genomeId: this.genome.id,
                fromVersion: this.genome.version - 1,
                toVersion: safeSnapshot.version,
            },
            timestamp: new Date(),
        });
    }

    /**
     * Manual rollback to specific version
     */
    public rollbackToVersion(version: number, authorizedBy: string): boolean {
        const snapshot = this.snapshots.find((s) => s.version === version);

        if (!snapshot) {
            return false;
        }

        // Restore
        Object.assign(this.genome, snapshot.snapshot);
        this.genome.version += 1;

        // Reset integrity
        this.genome.integrity.violations = 0;
        this.genome.integrity.quarantined = false;
        delete this.genome.integrity.quarantineReason;

        this.logSecurityEvent({
            level: 'warning',
            event: 'manual_rollback',
            details: {
                genomeId: this.genome.id,
                toVersion: version,
                authorizedBy,
            },
            timestamp: new Date(),
        });

        return true;
    }

    // ─── Logging & Monitoring ───────────────────────────────────

    /**
     * Log security event
     */
    private logSecurityEvent(event: SecurityEvent): void {
        // Log to console in development
        if (process.env.NODE_ENV !== 'production') {
            const levelEmoji = {
                info: 'ℹ️',
                warning: '⚠️',
                error: '❌',
                critical: '🔥',
            };

            console.log(
                `${levelEmoji[event.level]} [${event.level.toUpperCase()}] ${event.event}`,
                event.details
            );
        }

        // Notify callback
        this.options.onSecurityEvent(event);
    }

    // ─── Getters ────────────────────────────────────────────────

    public getGenome(): GenomeV2 {
        return this.genome;
    }

    public getC0Hash(): string {
        return this.c0Hash;
    }

    public getSnapshots(): GenomeSnapshot[] {
        return [...this.snapshots];
    }

    public isQuarantined(): boolean {
        return this.genome.integrity.quarantined;
    }

    public getViolationCount(): number {
        return this.genome.integrity.violations;
    }
}

// ─── Custom Errors ──────────────────────────────────────────

export class IntegrityViolationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IntegrityViolationError';
    }
}

export class QuarantinedGenomeError extends Error {
    constructor(genomeId: string) {
        super(
            `Genome ${genomeId} is quarantined and cannot be used. ` +
                `Manual intervention required to release quarantine.`
        );
        this.name = 'QuarantinedGenomeError';
    }
}
