/**
 * Metacognition — Pre/Post Response Analysis
 *
 * Enables agents to think about their own thinking:
 * - Pre-response: assess confidence, identify missing info, decide action
 * - Post-response: self-evaluate, extract learnings
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import type { SelfAssessment } from '../advanced-ai/SelfModel.js';

// ─── Types ──────────────────────────────────────────────

export interface ConfidenceAssessment {
    technical: number;       // 0-1: confidence in technical ability for this task
    informational: number;   // 0-1: do we have enough info?
    contextual: number;      // 0-1: do we understand the context?
    overall: number;         // weighted average
}

export interface PreResponseAnalysis {
    confidence: ConfidenceAssessment;
    missingInfo: string[];
    suggestedAction: 'respond' | 'ask' | 'research';
    knowledgeGaps: string[];
    reasoning: string;
}

export interface PostResponseInsight {
    category: 'success-pattern' | 'improvement-area' | 'knowledge-gain' | 'user-preference';
    description: string;
    confidence: number;
    actionable: boolean;
}

export interface PostResponseAnalysis {
    whatWentWell: string[];
    whatCouldImprove: string[];
    insights: PostResponseInsight[];
    effectivenessScore: number;  // 0-1
}

// ─── Metacognition Engine ───────────────────────────────

/**
 * Keyword indicators for confidence scoring and gap detection.
 */
const AMBIGUITY_INDICATORS = [
    'something', 'stuff', 'thing', 'whatever', 'maybe',
    'like', 'kind of', 'sort of', 'idk', 'not sure',
];

const TECHNICAL_KEYWORDS: Record<string, string[]> = {
    'coding': ['code', 'function', 'class', 'api', 'endpoint', 'debug', 'error', 'bug', 'test', 'deploy'],
    'data': ['database', 'query', 'schema', 'migration', 'sql', 'nosql', 'index'],
    'devops': ['docker', 'kubernetes', 'ci/cd', 'pipeline', 'deploy', 'container', 'infra'],
    'design': ['ui', 'ux', 'component', 'layout', 'style', 'responsive', 'accessible'],
    'architecture': ['microservice', 'monolith', 'pattern', 'refactor', 'scale', 'cache'],
};

export class Metacognition {
    private interactionHistory: Array<{
        message: string;
        wasSuccessful: boolean;
        action: 'respond' | 'ask' | 'research';
        timestamp: Date;
    }> = [];

    constructor(
        private selfAssessmentFn?: () => SelfAssessment | null,
    ) {}

    /**
     * Pre-response analysis: assess confidence, identify gaps,
     * decide whether to respond, ask, or research.
     */
    analyzePreResponse(
        userMessage: string,
        conversationContext?: string[],
    ): PreResponseAnalysis {
        const confidence = this.assessConfidence(userMessage, conversationContext);
        const missingInfo = this.identifyMissingInfo(userMessage, conversationContext);
        const knowledgeGaps = this.identifyKnowledgeGaps(userMessage);
        const suggestedAction = this.decideBestAction(confidence, missingInfo, knowledgeGaps);

        const reasoning = this.buildReasoning(confidence, missingInfo, suggestedAction);

        return {
            confidence,
            missingInfo,
            suggestedAction,
            knowledgeGaps,
            reasoning,
        };
    }

    /**
     * Post-response analysis: evaluate how well the response served
     * the user and extract learnings for future improvement.
     */
    analyzePostResponse(
        userMessage: string,
        response: string,
        wasSuccessful: boolean,
    ): PostResponseAnalysis {
        const whatWentWell: string[] = [];
        const whatCouldImprove: string[] = [];
        const insights: PostResponseInsight[] = [];

        // Assess response completeness
        const responseLength = response.length;
        const messageLength = userMessage.length;

        if (wasSuccessful) {
            // Analyze what went well
            if (responseLength > messageLength * 2) {
                whatWentWell.push('Provided thorough, detailed response');
            }
            if (response.includes('```')) {
                whatWentWell.push('Included code examples');
                insights.push({
                    category: 'success-pattern',
                    description: 'Code examples improve user satisfaction',
                    confidence: 0.7,
                    actionable: true,
                });
            }
            if (responseLength < 500) {
                whatWentWell.push('Kept response concise');
            }
        } else {
            // Analyze areas for improvement
            if (responseLength > 2000) {
                whatCouldImprove.push('Response may have been too verbose');
                insights.push({
                    category: 'improvement-area',
                    description: 'Try more concise responses for this task type',
                    confidence: 0.5,
                    actionable: true,
                });
            }
            if (!response.includes('?') && this.containsAmbiguity(userMessage)) {
                whatCouldImprove.push('Could have asked clarifying questions');
                insights.push({
                    category: 'improvement-area',
                    description: 'Ask clarifying questions when user message is ambiguous',
                    confidence: 0.8,
                    actionable: true,
                });
            }
        }

        // Check for knowledge patterns
        const domain = this.detectDomain(userMessage);
        if (domain) {
            insights.push({
                category: 'knowledge-gain',
                description: `Interaction in domain: ${domain}`,
                confidence: 0.6,
                actionable: false,
            });
        }

        // Detect user preferences from conversation
        if (response.includes('```') && wasSuccessful) {
            insights.push({
                category: 'user-preference',
                description: 'User responds well to code examples',
                confidence: 0.6,
                actionable: true,
            });
        }

        // Calculate effectiveness
        let effectivenessScore = wasSuccessful ? 0.7 : 0.3;
        if (whatWentWell.length > whatCouldImprove.length) effectivenessScore += 0.15;
        if (whatCouldImprove.length > whatWentWell.length) effectivenessScore -= 0.15;
        effectivenessScore = Math.max(0, Math.min(1, effectivenessScore));

        // Record for future reference
        this.interactionHistory.push({
            message: userMessage.slice(0, 100),
            wasSuccessful,
            action: wasSuccessful ? 'respond' : 'ask',
            timestamp: new Date(),
        });

        // Keep history manageable
        if (this.interactionHistory.length > 100) {
            this.interactionHistory = this.interactionHistory.slice(-50);
        }

        return {
            whatWentWell,
            whatCouldImprove,
            insights,
            effectivenessScore,
        };
    }

