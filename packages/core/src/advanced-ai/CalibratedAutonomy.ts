/**
 * CalibratedAutonomy — Adaptive Decision Authority
 *
 * Determines when the agent should act autonomously vs. ask for
 * confirmation. Learns from user corrections to calibrate
 * autonomy thresholds per task type.
 *
 * Validation levels:
 * - none: Agent acts freely
 * - inform: Agent acts and informs after
 * - confirm: Agent asks before acting
 * - supervise: Agent presents options, user decides
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

// ─── Types ──────────────────────────────────────────────

export type ValidationLevel = 'none' | 'inform' | 'confirm' | 'supervise';

export interface AutonomyThreshold {
    taskType: string;
    autonomyLevel: number;        // 0-1: higher = more autonomous
    validationRequired: ValidationLevel;
    successCount: number;
    correctionCount: number;
    lastUpdated: Date;
}

export interface AutonomyDecision {
    canActAutonomously: boolean;
    validationRequired: ValidationLevel;
    confidence: number;
    reasoning: string;
}

export interface CorrectionRecord {
    taskType: string;
    wasAutonomous: boolean;
    correctionType: 'undo' | 'modify' | 'reject' | 'approve';
    timestamp: Date;
}

// ─── Constants ──────────────────────────────────────────

const DEFAULT_AUTONOMY_LEVEL = 0.5;
const AUTONOMY_INCREASE_STEP = 0.05;
const AUTONOMY_DECREASE_STEP = 0.15;  // Corrections penalize more than successes reward
const MIN_AUTONOMY = 0.1;
const MAX_AUTONOMY = 0.95;

// Task types with default autonomy levels
const DEFAULT_TASK_AUTONOMY: Record<string, number> = {
    'code-generation': 0.4,        // Moderate — code changes need review
    'code-review': 0.7,            // High — reviewing is read-only
    'bug-fix': 0.3,                // Low — changes can break things
    'refactoring': 0.3,            // Low — structural changes are risky
    'documentation': 0.7,          // High — low risk
    'testing': 0.6,                // Moderate — writing tests is usually safe
    'deployment': 0.2,             // Very low — production changes
    'configuration': 0.3,          // Low — config changes can break things
    'research': 0.9,               // Very high — research is read-only
    'explanation': 0.9,            // Very high — explaining is safe
    'formatting': 0.8,             // High — cosmetic changes
    'general': 0.5,                // Default
};

// ─── CalibratedAutonomy ─────────────────────────────────

export class CalibratedAutonomy {
    private thresholds: Map<string, AutonomyThreshold> = new Map();
    private corrections: CorrectionRecord[] = [];
    private globalAutonomyModifier: number = 0; // -0.3 to +0.3

    constructor() {
        // Initialize with defaults
        for (const [taskType, level] of Object.entries(DEFAULT_TASK_AUTONOMY)) {
            this.thresholds.set(taskType, {
                taskType,
                autonomyLevel: level,
                validationRequired: this.levelToValidation(level),
                successCount: 0,
                correctionCount: 0,
                lastUpdated: new Date(),
            });
        }
    }

    /**
     * Evaluate whether the agent can act autonomously for a given task.
     */
    evaluate(taskType: string, riskLevel?: 'low' | 'medium' | 'high'): AutonomyDecision {
        const threshold = this.getThreshold(taskType);
        let adjustedLevel = threshold.autonomyLevel + this.globalAutonomyModifier;

        // Risk adjustment
        if (riskLevel === 'high') adjustedLevel -= 0.2;
        else if (riskLevel === 'low') adjustedLevel += 0.1;

        adjustedLevel = Math.max(MIN_AUTONOMY, Math.min(MAX_AUTONOMY, adjustedLevel));

        const validationRequired = this.levelToValidation(adjustedLevel);
        const canActAutonomously = validationRequired === 'none' || validationRequired === 'inform';

        // Confidence based on sample size
        const sampleSize = threshold.successCount + threshold.correctionCount;
        const confidence = sampleSize >= 10 ? 0.9 : sampleSize >= 5 ? 0.7 : 0.5;

        const reasoning = this.buildReasoning(taskType, adjustedLevel, threshold, riskLevel);

        return {
            canActAutonomously,
            validationRequired,
            confidence,
            reasoning,
        };
    }

    /**
     * Record a successful autonomous action (increases autonomy).
     */
    recordSuccess(taskType: string): void {
        const threshold = this.getThreshold(taskType);
        threshold.successCount++;
        threshold.autonomyLevel = Math.min(MAX_AUTONOMY,
            threshold.autonomyLevel + AUTONOMY_INCREASE_STEP);
        threshold.validationRequired = this.levelToValidation(threshold.autonomyLevel);
        threshold.lastUpdated = new Date();
    }

    /**
     * Record a correction from the user (decreases autonomy).
     */
    recordCorrection(correction: CorrectionRecord): void {
        const threshold = this.getThreshold(correction.taskType);
        threshold.correctionCount++;

        // Decrease autonomy — corrections weigh more than successes
        const penalty = correction.correctionType === 'reject' ? AUTONOMY_DECREASE_STEP * 2
            : correction.correctionType === 'undo' ? AUTONOMY_DECREASE_STEP * 1.5
            : AUTONOMY_DECREASE_STEP;

        threshold.autonomyLevel = Math.max(MIN_AUTONOMY, threshold.autonomyLevel - penalty);
        threshold.validationRequired = this.levelToValidation(threshold.autonomyLevel);
        threshold.lastUpdated = new Date();

        this.corrections.push(correction);

        // If many corrections recently, reduce global autonomy
        const recentCorrections = this.corrections.filter(
            c => Date.now() - c.timestamp.getTime() < 24 * 60 * 60 * 1000
        ).length;

        if (recentCorrections >= 3) {
            this.globalAutonomyModifier = Math.max(-0.3,
                this.globalAutonomyModifier - 0.05);
        }

        // Keep corrections manageable
        if (this.corrections.length > 200) {
            this.corrections = this.corrections.slice(-100);
        }
    }

    /**
     * Get all autonomy thresholds.
     */
    getThresholds(): AutonomyThreshold[] {
        return Array.from(this.thresholds.values());
    }

    /**
     * Get autonomy report for transparency.
     */
    getAutonomyReport(): string {
        const lines: string[] = ['## Autonomy Calibration'];

        const sorted = this.getThresholds().sort((a, b) => b.autonomyLevel - a.autonomyLevel);
        for (const t of sorted) {
            const bar = '█'.repeat(Math.round(t.autonomyLevel * 10)) + '░'.repeat(10 - Math.round(t.autonomyLevel * 10));
            lines.push(`${t.taskType}: [${bar}] ${(t.autonomyLevel * 100).toFixed(0)}% (${t.validationRequired})`);
        }

        if (this.globalAutonomyModifier !== 0) {
            lines.push(`\nGlobal modifier: ${this.globalAutonomyModifier > 0 ? '+' : ''}${(this.globalAutonomyModifier * 100).toFixed(0)}%`);
        }

        return lines.join('\n');
    }

    /**
     * Generate a prompt section for autonomy guidance.
     */
    toPromptSection(currentTaskType?: string): string | null {
        if (!currentTaskType) return null;

        const decision = this.evaluate(currentTaskType);

        // Only inject when there's a restriction
        if (decision.validationRequired === 'none') return null;

        const lines: string[] = ['## Autonomy Guidelines'];
        lines.push(`**Task type:** ${currentTaskType}`);
        lines.push(`**Validation required:** ${decision.validationRequired}`);
        lines.push(`**Reasoning:** ${decision.reasoning}`);

        if (decision.validationRequired === 'confirm') {
            lines.push('**Action:** Present your plan and ask for confirmation before proceeding.');
        } else if (decision.validationRequired === 'supervise') {
            lines.push('**Action:** Present options and let the user decide. Do not act independently.');
        }

        return lines.join('\n');
    }

    // ── Private Methods ─────────────────────────────────────

    private getThreshold(taskType: string): AutonomyThreshold {
        if (!this.thresholds.has(taskType)) {
            this.thresholds.set(taskType, {
                taskType,
                autonomyLevel: DEFAULT_TASK_AUTONOMY[taskType] ?? DEFAULT_AUTONOMY_LEVEL,
                validationRequired: this.levelToValidation(DEFAULT_TASK_AUTONOMY[taskType] ?? DEFAULT_AUTONOMY_LEVEL),
                successCount: 0,
                correctionCount: 0,
                lastUpdated: new Date(),
            });
        }
        return this.thresholds.get(taskType)!;
    }

    private levelToValidation(level: number): ValidationLevel {
        if (level >= 0.8) return 'none';
        if (level >= 0.6) return 'inform';
        if (level >= 0.35) return 'confirm';
        return 'supervise';
    }

    private buildReasoning(
        taskType: string,
        level: number,
        threshold: AutonomyThreshold,
        riskLevel?: string,
    ): string {
        const parts: string[] = [];

        parts.push(`Autonomy for ${taskType}: ${(level * 100).toFixed(0)}%`);

        if (threshold.successCount > 0 || threshold.correctionCount > 0) {
            parts.push(`History: ${threshold.successCount} successes, ${threshold.correctionCount} corrections`);
        }

        if (riskLevel === 'high') {
            parts.push('Risk level high — extra caution applied');
        }

        if (this.globalAutonomyModifier < -0.1) {
            parts.push('Recent corrections reduced global autonomy');
        }

        return parts.join('. ') + '.';
    }
}
