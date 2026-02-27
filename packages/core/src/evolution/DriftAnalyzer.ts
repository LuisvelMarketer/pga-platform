/**
 * Drift Analyzer - Proactive Performance Monitoring
 *
 * Detects when a genome is "drifting" away from optimal performance
 * BEFORE user feedback, enabling proactive mutation.
 *
 * Key Signals:
 * - Success rate decline
 * - Token usage increase
 * - Latency increase
 * - Cost per success increase
 * - Human intervention increase
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0
 */

import type { FitnessVector } from '../types/GenomeV2.js';

// ─── Drift Detection Config ─────────────────────────────────

export interface DriftAnalyzerConfig {
    // Detection thresholds (percentage drops that trigger drift alert)
    successRateThreshold: number; // Default: 0.10 (10% drop)
    tokenEfficiencyThreshold: number; // Default: 0.15 (15% worse)
    latencyThreshold: number; // Default: 0.20 (20% slower)
    costThreshold: number; // Default: 0.25 (25% more expensive)
    interventionThreshold: number; // Default: 0.10 (10% more corrections)

    // Time window for comparison
    comparisonWindow: number; // Default: 100 (last 100 interactions)
    baselineWindow: number; // Default: 500 (historical baseline)

    // Sensitivity
    minSampleSize: number; // Default: 20 (need at least 20 samples)
    confidenceThreshold: number; // Default: 0.80 (80% confidence)
}

// ─── Drift Signal Types ─────────────────────────────────────

export interface DriftSignal {
    type: DriftType;
    severity: DriftSeverity;
    metric: string;
    currentValue: number;
    baselineValue: number;
    percentageChange: number;
    confidence: number;
    timestamp: Date;
    recommendation: string;
}

export type DriftType =
    | 'quality-decline'
    | 'efficiency-decline'
    | 'cost-increase'
    | 'intervention-increase'
    | 'latency-increase'
    | 'success-rate-decline';

export type DriftSeverity = 'minor' | 'moderate' | 'severe' | 'critical';

export interface DriftAnalysis {
    isDrifting: boolean;
    overallSeverity: DriftSeverity;
    signals: DriftSignal[];
    recommendedActions: string[];
    confidence: number;
    timestamp: Date;
}

// ─── Fitness History Point ──────────────────────────────────

interface FitnessHistoryPoint {
    timestamp: Date;
    fitness: FitnessVector;
}

// ─── Drift Analyzer ─────────────────────────────────────────

/**
 * DriftAnalyzer - Detects performance degradation proactively
 *
 * Monitors fitness metrics over time and alerts when drift detected.
 */
export class DriftAnalyzer {
    private config: Required<DriftAnalyzerConfig>;
    private history: FitnessHistoryPoint[] = [];
    private maxHistorySize = 1000;

    constructor(config: Partial<DriftAnalyzerConfig> = {}) {
        this.config = {
            successRateThreshold: config.successRateThreshold ?? 0.1,
            tokenEfficiencyThreshold: config.tokenEfficiencyThreshold ?? 0.15,
            latencyThreshold: config.latencyThreshold ?? 0.2,
            costThreshold: config.costThreshold ?? 0.25,
            interventionThreshold: config.interventionThreshold ?? 0.1,
            comparisonWindow: config.comparisonWindow ?? 100,
            baselineWindow: config.baselineWindow ?? 500,
            minSampleSize: config.minSampleSize ?? 20,
            confidenceThreshold: config.confidenceThreshold ?? 0.8,
        };
    }

    // ─── Record Fitness ──────────────────────────────────────────