    /**
     * Generate a prompt section for metacognitive awareness.
     */
    toPromptSection(preAnalysis: PreResponseAnalysis): string | null {
        // Only inject when there's something actionable
        if (preAnalysis.missingInfo.length === 0 &&
            preAnalysis.knowledgeGaps.length === 0 &&
            preAnalysis.suggestedAction === 'respond') {
            return null;
        }

        const lines: string[] = ['## Metacognitive Awareness'];

        lines.push(`**Confidence:** technical=${(preAnalysis.confidence.technical * 100).toFixed(0)}%, ` +
            `info=${(preAnalysis.confidence.informational * 100).toFixed(0)}%, ` +
            `overall=${(preAnalysis.confidence.overall * 100).toFixed(0)}%`);

        if (preAnalysis.missingInfo.length > 0) {
            lines.push(`**Missing information:** ${preAnalysis.missingInfo.join('; ')}`);
        }

        if (preAnalysis.knowledgeGaps.length > 0) {
            lines.push(`**Knowledge gaps:** ${preAnalysis.knowledgeGaps.join('; ')}`);
        }

        lines.push(`**Recommended action:** ${preAnalysis.suggestedAction}`);
        lines.push(`**Reasoning:** ${preAnalysis.reasoning}`);

        return lines.join('\n');
    }

    /**
     * Get recent effectiveness trend.
     */
    getEffectivenessTrend(): { recentRate: number; trend: 'improving' | 'stable' | 'declining' } {
        if (this.interactionHistory.length < 5) {
            return { recentRate: 0.5, trend: 'stable' };
        }

        const recent = this.interactionHistory.slice(-10);
        const recentRate = recent.filter(i => i.wasSuccessful).length / recent.length;

        const older = this.interactionHistory.slice(-20, -10);
        if (older.length < 5) {
            return { recentRate, trend: 'stable' };
        }

        const olderRate = older.filter(i => i.wasSuccessful).length / older.length;
        const diff = recentRate - olderRate;

        return {
            recentRate,
            trend: diff > 0.1 ? 'improving' : diff < -0.1 ? 'declining' : 'stable',
        };
    }

    // ── Private Methods ─────────────────────────────────────

    private assessConfidence(
        userMessage: string,
        conversationContext?: string[],
    ): ConfidenceAssessment {
        const lower = userMessage.toLowerCase();

        // Technical confidence: based on self-assessment if available
        let technical = 0.7;
        const selfAssessment = this.selfAssessmentFn?.();
        if (selfAssessment) {
            const domain = this.detectDomain(userMessage);
            if (domain) {
                const strength = selfAssessment.strengths.find(s => s.category === domain);
                const weakness = selfAssessment.weaknesses.find(w => w.category === domain);
                if (strength) technical = strength.confidence;
                else if (weakness) technical = weakness.confidence;
            }
            // Overall health affects base confidence
            if (selfAssessment.overallHealth === 'thriving') technical = Math.max(technical, 0.7);
            else if (selfAssessment.overallHealth === 'struggling') technical = Math.min(technical, 0.5);
        }

        // Informational confidence: do we have enough info?
        let informational = 0.8;
        const ambiguityCount = this.countAmbiguity(lower);
        informational -= ambiguityCount * 0.15;

        // Short messages with no context often lack information
        if (lower.length < 20 && (!conversationContext || conversationContext.length === 0)) {
            informational -= 0.2;
        }

        // Questions in the message suggest info is being provided
        if (lower.endsWith('?')) {
            informational += 0.1;
        }

        informational = Math.max(0, Math.min(1, informational));

        // Contextual confidence: do we have conversation context?
        let contextual = 0.6;
        if (conversationContext && conversationContext.length > 0) {
            contextual = Math.min(0.9, 0.6 + conversationContext.length * 0.05);
        }

        const overall = (technical * 0.4) + (informational * 0.35) + (contextual * 0.25);

        return {
            technical: Math.max(0, Math.min(1, technical)),
            informational,
            contextual: Math.max(0, Math.min(1, contextual)),
            overall: Math.max(0, Math.min(1, overall)),
        };
    }

