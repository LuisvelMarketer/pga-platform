/**
 * LearningAnnouncer — Real-time Learning Feedback
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Makes learning VISIBLE to the user.
 * The agent announces when it:
 * - Learns a new preference
 * - Detects a pattern
 * - Improves its understanding
 * - Adapts its behavior
 *
 * This builds TRUST - users see the agent evolving in real-time.
 */

import type { UserDNA } from '../types/index.js';

export interface LearningEvent {
    type: 'preference' | 'pattern' | 'adaptation' | 'improvement';
    category: string;
    whatLearned: string;
    howItHelps: string;
    confidence: number;
    timestamp: Date;
}

export class LearningAnnouncer {
    /**
     * Detect what the agent learned from DNA changes
     */
    detectLearning(previousDNA: UserDNA | null, currentDNA: UserDNA): LearningEvent[] {
        const events: LearningEvent[] = [];

        if (!previousDNA) {
            // First interaction
            events.push({
                type: 'preference',
                category: 'initialization',
                whatLearned: 'Started building your cognitive profile',
                howItHelps: 'I\'ll adapt to your unique style and preferences',
                confidence: 1.0,
                timestamp: new Date(),
            });
            return events;
        }

        // Communication style changed
        if (previousDNA.traits.communicationStyle !== currentDNA.traits.communicationStyle) {
            events.push({
                type: 'preference',
                category: 'communication',
                whatLearned: `You prefer ${currentDNA.traits.communicationStyle} communication`,
                howItHelps: 'I\'ll match this style in my responses',
                confidence: 0.8,
                timestamp: new Date(),
            });
        }

        // Verbosity changed
        if (previousDNA.traits.verbosity !== currentDNA.traits.verbosity) {
            events.push({
                type: 'preference',
                category: 'communication',
                whatLearned: `You prefer ${currentDNA.traits.verbosity} responses`,
                howItHelps: 'I\'ll adjust my response length accordingly',
                confidence: 0.8,
                timestamp: new Date(),
            });
        }

        // New tools detected
        const newTools = currentDNA.traits.preferredTools.filter(
            tool => !previousDNA.traits.preferredTools.includes(tool),
        );

        if (newTools.length > 0) {
            events.push({
                type: 'pattern',
                category: 'tools',
                whatLearned: `You frequently use: ${newTools.join(', ')}`,
                howItHelps: 'I\'ll prioritize these tools in my suggestions',
                confidence: 0.75,
                timestamp: new Date(),
            });
        }

        // Domain expertise improved
        for (const [domain, expertise] of Object.entries(currentDNA.traits.domainExpertise)) {
            const previousExpertise = previousDNA.traits.domainExpertise[domain] || 0;
            const improvement = expertise - previousExpertise;

            if (improvement >= 0.1) {
                // Significant improvement
                events.push({
                    type: 'improvement',
                    category: 'expertise',
                    whatLearned: `Your ${domain} expertise increased to ${Math.round(expertise * 100)}%`,
                    howItHelps: 'I can now provide more advanced guidance in this area',
                    confidence: 0.9,
                    timestamp: new Date(),
                });
            }
        }

        // Task success rates improved
        for (const [task, successRate] of Object.entries(currentDNA.traits.taskSuccessRates)) {
            const previousRate = previousDNA.traits.taskSuccessRates[task] || 0.5;
            const improvement = successRate - previousRate;

            if (improvement >= 0.15) {
                // Significant improvement
                events.push({
                    type: 'improvement',
                    category: 'performance',
                    whatLearned: `Your success rate for ${task} improved to ${Math.round(successRate * 100)}%`,
                    howItHelps: 'I\'ll suggest more similar tasks to build on this momentum',
                    confidence: 0.85,
                    timestamp: new Date(),
                });
            } else if (improvement <= -0.15) {
                // Performance drop
                events.push({
                    type: 'pattern',
                    category: 'performance',
                    whatLearned: `${task} seems challenging lately (${Math.round(successRate * 100)}% success)`,
                    howItHelps: 'I\'ll provide more detailed explanations for this topic',
                    confidence: 0.8,
                    timestamp: new Date(),
                });
            }
        }

        // Peak productivity hours discovered
        if (currentDNA.traits.peakProductivityHours.length > 0 &&
            previousDNA.traits.peakProductivityHours.length === 0) {
            events.push({
                type: 'pattern',
                category: 'timing',
                whatLearned: `Your peak hours are ${currentDNA.traits.peakProductivityHours.join(', ')}:00`,
                howItHelps: 'I can remind you to tackle complex tasks during these times',
                confidence: 0.7,
                timestamp: new Date(),
            });
        }

        // Adaptation rate changed
        const adaptationChange = currentDNA.traits.adaptationRate - previousDNA.traits.adaptationRate;
        if (Math.abs(adaptationChange) >= 0.2) {
            events.push({
                type: 'adaptation',
                category: 'meta-learning',
                whatLearned: adaptationChange > 0
                    ? 'You\'re becoming more receptive to new approaches'
                    : 'You prefer sticking with proven methods',
                howItHelps: adaptationChange > 0
                    ? 'I\'ll suggest more innovative solutions'
                    : 'I\'ll focus on reliable, tested approaches',
                confidence: 0.75,
                timestamp: new Date(),
            });
        }

        return events;
    }