    /**
     * Record fitness measurement
     *
     * Call this after every interaction to build history.
     */
    public recordFitness(fitness: FitnessVector): void {
        this.history.push({
            timestamp: new Date(),
            fitness: { ...fitness }, // Deep copy
        });

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift(); // Remove oldest
        }
    }

    // ─── Analyze Drift ───────────────────────────────────────────

    /**
     * Analyze current performance for drift
     *
     * Compares recent performance to historical baseline.
     */
    public analyzeDrift(): DriftAnalysis {
        // Not enough data
        if (this.history.length < this.config.minSampleSize) {
            return {
                isDrifting: false,
                overallSeverity: 'minor',
                signals: [],
                recommendedActions: ['Collect more data (need at least 20 samples)'],
                confidence: 0,
                timestamp: new Date(),
            };
        }

        // Get recent and baseline windows
        const recent = this.getRecentWindow();
        const baseline = this.getBaselineWindow();

        // Compute averages
        const recentAvg = this.computeAverageFitness(recent);
        const baselineAvg = this.computeAverageFitness(baseline);

        // Detect signals
        const signals: DriftSignal[] = [];

        // Check each metric
        signals.push(
            ...this.checkSuccessRateDrift(recentAvg, baselineAvg),
            ...this.checkTokenEfficiencyDrift(recentAvg, baselineAvg),
            ...this.checkLatencyDrift(recentAvg, baselineAvg),
            ...this.checkCostDrift(recentAvg, baselineAvg),
            ...this.checkInterventionDrift(recentAvg, baselineAvg)
        );

        // Filter by confidence
        const significantSignals = signals.filter(
            (s) => s.confidence >= this.config.confidenceThreshold
        );

        // Compute overall severity
        const overallSeverity = this.computeOverallSeverity(significantSignals);

        // Generate recommendations
        const recommendedActions = this.generateRecommendations(significantSignals);

        // Compute overall confidence
        const confidence =
            significantSignals.length > 0
                ? significantSignals.reduce((sum, s) => sum + s.confidence, 0) /
                  significantSignals.length
                : 0;

        return {
            isDrifting: significantSignals.length > 0,
            overallSeverity,
            signals: significantSignals,
            recommendedActions,
            confidence,
            timestamp: new Date(),
        };
    }

    // ─── Drift Detection per Metric ──────────────────────────────

    private checkSuccessRateDrift(
        recent: FitnessVector,
        baseline: FitnessVector
    ): DriftSignal[] {
        const drop = baseline.successRate - recent.successRate;
        const percentageChange = (drop / baseline.successRate) * 100;

        if (drop > this.config.successRateThreshold) {
            return [
                {
                    type: 'success-rate-decline',
                    severity: this.computeSeverity(percentageChange),
                    metric: 'successRate',
                    currentValue: recent.successRate,
                    baselineValue: baseline.successRate,
                    percentageChange,
                    confidence: this.computeConfidence(recent.sampleSize, baseline.sampleSize),
                    timestamp: new Date(),
                    recommendation:
                        'Success rate declining. Consider reinforcing successful patterns or ' +
                        'rolling back recent mutations.',
                },
            ];
        }

        return [];
    }

    private checkTokenEfficiencyDrift(
        recent: FitnessVector,
        baseline: FitnessVector
    ): DriftSignal[] {
        const drop = baseline.tokenEfficiency - recent.tokenEfficiency;
        const percentageChange = (drop / baseline.tokenEfficiency) * 100;

        if (drop > this.config.tokenEfficiencyThreshold) {
            return [
                {
                    type: 'efficiency-decline',
                    severity: this.computeSeverity(percentageChange),
                    metric: 'tokenEfficiency',
                    currentValue: recent.tokenEfficiency,
                    baselineValue: baseline.tokenEfficiency,
                    percentageChange,
                    confidence: this.computeConfidence(recent.sampleSize, baseline.sampleSize),
                    timestamp: new Date(),
                    recommendation:
                        'Token usage increasing. Apply compress_instructions mutation ' +
                        'or reorder_constraints to improve efficiency.',
                },
            ];
        }

        return [];
    }

    private checkLatencyDrift(
        recent: FitnessVector,
        baseline: FitnessVector
    ): DriftSignal[] {
        const increase = recent.latency - baseline.latency;
        const percentageChange = (increase / baseline.latency) * 100;

        if (increase / baseline.latency > this.config.latencyThreshold) {
            return [
                {
                    type: 'latency-increase',
                    severity: this.computeSeverity(percentageChange),
                    metric: 'latency',
                    currentValue: recent.latency,
                    baselineValue: baseline.latency,
                    percentageChange,
                    confidence: this.computeConfidence(recent.sampleSize, baseline.sampleSize),
                    timestamp: new Date(),
                    recommendation:
                        'Response time increasing. Check for bloated prompts or ' +
                        'inefficient tool usage patterns.',
                },
            ];
        }

        return [];
    }

    private checkCostDrift(recent: FitnessVector, baseline: FitnessVector): DriftSignal[] {
        const increase = recent.costPerSuccess - baseline.costPerSuccess;
        const percentageChange = (increase / baseline.costPerSuccess) * 100;

        if (increase / baseline.costPerSuccess > this.config.costThreshold) {
            return [
                {
                    type: 'cost-increase',
                    severity: this.computeSeverity(percentageChange),
                    metric: 'costPerSuccess',
                    currentValue: recent.costPerSuccess,
                    baselineValue: baseline.costPerSuccess,
                    percentageChange,
                    confidence: this.computeConfidence(recent.sampleSize, baseline.sampleSize),
                    timestamp: new Date(),
                    recommendation:
                        'Cost per success increasing. Apply cognitive compression ' +
                        'mutations to reduce token usage.',
                },
            ];
        }

        return [];
    }

    private checkInterventionDrift(
        recent: FitnessVector,
        baseline: FitnessVector
    ): DriftSignal[] {
        const increase = recent.interventionRate - baseline.interventionRate;
        const percentageChange = (increase / (baseline.interventionRate || 0.01)) * 100;

        if (increase > this.config.interventionThreshold) {
            return [
                {
                    type: 'intervention-increase',
                    severity: this.computeSeverity(percentageChange),
                    metric: 'interventionRate',
                    currentValue: recent.interventionRate,
                    baselineValue: baseline.interventionRate,
                    percentageChange,
                    confidence: this.computeConfidence(recent.sampleSize, baseline.sampleSize),
                    timestamp: new Date(),
                    recommendation:
                        'More human corrections needed. Quality may be declining. ' +
                        'Consider safety_reinforcement mutation.',
                },
            ];
        }

        return [];
    }

    // ─── Helper Methods ──────────────────────────────────────────

    private getRecentWindow(): FitnessHistoryPoint[] {
        return this.history.slice(-this.config.comparisonWindow);
    }

    private getBaselineWindow(): FitnessHistoryPoint[] {
        if (this.history.length <= this.config.comparisonWindow) {
            return this.history; // Use all data as baseline
        }

        // Use data before recent window
        const startIdx = Math.max(
            0,
            this.history.length - this.config.comparisonWindow - this.config.baselineWindow
        );
        const endIdx = this.history.length - this.config.comparisonWindow;

        return this.history.slice(startIdx, endIdx);
    }

    private computeAverageFitness(points: FitnessHistoryPoint[]): FitnessVector {
        if (points.length === 0) {
            return this.createZeroFitness();
        }

        const sum = points.reduce(
            (acc, point) => ({
                quality: acc.quality + point.fitness.quality,
                successRate: acc.successRate + point.fitness.successRate,
                tokenEfficiency: acc.tokenEfficiency + point.fitness.tokenEfficiency,
                latency: acc.latency + point.fitness.latency,
                costPerSuccess: acc.costPerSuccess + point.fitness.costPerSuccess,
                interventionRate: acc.interventionRate + point.fitness.interventionRate,
                composite: acc.composite + point.fitness.composite,
            }),
            {
                quality: 0,
                successRate: 0,
                tokenEfficiency: 0,
                latency: 0,
                costPerSuccess: 0,
                interventionRate: 0,
                composite: 0,
            }
        );

        const n = points.length;

        return {
            quality: sum.quality / n,
            successRate: sum.successRate / n,
            tokenEfficiency: sum.tokenEfficiency / n,
            latency: sum.latency / n,
            costPerSuccess: sum.costPerSuccess / n,
            interventionRate: sum.interventionRate / n,
            composite: sum.composite / n,
            sampleSize: n,
            lastUpdated: new Date(),
            confidence: this.computeConfidence(n, n),
        };
    }

    private createZeroFitness(): FitnessVector {
        return {
            quality: 0,
            successRate: 0,
            tokenEfficiency: 0,
            latency: 0,
            costPerSuccess: 0,
            interventionRate: 0,
            composite: 0,
            sampleSize: 0,
            lastUpdated: new Date(),
            confidence: 0,
        };
    }

    private computeSeverity(percentageChange: number): DriftSeverity {
        const absChange = Math.abs(percentageChange);

        if (absChange >= 50) return 'critical';
        if (absChange >= 30) return 'severe';
        if (absChange >= 15) return 'moderate';
        return 'minor';
    }

    private computeConfidence(recentSize: number, baselineSize: number): number {
        // Confidence based on sample sizes
        const minSize = Math.min(recentSize, baselineSize);

        if (minSize < 10) return 0.5;
        if (minSize < 20) return 0.6;
        if (minSize < 50) return 0.7;
        if (minSize < 100) return 0.8;
        if (minSize < 200) return 0.9;
        return 0.95;
    }

    private computeOverallSeverity(signals: DriftSignal[]): DriftSeverity {
        if (signals.length === 0) return 'minor';

        const severities = signals.map((s) => s.severity);

        if (severities.includes('critical')) return 'critical';
        if (severities.includes('severe')) return 'severe';
        if (severities.includes('moderate')) return 'moderate';
        return 'minor';
    }

    private generateRecommendations(signals: DriftSignal[]): string[] {
        const recommendations: string[] = [];

        // Extract unique recommendations
        const uniqueRecs = new Set(signals.map((s) => s.recommendation));
        recommendations.push(...uniqueRecs);

        // Add general recommendations
        if (signals.length > 2) {
            recommendations.push(
                'Multiple metrics drifting. Consider full genome evaluation and possible rollback.'
            );
        }

        if (signals.some((s) => s.severity === 'critical')) {
            recommendations.push('CRITICAL: Immediate action required. Consider emergency rollback.');
        }

        return recommendations;
    }

    // ─── Getters ─────────────────────────────────────────────────

    public getHistory(): FitnessHistoryPoint[] {
        return [...this.history];
    }

    public getHistorySize(): number {
        return this.history.length;
    }

    public clearHistory(): void {
        this.history = [];
    }
}