    private identifyMissingInfo(
        userMessage: string,
        conversationContext?: string[],
    ): string[] {
        const missing: string[] = [];
        const lower = userMessage.toLowerCase();

        // Detect vague requests
        if (this.containsAmbiguity(lower) && lower.length < 50) {
            missing.push('Request is vague — specific requirements needed');
        }

        // Detect requests without constraints
        if ((lower.includes('build') || lower.includes('create') || lower.includes('make')) &&
            !lower.includes('using') && !lower.includes('with') && lower.length < 80) {
            missing.push('Technology stack or framework not specified');
        }

        // Detect "fix" requests without error details
        if ((lower.includes('fix') || lower.includes('error') || lower.includes('bug')) &&
            !lower.includes('```') && lower.length < 60) {
            missing.push('Error details or code context not provided');
        }

        // No conversation context for a follow-up reference
        if ((lower.includes('that') || lower.includes('this') || lower.includes('it')) &&
            lower.length < 30 && (!conversationContext || conversationContext.length === 0)) {
            missing.push('Reference to previous context without conversation history');
        }

        return missing;
    }

    private identifyKnowledgeGaps(userMessage: string): string[] {
        const gaps: string[] = [];
        const selfAssessment = this.selfAssessmentFn?.();

        if (!selfAssessment) return gaps;

        const domain = this.detectDomain(userMessage);
        if (domain) {
            const weakness = selfAssessment.weaknesses.find(w => w.category === domain);
            if (weakness) {
                gaps.push(`${domain} is a weaker area (fitness: ${weakness.confidence.toFixed(2)}) — ${weakness.suggestion}`);
            }
        }

        // Check drift warnings for relevant domains
        for (const warning of selfAssessment.driftWarnings) {
            gaps.push(`Performance declining in ${warning.dimension}: ${warning.trend}`);
        }

        return gaps;
    }

    private decideBestAction(
        confidence: ConfidenceAssessment,
        missingInfo: string[],
        knowledgeGaps: string[],
    ): 'respond' | 'ask' | 'research' {
        // If informational confidence is very low, ask
        if (confidence.informational < 0.4) return 'ask';

        // If we have multiple missing info items, ask
        if (missingInfo.length >= 2) return 'ask';

        // If technical confidence is low and we have knowledge gaps, research
        if (confidence.technical < 0.4 && knowledgeGaps.length > 0) return 'research';

        // If overall confidence is decent, respond
        if (confidence.overall >= 0.5) return 'respond';

        // If only one piece of info is missing, we can still respond
        if (missingInfo.length <= 1 && confidence.technical >= 0.5) return 'respond';

        return 'ask';
    }

    private buildReasoning(
        confidence: ConfidenceAssessment,
        missingInfo: string[],
        action: 'respond' | 'ask' | 'research',
    ): string {
        if (action === 'respond') {
            return `Confidence is sufficient (${(confidence.overall * 100).toFixed(0)}%) to provide a direct response.`;
        }

        if (action === 'ask') {
            const reasons = missingInfo.length > 0
                ? `Missing: ${missingInfo.join(', ')}`
                : `Informational confidence too low (${(confidence.informational * 100).toFixed(0)}%)`;
            return `Better to clarify before responding. ${reasons}.`;
        }

        return `Technical confidence is low (${(confidence.technical * 100).toFixed(0)}%). Research recommended before responding.`;
    }

    private detectDomain(message: string): string | null {
        const lower = message.toLowerCase();
        let bestDomain: string | null = null;
        let bestScore = 0;

        for (const [domain, keywords] of Object.entries(TECHNICAL_KEYWORDS)) {
            const score = keywords.filter(kw => lower.includes(kw)).length;
            if (score > bestScore) {
                bestScore = score;
                bestDomain = domain;
            }
        }

        return bestScore >= 1 ? bestDomain : null;
    }

    private containsAmbiguity(message: string): boolean {
        return this.countAmbiguity(message) > 0;
    }

    private countAmbiguity(message: string): number {
        return AMBIGUITY_INDICATORS.filter(ind => message.includes(ind)).length;
    }
}
