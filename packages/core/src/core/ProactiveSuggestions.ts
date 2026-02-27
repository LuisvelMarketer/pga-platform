/**
 * ProactiveSuggestions — Proactive Intelligence Engine
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Makes the agent PROACTIVE instead of just reactive.
 * The agent will:
 * - Anticipate user needs
 * - Suggest improvements
 * - Offer relevant help BEFORE being asked
 * - Detect patterns and warn about potential issues
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { UserDNA } from '../types/index.js';

export interface ProactiveSuggestion {
    type: 'improvement' | 'warning' | 'opportunity' | 'reminder';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    action?: string;
    confidence: number; // 0-1
}

export class ProactiveSuggestions {
    constructor(private storage: StorageAdapter) {}

    /**
     * Generate proactive suggestions based on user context
     */
    async generateSuggestions(
        userId: string,
        genomeId: string,
        currentMessage: string,
    ): Promise<ProactiveSuggestion[]> {
        const suggestions: ProactiveSuggestion[] = [];

        // Get user DNA
        const dna = await this.storage.loadDNA?.(userId, genomeId);
        if (!dna) return [];

        // Get recent interactions
        const interactions = await this.storage.getRecentInteractions?.(genomeId, userId, 20) || [];

        // 1. Detect repeated errors
        const errorSuggestion = this.detectRepeatedErrors(interactions);
        if (errorSuggestion) suggestions.push(errorSuggestion);

        // 2. Suggest optimizations based on patterns
        const optimizationSuggestion = this.suggestOptimizations(interactions, currentMessage);
        if (optimizationSuggestion) suggestions.push(optimizationSuggestion);

        // 3. Detect incomplete tasks
        const incompleteTasks = this.detectIncompleteTasks(interactions);
        suggestions.push(...incompleteTasks);

        // 4. Suggest based on user expertise
        const expertiseSuggestion = this.suggestBasedOnExpertise(dna, currentMessage);
        if (expertiseSuggestion) suggestions.push(expertiseSuggestion);

        // 5. Time-based suggestions
        const timeSuggestion = this.suggestBasedOnTime(dna);
        if (timeSuggestion) suggestions.push(timeSuggestion);

        // 6. Proactive improvements
        const improvements = this.suggestImprovements(currentMessage);
        suggestions.push(...improvements);

        // Sort by priority
        return suggestions.sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a));
    }

    /**
     * Format suggestions into a prompt injection
     */
    formatSuggestionsPrompt(suggestions: ProactiveSuggestion[]): string {
        if (suggestions.length === 0) return '';

        const sections: string[] = [];
        sections.push('## PROACTIVE INTELLIGENCE\n');
        sections.push('Based on my analysis, I have some proactive suggestions:\n');

        // Only show top 3 suggestions
        for (const suggestion of suggestions.slice(0, 3)) {
            const icon = this.getIcon(suggestion.type);
            sections.push(`${icon} **${suggestion.title}** (${suggestion.type}, priority: ${suggestion.priority})`);
            sections.push(`   ${suggestion.description}`);
            if (suggestion.action) {
                sections.push(`   → Suggested action: ${suggestion.action}`);
            }
            sections.push('');
        }

        sections.push('💡 Mention these suggestions naturally if relevant to the conversation.\n');

        return sections.join('\n');
    }

    // ─── Detection Methods ──────────────────────────────────

    private detectRepeatedErrors(interactions: any[]): ProactiveSuggestion | null {
        const errors = new Map<string, number>();

        for (const int of interactions) {
            if (int.userMessage.toLowerCase().includes('error')) {
                const errorType = this.extractErrorType(int.userMessage);
                errors.set(errorType, (errors.get(errorType) || 0) + 1);
            }
        }

        // Find most frequent error
        let maxError = '';
        let maxCount = 0;
        for (const [error, count] of errors.entries()) {
            if (count > maxCount && count >= 2) {
                maxError = error;
                maxCount = count;
            }
        }

        if (maxError && maxCount >= 2) {
            return {
                type: 'warning',
                priority: 'high',
                title: 'Recurring Error Pattern Detected',
                description: `I noticed you've encountered "${maxError}" ${maxCount} times recently. This might indicate a deeper issue.`,
                action: 'Would you like me to help you investigate the root cause?',
                confidence: 0.8,
            };
        }

        return null;
    }

    private suggestOptimizations(interactions: any[], currentMessage: string): ProactiveSuggestion | null {
        const lower = currentMessage.toLowerCase();

        // Detect performance-related queries
        if (lower.includes('slow') || lower.includes('performance') || lower.includes('optimize')) {
            // Check if user frequently deals with performance
            const perfCount = interactions.filter(
                int => int.userMessage.toLowerCase().includes('performance') ||
                       int.userMessage.toLowerCase().includes('slow'),
            ).length;

            if (perfCount >= 2) {
                return {
                    type: 'improvement',
                    priority: 'medium',
                    title: 'Performance Optimization Opportunity',
                    description: 'I see performance is a recurring concern. I can help you establish a systematic performance monitoring approach.',
                    action: 'Set up performance profiling and benchmarking?',
                    confidence: 0.75,
                };
            }
        }

        // Detect code quality patterns
        if (lower.includes('refactor') || lower.includes('clean up') || lower.includes('improve')) {
            return {
                type: 'improvement',
                priority: 'medium',
                title: 'Code Quality Enhancement',
                description: 'I can suggest best practices and patterns for the code you\'re working on.',
                action: 'Run a code quality analysis?',
                confidence: 0.7,
            };
        }

        return null;
    }

    private detectIncompleteTasks(interactions: any[]): ProactiveSuggestion[] {
        const suggestions: ProactiveSuggestion[] = [];

        // Check for unresolved issues in last 5 interactions
        const recent = interactions.slice(0, 5);

        for (const int of recent) {
            const message = int.userMessage.toLowerCase();

            // Detect "I'll do X later" patterns
            if (message.includes('later') || message.includes('tomorrow') || message.includes('next')) {
                const daysAgo = Math.floor(
                    (Date.now() - new Date(int.timestamp).getTime()) / (1000 * 60 * 60 * 24),
                );

                if (daysAgo >= 1) {
                    suggestions.push({
                        type: 'reminder',
                        priority: 'low',
                        title: 'Pending Task Reminder',
                        description: `${daysAgo} days ago, you mentioned you'd handle something later: "${int.userMessage.substring(0, 50)}..."`,
                        action: 'Would you like to revisit this?',
                        confidence: 0.6,
                    });
                }
            }
        }

        return suggestions;
    }

    private suggestBasedOnExpertise(dna: UserDNA, currentMessage: string): ProactiveSuggestion | null {
        const lower = currentMessage.toLowerCase();

        // If user asks about something they're good at, suggest teaching approach
        for (const [domain, expertise] of Object.entries(dna.traits.domainExpertise)) {
            if (lower.includes(domain.toLowerCase()) && expertise > 0.7) {
                return {
                    type: 'opportunity',
                    priority: 'low',
                    title: 'Knowledge Sharing Opportunity',
                    description: `You have strong expertise in ${domain} (${Math.round(expertise * 100)}%). This could be a good opportunity to document your knowledge or help others.`,
                    confidence: 0.65,
                };
            }
        }

        // If user asks about something they struggle with, offer deep dive
        for (const [task, successRate] of Object.entries(dna.traits.taskSuccessRates)) {
            if (lower.includes(task.toLowerCase()) && successRate < 0.4) {
                return {
                    type: 'improvement',
                    priority: 'medium',
                    title: 'Learning Opportunity Detected',
                    description: `I've noticed ${task} has been challenging (${Math.round(successRate * 100)}% success rate). Would you like a deeper explanation or structured tutorial?`,
                    action: 'Create a learning plan for this topic?',
                    confidence: 0.75,
                };
            }
        }

        return null;
    }

    private suggestBasedOnTime(dna: UserDNA): ProactiveSuggestion | null {
        const currentHour = new Date().getHours();

        // Check if user is working outside their peak hours
        if (dna.traits.peakProductivityHours.length > 0) {
            const isPeakHour = dna.traits.peakProductivityHours.includes(currentHour);

            if (!isPeakHour && (currentHour < 6 || currentHour > 22)) {
                return {
                    type: 'warning',
                    priority: 'low',
                    title: 'Off-Peak Work Hours',
                    description: `You're most productive at ${dna.traits.peakProductivityHours.join(', ')}:00. Working at ${currentHour}:00 might not be optimal.`,
                    action: 'Consider taking a break or rescheduling complex tasks?',
                    confidence: 0.5,
                };
            }
        }

        return null;
    }

    private suggestImprovements(currentMessage: string): ProactiveSuggestion[] {
        const suggestions: ProactiveSuggestion[] = [];
        const lower = currentMessage.toLowerCase();

        // Suggest testing if code is mentioned without tests
        if ((lower.includes('code') || lower.includes('function') || lower.includes('implement')) &&
            !lower.includes('test')) {
            suggestions.push({
                type: 'improvement',
                priority: 'medium',
                title: 'Testing Best Practice',
                description: 'I notice you\'re writing code. Have you considered adding tests?',
                action: 'I can help you write unit tests or integration tests.',
                confidence: 0.7,
            });
        }

        // Suggest documentation
        if (lower.includes('complex') || lower.includes('algorithm') || lower.includes('architecture')) {
            suggestions.push({
                type: 'improvement',
                priority: 'low',
                title: 'Documentation Suggestion',
                description: 'This seems complex. Would documentation help future you (or teammates)?',
                action: 'Generate documentation or diagrams?',
                confidence: 0.6,
            });
        }

        // Suggest version control
        if ((lower.includes('change') || lower.includes('update') || lower.includes('modify')) &&
            !lower.includes('git') && !lower.includes('commit')) {
            suggestions.push({
                type: 'improvement',
                priority: 'medium',
                title: 'Version Control Checkpoint',
                description: 'Making significant changes? A git commit might be a good idea.',
                action: 'Create a checkpoint before proceeding?',
                confidence: 0.65,
            });
        }

        return suggestions;
    }

    // ─── Helpers ────────────────────────────────────────────

    private extractErrorType(message: string): string {
        const patterns = [
            /(\w+Error)/i,
            /(\w+Exception)/i,
            /error[:\s]+([a-z]+)/i,
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) return match[1];
        }

        return 'Unknown Error';
    }

    private getPriorityScore(suggestion: ProactiveSuggestion): number {
        const priorityScores = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1,
        };

        return (priorityScores[suggestion.priority] || 1) * suggestion.confidence;
    }

    private getIcon(type: ProactiveSuggestion['type']): string {
        const icons = {
            improvement: '🚀',
            warning: '⚠️',
            opportunity: '💡',
            reminder: '⏰',
        };

        return icons[type] || '📌';
    }
}
