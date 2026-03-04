/**
 * PatternMemory — Predictive Behavioral Pattern Extraction
 *
 * Tracks interaction patterns and builds predictions about
 * likely next actions, enabling proactive agent behavior.
 *
 * Pattern types:
 * - Task sequences: "user does X then Y"
 * - Error recovery: "user retries this task type"
 * - Tool preferences: "user prefers tool A for task B"
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

export interface BehavioralPattern {
    id: string;
    type: 'task-sequence' | 'error-recovery' | 'tool-preference';
    description: string;
    frequency: number;
    confidence: number;
    lastSeen: Date;
    prediction?: string;
}

interface InteractionRecord {
    taskType?: string;
    success: boolean;
    toolsUsed?: string[];
    timestamp: Date;
}

const MIN_FREQUENCY_FOR_PATTERN = 3;
const MIN_CONFIDENCE_THRESHOLD = 0.5;

export class PatternMemory {
    private patterns: Map<string, BehavioralPattern> = new Map();
    private recentInteractions: InteractionRecord[] = [];
    private sequenceCounts: Map<string, number> = new Map();
    private taskFailCounts: Map<string, number> = new Map();
    private toolUsageCounts: Map<string, Map<string, number>> = new Map();
    private totalInteractions: number = 0;

    constructor(private maxPatterns: number = 50) {}

    /**
     * Record an interaction and extract/update patterns.
     */
    recordInteraction(data: InteractionRecord): void {
        this.totalInteractions++;
        this.recentInteractions.push(data);

        // Keep window manageable
        if (this.recentInteractions.length > 200) {
            this.recentInteractions = this.recentInteractions.slice(-100);
        }

        // Extract task sequence patterns
        if (data.taskType) {
            this.trackTaskSequence(data.taskType);
        }

        // Track error recovery patterns
        if (!data.success && data.taskType) {
            this.trackErrorRecovery(data.taskType);
        } else if (data.success && data.taskType) {
            // Reset fail count on success
            this.taskFailCounts.delete(data.taskType);
        }

        // Track tool preferences
        if (data.taskType && data.toolsUsed && data.toolsUsed.length > 0) {
            this.trackToolPreference(data.taskType, data.toolsUsed);
        }

        // Rebuild patterns periodically
        if (this.totalInteractions % 5 === 0) {
            this.rebuildPatterns();
        }
    }

    /**
     * Get predictions based on current patterns.
     */
    getPredictions(): Array<{ prediction: string; confidence: number }> {
        const predictions: Array<{ prediction: string; confidence: number }> = [];

        // Find sequence predictions based on last task
        const lastInteraction = this.recentInteractions[this.recentInteractions.length - 1];
        if (lastInteraction?.taskType) {
            for (const [, pattern] of this.patterns) {
                if (pattern.type === 'task-sequence' && pattern.prediction &&
                    pattern.description.startsWith(lastInteraction.taskType)) {
                    predictions.push({
                        prediction: pattern.prediction,
                        confidence: pattern.confidence,
                    });
                }
            }
        }

        // Sort by confidence descending
        return predictions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Get all active patterns sorted by confidence.
     */
    getPatterns(): BehavioralPattern[] {
        return Array.from(this.patterns.values())
            .sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Generate a prompt section with pattern-based context.
     * Only generates output when patterns have high confidence.
     */
    toPromptSection(): string | null {
        const predictions = this.getPredictions();
        const highConfidence = predictions.filter(p => p.confidence >= 0.6);

        if (highConfidence.length === 0) {
            return null;
        }

        const lines: string[] = ['## Behavioral Patterns'];
        lines.push('Based on observed interaction patterns:');

        for (const pred of highConfidence.slice(0, 3)) {
            lines.push(`- ${pred.prediction} (confidence: ${(pred.confidence * 100).toFixed(0)}%)`);
        }

        return lines.join('\n');
    }

    // ── Private: Pattern Extraction ────────────────────────

    private trackTaskSequence(taskType: string): void {
        // Look at the previous task to form a sequence
        const prevIndex = this.recentInteractions.length - 2;
        if (prevIndex < 0) return;

        const prevTask = this.recentInteractions[prevIndex].taskType;
        if (!prevTask) return;

        const key = `${prevTask}→${taskType}`;
        this.sequenceCounts.set(key, (this.sequenceCounts.get(key) || 0) + 1);
    }

    private trackErrorRecovery(taskType: string): void {
        const count = (this.taskFailCounts.get(taskType) || 0) + 1;
        this.taskFailCounts.set(taskType, count);
    }

    private trackToolPreference(taskType: string, tools: string[]): void {
        if (!this.toolUsageCounts.has(taskType)) {
            this.toolUsageCounts.set(taskType, new Map());
        }
        const toolCounts = this.toolUsageCounts.get(taskType)!;
        for (const tool of tools) {
            toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
        }
    }

    private rebuildPatterns(): void {
        // Clear and rebuild from counts
        this.patterns.clear();

        // Task sequence patterns
        for (const [key, count] of this.sequenceCounts) {
            if (count < MIN_FREQUENCY_FOR_PATTERN) continue;

            const [fromTask, toTask] = key.split('→');
            const confidence = Math.min(count / 10, 1.0);

            if (confidence < MIN_CONFIDENCE_THRESHOLD) continue;

            const id = `seq_${key}`;
            this.patterns.set(id, {
                id,
                type: 'task-sequence',
                description: `${fromTask} → ${toTask}`,
                frequency: count,
                confidence,
                lastSeen: new Date(),
                prediction: `User likely needs ${toTask} next`,
            });
        }

        // Error recovery patterns
        for (const [taskType, failCount] of this.taskFailCounts) {
            if (failCount < MIN_FREQUENCY_FOR_PATTERN) continue;

            const confidence = Math.min(failCount / 5, 1.0);
            if (confidence < MIN_CONFIDENCE_THRESHOLD) continue;

            const id = `err_${taskType}`;
            this.patterns.set(id, {
                id,
                type: 'error-recovery',
                description: `${taskType} frequently fails`,
                frequency: failCount,
                confidence,
                lastSeen: new Date(),
                prediction: `Consider alternative approach for ${taskType}`,
            });
        }

        // Tool preference patterns
        for (const [taskType, toolCounts] of this.toolUsageCounts) {
            const entries = Array.from(toolCounts.entries())
                .sort((a, b) => b[1] - a[1]);

            if (entries.length === 0) continue;

            const [topTool, topCount] = entries[0];
            if (topCount < MIN_FREQUENCY_FOR_PATTERN) continue;

            const totalUse = entries.reduce((sum, [, c]) => sum + c, 0);
            const confidence = topCount / totalUse;

            if (confidence < MIN_CONFIDENCE_THRESHOLD) continue;

            const id = `tool_${taskType}_${topTool}`;
            this.patterns.set(id, {
                id,
                type: 'tool-preference',
                description: `Prefers ${topTool} for ${taskType}`,
                frequency: topCount,
                confidence,
                lastSeen: new Date(),
            });
        }

        // Enforce maxPatterns limit — keep highest confidence
        if (this.patterns.size > this.maxPatterns) {
            const sorted = Array.from(this.patterns.entries())
                .sort((a, b) => b[1].confidence - a[1].confidence);

            this.patterns.clear();
            for (const [key, pattern] of sorted.slice(0, this.maxPatterns)) {
                this.patterns.set(key, pattern);
            }
        }
    }
}
