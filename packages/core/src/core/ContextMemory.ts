/**
 * ContextMemory — Long-term Conversation Memory
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Gives the agent perfect memory of all past conversations.
 * The agent remembers:
 * - Previous conversations
 * - User's projects
 * - Common errors
 * - Technical preferences
 * - Work patterns
 *
 * Now powered by LayeredMemory for efficient token usage.
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import { LayeredMemory, type LayeredMemoryConfig } from '../memory/LayeredMemory.js';

export interface ConversationContext {
    userId: string;
    genomeId: string;
    recentMessages: MessageMemory[];
    projectContext: ProjectContext[];
    technicalPreferences: TechnicalPreferences;
    commonPatterns: CommonPatterns;
}

export interface MessageMemory {
    timestamp: Date;
    userMessage: string;
    assistantResponse: string;
    topic: string;
    importance: number; // 0-1
}

export interface ProjectContext {
    name: string;
    technology: string[];
    status: 'active' | 'completed' | 'paused';
    lastMentioned: Date;
    description: string;
}

export interface TechnicalPreferences {
    languages: string[];
    frameworks: string[];
    tools: string[];
    codeStyle: 'minimal' | 'documented' | 'verbose';
}

export interface CommonPatterns {
    frequentTopics: string[];
    commonErrors: string[];
    successfulApproaches: string[];
    timePreferences: {
        workHours: number[];
        responseLength: 'short' | 'medium' | 'long';
    };
}

export class ContextMemory {
    private layeredMemory?: LayeredMemory;

    constructor(
        private storage: StorageAdapter,
        llm?: LLMAdapter,
        layeredMemoryConfig?: Partial<LayeredMemoryConfig>
    ) {
        // Initialize LayeredMemory if LLM adapter is provided
        if (llm) {
            this.layeredMemory = new LayeredMemory(storage, llm, layeredMemoryConfig);
        }
    }

    /**
     * Build context from user's conversation history
     */
    async buildContext(userId: string, genomeId: string): Promise<ConversationContext> {
        // Get recent interactions
        const interactions = await this.storage.getRecentInteractions?.(genomeId, userId, 50) || [];

        // Extract projects mentioned
        const projects = this.extractProjects(interactions);

        // Extract technical preferences
        const techPrefs = this.extractTechnicalPreferences(interactions);

        // Extract patterns
        const patterns = this.extractPatterns(interactions);

        // Get recent messages (last 10)
        const recentMessages: MessageMemory[] = interactions.slice(0, 10).map((int: any) => ({
            timestamp: int.timestamp,
            userMessage: int.userMessage,
            assistantResponse: int.assistantResponse,
            topic: this.extractTopic(int.userMessage),
            importance: int.score || 0.5,
        }));

        return {
            userId,
            genomeId,
            recentMessages,
            projectContext: projects,
            technicalPreferences: techPrefs,
            commonPatterns: patterns,
        };
    }

    /**
     * Generate memory-aware prompt injection
     *
     * Uses LayeredMemory if available (85-95% token reduction)
     * Falls back to legacy context building otherwise
     */
    async getMemoryPrompt(userId: string, genomeId: string): Promise<string> {
        // Use LayeredMemory if available (much more efficient)
        if (this.layeredMemory) {
            return await this.layeredMemory.buildContext(userId, genomeId);
        }

        // Legacy fallback
        const context = await this.buildContext(userId, genomeId);

        if (context.recentMessages.length === 0) {
            return ''; // No memory yet
        }

        const sections: string[] = [];

        // Recent conversation context
        if (context.recentMessages.length > 0) {
            sections.push('## CONVERSATION MEMORY\n');
            sections.push('You have perfect memory of previous conversations with this user:\n');

            const lastConv = context.recentMessages[0];
            sections.push(
                `Last conversation (${this.formatTimeAgo(lastConv.timestamp)}):`,
            );
            sections.push(`- Topic: ${lastConv.topic}`);
            sections.push(`- User asked: "${lastConv.userMessage.substring(0, 100)}..."`);
            sections.push('');
        }

        // Project context
        if (context.projectContext.length > 0) {
            sections.push('## USER\'S ACTIVE PROJECTS\n');
            sections.push('The user is currently working on:\n');

            for (const project of context.projectContext.slice(0, 3)) {
                sections.push(`• **${project.name}** (${project.technology.join(', ')})`);
                sections.push(`  Status: ${project.status}`);
                sections.push(`  Last mentioned: ${this.formatTimeAgo(project.lastMentioned)}`);
            }
            sections.push('');
        }

        // Technical preferences
        if (context.technicalPreferences.languages.length > 0) {
            sections.push('## TECHNICAL PREFERENCES\n');
            sections.push('User prefers:\n');
            sections.push(`- Languages: ${context.technicalPreferences.languages.join(', ')}`);
            if (context.technicalPreferences.frameworks.length > 0) {
                sections.push(`- Frameworks: ${context.technicalPreferences.frameworks.join(', ')}`);
            }
            sections.push(`- Code style: ${context.technicalPreferences.codeStyle}`);
            sections.push('');
        }

        // Common patterns
        if (context.commonPatterns.frequentTopics.length > 0) {
            sections.push('## LEARNED PATTERNS\n');
            sections.push('You\'ve learned that this user:\n');

            if (context.commonPatterns.frequentTopics.length > 0) {
                sections.push(`- Often asks about: ${context.commonPatterns.frequentTopics.slice(0, 3).join(', ')}`);
            }

            if (context.commonPatterns.commonErrors.length > 0) {
                sections.push(`- Common issues: ${context.commonPatterns.commonErrors.slice(0, 2).join(', ')}`);
            }

            sections.push(
                `- Prefers ${context.commonPatterns.timePreferences.responseLength} responses`,
            );
            sections.push('');
        }

        return sections.join('\n');
    }

    // ─── Private Helpers ────────────────────────────────────

    private extractProjects(interactions: any[]): ProjectContext[] {
        const projects = new Map<string, ProjectContext>();

        for (const int of interactions) {
            const message = int.userMessage.toLowerCase();

            // Simple project detection (can be enhanced with NLP)
            const projectKeywords = ['project', 'app', 'application', 'site', 'website', 'system'];

            for (const keyword of projectKeywords) {
                if (message.includes(keyword)) {
                    // Extract technology mentions
                    const tech = this.extractTechnologies(int.userMessage);

                    if (tech.length > 0) {
                        const projectName = this.extractProjectName(int.userMessage);

                        projects.set(projectName, {
                            name: projectName,
                            technology: tech,
                            status: 'active',
                            lastMentioned: int.timestamp,
                            description: int.userMessage.substring(0, 100),
                        });
                    }
                }
            }
        }

        return Array.from(projects.values());
    }

    private extractTechnicalPreferences(interactions: any[]): TechnicalPreferences {
        const languages = new Set<string>();
        const frameworks = new Set<string>();
        const tools = new Set<string>();

        const langKeywords = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'ruby'];
        const frameworkKeywords = ['react', 'vue', 'angular', 'next', 'express', 'django', 'flask'];
        const toolKeywords = ['git', 'docker', 'kubernetes', 'postgres', 'mongodb', 'redis'];

        for (const int of interactions) {
            const message = int.userMessage.toLowerCase();

            for (const lang of langKeywords) {
                if (message.includes(lang)) languages.add(lang);
            }

            for (const fw of frameworkKeywords) {
                if (message.includes(fw)) frameworks.add(fw);
            }

            for (const tool of toolKeywords) {
                if (message.includes(tool)) tools.add(tool);
            }
        }

        // Detect code style preference
        const avgResponseLength =
            interactions.reduce((sum, int) => sum + int.assistantResponse.length, 0) /
            Math.max(interactions.length, 1);

        const codeStyle: 'minimal' | 'documented' | 'verbose' =
            avgResponseLength < 500 ? 'minimal' : avgResponseLength < 1500 ? 'documented' : 'verbose';

        return {
            languages: Array.from(languages),
            frameworks: Array.from(frameworks),
            tools: Array.from(tools),
            codeStyle,
        };
    }

    private extractPatterns(interactions: any[]): CommonPatterns {
        const topics = new Map<string, number>();
        const errors = new Set<string>();

        for (const int of interactions) {
            const topic = this.extractTopic(int.userMessage);
            topics.set(topic, (topics.get(topic) || 0) + 1);

            // Detect error mentions
            if (int.userMessage.toLowerCase().includes('error')) {
                errors.add(this.extractError(int.userMessage));
            }
        }

        // Sort topics by frequency
        const frequentTopics = Array.from(topics.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([topic]) => topic);

        // Detect time preferences
        const workHours = interactions
            .map(int => new Date(int.timestamp).getHours())
            .filter((h, i, arr) => arr.indexOf(h) === i)
            .sort((a, b) => a - b);

        const avgLength =
            interactions.reduce((sum, int) => sum + int.assistantResponse.length, 0) /
            Math.max(interactions.length, 1);

        const responseLength: 'short' | 'medium' | 'long' =
            avgLength < 300 ? 'short' : avgLength < 800 ? 'medium' : 'long';

        return {
            frequentTopics,
            commonErrors: Array.from(errors).slice(0, 3),
            successfulApproaches: [],
            timePreferences: {
                workHours: workHours.slice(0, 5),
                responseLength,
            },
        };
    }

    private extractTopic(message: string): string {
        const lower = message.toLowerCase();

        // Simple topic classification
        if (lower.includes('bug') || lower.includes('error') || lower.includes('fix')) {
            return 'debugging';
        }
        if (lower.includes('implement') || lower.includes('create') || lower.includes('build')) {
            return 'development';
        }
        if (lower.includes('optimize') || lower.includes('performance')) {
            return 'optimization';
        }
        if (lower.includes('deploy') || lower.includes('production')) {
            return 'deployment';
        }
        if (lower.includes('test')) {
            return 'testing';
        }

        return 'general';
    }

    private extractError(message: string): string {
        // Extract error type from message
        const errorPatterns = [
            /error[:\s]+([a-z]+)/i,
            /([a-z]+)\s+error/i,
            /exception[:\s]+([a-z]+)/i,
        ];

        for (const pattern of errorPatterns) {
            const match = message.match(pattern);
            if (match) return match[1];
        }

        return 'unknown error';
    }

    private extractTechnologies(message: string): string[] {
        const tech = [];
        const keywords = [
            'react',
            'vue',
            'angular',
            'node',
            'python',
            'typescript',
            'javascript',
            'postgres',
            'mongodb',
            'redis',
        ];

        const lower = message.toLowerCase();
        for (const keyword of keywords) {
            if (lower.includes(keyword)) {
                tech.push(keyword);
            }
        }

        return tech;
    }

    private extractProjectName(message: string): string {
        // Try to extract project name from context
        const patterns = [
            /(?:project|app|site)\s+(?:called|named)\s+"([^"]+)"/i,
            /my\s+([a-z-]+)\s+(?:project|app|site)/i,
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) return match[1];
        }

        return 'user-project';
    }

    private formatTimeAgo(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 60) return `${minutes} minutes ago`;
        if (hours < 24) return `${hours} hours ago`;
        if (days === 1) return 'yesterday';
        if (days < 7) return `${days} days ago`;
        return `${Math.floor(days / 7)} weeks ago`;
    }
}
