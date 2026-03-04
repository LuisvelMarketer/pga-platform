/**
 * PersonalNarrative — Agent-User Relationship Memory
 *
 * Tracks the evolving relationship between agent and user:
 * significant shared moments, achievements, and relationship stage.
 * Enables agents to reference history naturally and build trust.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

// ─── Types ──────────────────────────────────────────────

export type RelationshipStage = 'new' | 'familiar' | 'trusted' | 'partner';

export interface SignificantMoment {
    id: string;
    type: 'breakthrough' | 'milestone' | 'challenge-overcome' | 'learning' | 'collaboration';
    description: string;
    topic: string;
    impact: number;   // 0-1: how significant was this
    timestamp: Date;
}

export interface SharedAchievement {
    id: string;
    title: string;
    description: string;
    category: string;
    celebratedAt: Date;
}

export interface NarrativeSummary {
    relationshipStage: RelationshipStage;
    interactionCount: number;
    daysTogether: number;
    significantMoments: SignificantMoment[];
    sharedAchievements: SharedAchievement[];
    topTopics: Array<{ topic: string; count: number }>;
}

// ─── Constants ──────────────────────────────────────────

const MAX_MOMENTS = 50;
const MAX_ACHIEVEMENTS = 30;
const STAGE_THRESHOLDS = {
    familiar: 10,    // After 10 interactions
    trusted: 50,     // After 50 interactions
    partner: 200,    // After 200 interactions
};

// ─── PersonalNarrative ──────────────────────────────────

export class PersonalNarrative {
    private moments: SignificantMoment[] = [];
    private achievements: SharedAchievement[] = [];
    private topicHistory: Map<string, number> = new Map();
    private interactionCount: number = 0;
    private firstInteraction: Date = new Date();

    /**
     * Record an interaction and potentially create a significant moment.
     */
    recordInteraction(data: {
        topic?: string;
        wasSuccessful: boolean;
        wasComplex?: boolean;
        userExpressedGratitude?: boolean;
        breakthroughAchieved?: boolean;
    }): void {
        this.interactionCount++;

        // Track topics
        if (data.topic) {
            this.topicHistory.set(data.topic, (this.topicHistory.get(data.topic) || 0) + 1);
        }

        // Detect significant moments
        if (data.breakthroughAchieved) {
            this.addMoment({
                type: 'breakthrough',
                description: `Solved a complex ${data.topic || 'task'} together`,
                topic: data.topic || 'general',
                impact: 0.9,
            });
        }

        if (data.wasComplex && data.wasSuccessful) {
            this.addMoment({
                type: 'challenge-overcome',
                description: `Successfully handled a complex ${data.topic || 'challenge'}`,
                topic: data.topic || 'general',
                impact: 0.7,
            });
        }

        if (data.userExpressedGratitude) {
            this.addMoment({
                type: 'collaboration',
                description: `Positive collaboration on ${data.topic || 'a task'}`,
                topic: data.topic || 'general',
                impact: 0.5,
            });
        }

        // Check for milestone achievements
        this.checkMilestones();
    }

    /**
     * Find a relevant callback to past interactions based on topic.
     */
    callbackToHistory(topic: string): SignificantMoment | null {
        const lower = topic.toLowerCase();
        const matching = this.moments.filter(m =>
            m.topic.toLowerCase().includes(lower) || lower.includes(m.topic.toLowerCase())
        );

        if (matching.length === 0) return null;

        // Return most impactful relevant moment
        return matching.sort((a, b) => b.impact - a.impact)[0];
    }

    /**
     * Get current relationship stage based on interaction history.
     */
    getRelationshipStage(): RelationshipStage {
        if (this.interactionCount >= STAGE_THRESHOLDS.partner) return 'partner';
        if (this.interactionCount >= STAGE_THRESHOLDS.trusted) return 'trusted';
        if (this.interactionCount >= STAGE_THRESHOLDS.familiar) return 'familiar';
        return 'new';
    }

    /**
     * Get narrative summary.
     */
    getSummary(): NarrativeSummary {
        const topTopics = Array.from(this.topicHistory.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([topic, count]) => ({ topic, count }));

        return {
            relationshipStage: this.getRelationshipStage(),
            interactionCount: this.interactionCount,
            daysTogether: Math.ceil((Date.now() - this.firstInteraction.getTime()) / (1000 * 60 * 60 * 24)),
            significantMoments: [...this.moments].sort((a, b) => b.impact - a.impact),
            sharedAchievements: [...this.achievements],
            topTopics,
        };
    }

    /**
     * Get significant moments.
     */
    getMoments(): SignificantMoment[] {
        return [...this.moments];
    }

    /**
     * Get shared achievements.
     */
    getAchievements(): SharedAchievement[] {
        return [...this.achievements];
    }

    /**
     * Generate a prompt section with narrative context.
     */
    toPromptSection(): string | null {
        const stage = this.getRelationshipStage();

        // Only inject after building some history
        if (stage === 'new' && this.moments.length === 0) {
            return null;
        }

        const lines: string[] = ['## Relationship Context'];

        lines.push(`**Relationship stage:** ${stage} (${this.interactionCount} interactions)`);

        // Include recent significant moments
        const recentMoments = this.moments
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 3);

        if (recentMoments.length > 0) {
            lines.push('**Shared history:**');
            for (const moment of recentMoments) {
                lines.push(`- ${moment.description}`);
            }
        }

        // Include top topics
        const topTopics = Array.from(this.topicHistory.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        if (topTopics.length > 0) {
            lines.push(`**Frequently discussed:** ${topTopics.map(([t]) => t).join(', ')}`);
        }

        // Stage-specific guidance
        switch (stage) {
            case 'familiar':
                lines.push('**Guidance:** You can reference shared experiences naturally. User appreciates consistency.');
                break;
            case 'trusted':
                lines.push('**Guidance:** Deep trust established. Be candid, share honest assessments. Reference past achievements.');
                break;
            case 'partner':
                lines.push('**Guidance:** Strong partnership. Anticipate needs, be proactive, celebrate shared milestones.');
                break;
        }

        return lines.join('\n');
    }

    // ── Private Methods ─────────────────────────────────────

    private addMoment(data: {
        type: SignificantMoment['type'];
        description: string;
        topic: string;
        impact: number;
    }): void {
        // Avoid duplicate moments for same topic within last hour
        const recentSame = this.moments.find(m =>
            m.topic === data.topic &&
            m.type === data.type &&
            Date.now() - m.timestamp.getTime() < 60 * 60 * 1000
        );
        if (recentSame) return;

        const moment: SignificantMoment = {
            id: `moment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            ...data,
            timestamp: new Date(),
        };

        this.moments.push(moment);

        // Enforce max — keep highest impact
        if (this.moments.length > MAX_MOMENTS) {
            this.moments.sort((a, b) => b.impact - a.impact);
            this.moments = this.moments.slice(0, MAX_MOMENTS);
        }
    }

    private addAchievement(title: string, description: string, category: string): void {
        // Avoid duplicate achievements
        if (this.achievements.some(a => a.title === title)) return;

        this.achievements.push({
            id: `achievement_${Date.now()}`,
            title,
            description,
            category,
            celebratedAt: new Date(),
        });

        // Enforce max
        if (this.achievements.length > MAX_ACHIEVEMENTS) {
            this.achievements = this.achievements.slice(-MAX_ACHIEVEMENTS);
        }
    }

    private checkMilestones(): void {
        // First interaction milestone
        if (this.interactionCount === 1) {
            this.addMoment({
                type: 'milestone',
                description: 'First interaction together',
                topic: 'general',
                impact: 0.3,
            });
        }

        // Stage transitions
        if (this.interactionCount === STAGE_THRESHOLDS.familiar) {
            this.addAchievement(
                'Familiar Ground',
                'Reached familiar relationship stage after 10 interactions',
                'relationship',
            );
        }

        if (this.interactionCount === STAGE_THRESHOLDS.trusted) {
            this.addAchievement(
                'Trust Earned',
                'Reached trusted relationship stage after 50 interactions',
                'relationship',
            );
        }

        if (this.interactionCount === STAGE_THRESHOLDS.partner) {
            this.addAchievement(
                'True Partners',
                'Reached partner relationship stage after 200 interactions',
                'relationship',
            );
        }

        // Topic mastery achievements
        for (const [topic, count] of this.topicHistory) {
            if (count === 20) {
                this.addAchievement(
                    `${topic} Expert`,
                    `Completed 20 ${topic} tasks together`,
                    'expertise',
                );
            }
        }
    }
}