    /**
     * Format learning announcement for injection into response
     */
    formatLearningAnnouncement(events: LearningEvent[]): string {
        if (events.length === 0) return '';

        const sections: string[] = [];
        sections.push('## 🧬 LEARNING ANNOUNCEMENT\n');

        // Only announce the most significant learning (highest confidence)
        const topEvent = events.sort((a, b) => b.confidence - a.confidence)[0];

        const icon = this.getIcon(topEvent.type);
        sections.push(`${icon} **I just learned something about you:**`);
        sections.push(`   → ${topEvent.whatLearned}`);
        sections.push(`   → How this helps: ${topEvent.howItHelps}`);
        sections.push('');

        if (events.length > 1) {
            sections.push(`_I also learned ${events.length - 1} other thing(s). My understanding of you is evolving!_\n`);
        }

        return sections.join('\n');
    }

    /**
     * Generate a learning summary for user transparency
     */
    generateLearningSummary(dna: UserDNA, recentEvents: LearningEvent[]): string {
        const sections: string[] = [];

        sections.push('# 🧬 Your AI Learning Report\n');
        sections.push(`**Generation**: ${dna.generation} (interactions with this agent)\n`);
        sections.push('---\n');

        // Communication preferences
        sections.push('## 💬 Communication Style\n');
        sections.push(`- **Style**: ${dna.traits.communicationStyle}`);
        sections.push(`- **Verbosity**: ${dna.traits.verbosity}`);
        sections.push(`- **Tone**: ${dna.traits.tone}\n`);

        // Expertise
        if (Object.keys(dna.traits.domainExpertise).length > 0) {
            sections.push('## 🎓 Detected Expertise\n');
            const sorted = Object.entries(dna.traits.domainExpertise)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            for (const [domain, level] of sorted) {
                const percentage = Math.round(level * 100);
                const bar = '█'.repeat(Math.floor(percentage / 10));
                sections.push(`- **${domain}**: ${bar} ${percentage}%`);
            }
            sections.push('');
        }

        // Recent learning
        if (recentEvents.length > 0) {
            sections.push('## 📚 Recent Learning\n');
            for (const event of recentEvents.slice(0, 5)) {
                sections.push(`- ${this.getIcon(event.type)} ${event.whatLearned}`);
            }
            sections.push('');
        }

        // Patterns
        if (dna.traits.peakProductivityHours.length > 0) {
            sections.push('## ⏰ Productivity Patterns\n');
            sections.push(`- **Peak hours**: ${dna.traits.peakProductivityHours.join(', ')}:00`);
            sections.push(`- **Adaptation rate**: ${Math.round(dna.traits.adaptationRate * 100)}%`);
            sections.push(`- **Stability score**: ${Math.round(dna.traits.stabilityScore * 100)}%\n`);
        }

        sections.push('---\n');
        sections.push('_This profile evolves with every interaction. The more we work together, the better I understand you!_ 🚀');

        return sections.join('\n');
    }

    // ─── Helpers ────────────────────────────────────────────

    private getIcon(type: LearningEvent['type']): string {
        const icons = {
            preference: '⚙️',
            pattern: '🔍',
            adaptation: '🔄',
            improvement: '📈',
        };

        return icons[type] || '📌';
    }
}
