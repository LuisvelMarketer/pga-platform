/**
 * EmotionalModel — Computational Empathy
 *
 * Models the emotional state of the user from text signals
 * and adapts agent tone/engagement accordingly. Detects
 * frustration early and calibrates proactive vs passive behavior.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

// ─── Types ──────────────────────────────────────────────

export type Emotion = 'neutral' | 'frustrated' | 'confused' | 'enthusiastic' | 'impatient' | 'satisfied';

export interface EmotionalState {
    primary: Emotion;
    intensity: number;  // 0-1
    confidence: number; // 0-1
    signals: string[];  // what triggered this assessment
}

export type EngagementLevel = 'proactive' | 'responsive' | 'minimal';

export interface ToneGuidance {
    suggestedTone: 'empathetic' | 'encouraging' | 'direct' | 'patient' | 'neutral';
    engagementLevel: EngagementLevel;
    reasoning: string;
}

// ─── Emotion Lexicons ───────────────────────────────────

const FRUSTRATION_SIGNALS = [
    'not working', 'doesn\'t work', 'still broken', 'again', 'still',
    'why', 'ugh', 'wrong', 'broken', 'failed', 'failing', 'keeps',
    'already tried', 'told you', 'same error', 'same problem',
    'waste of time', 'useless', 'terrible', 'awful', 'hate',
    'impossible', 'can\'t believe', 'ridiculous',
];

const CONFUSION_SIGNALS = [
    'don\'t understand', 'confused', 'what do you mean', 'unclear',
    'how does', 'what is', 'why does', 'makes no sense', 'lost',
    'huh', '???', 'explain', 'not sure what',
];

const ENTHUSIASM_SIGNALS = [
    'awesome', 'great', 'perfect', 'amazing', 'love it', 'excellent',
    'fantastic', 'brilliant', 'cool', 'nice', 'wonderful', 'thanks',
    'thank you', 'works', 'solved', 'figured it out', '!',
];

const IMPATIENCE_SIGNALS = [
    'just', 'quickly', 'hurry', 'asap', 'urgent', 'now',
    'fast', 'immediately', 'right now', 'short answer',
    'tldr', 'skip', 'get to the point', 'briefly',
];

const SATISFACTION_SIGNALS = [
    'exactly', 'that\'s it', 'works perfectly', 'just what i needed',
    'spot on', 'correct', 'yes', 'right', 'good job',
];

// ─── EmotionalModel ─────────────────────────────────────

export class EmotionalModel {
    private emotionHistory: Array<{ emotion: Emotion; intensity: number; timestamp: Date }> = [];
    private frustrationWindow: number[] = [];

    /**
     * Infer emotional state from a user message.
     */
    inferEmotion(message: string): EmotionalState {
        const lower = message.toLowerCase();
        const signals: string[] = [];

        // Score each emotion
        const scores: Record<Emotion, number> = {
            neutral: 0.3,
            frustrated: 0,
            confused: 0,
            enthusiastic: 0,
            impatient: 0,
            satisfied: 0,
        };

        // Check frustration
        for (const signal of FRUSTRATION_SIGNALS) {
            if (lower.includes(signal)) {
                scores.frustrated += 0.2;
                signals.push(`frustration: "${signal}"`);
            }
        }

        // Check confusion
        for (const signal of CONFUSION_SIGNALS) {
            if (lower.includes(signal)) {
                scores.confused += 0.2;
                signals.push(`confusion: "${signal}"`);
            }
        }

        // Check enthusiasm
        for (const signal of ENTHUSIASM_SIGNALS) {
            if (lower.includes(signal)) {
                scores.enthusiastic += 0.15;
                signals.push(`enthusiasm: "${signal}"`);
            }
        }

        // Check impatience
        for (const signal of IMPATIENCE_SIGNALS) {
            if (lower.includes(signal)) {
                scores.impatient += 0.2;
                signals.push(`impatience: "${signal}"`);
            }
        }

        // Check satisfaction
        for (const signal of SATISFACTION_SIGNALS) {
            if (lower.includes(signal)) {
                scores.satisfied += 0.2;
                signals.push(`satisfaction: "${signal}"`);
            }
        }

        // Punctuation signals
        const exclamationCount = (message.match(/!/g) || []).length;
        const questionCount = (message.match(/\?/g) || []).length;
        const capsRatio = (message.match(/[A-Z]/g) || []).length / Math.max(message.length, 1);

        if (exclamationCount >= 2) {
            scores.frustrated += 0.1;
            scores.enthusiastic += 0.1;
            signals.push('multiple exclamation marks');
        }

        if (questionCount >= 2) {
            scores.confused += 0.1;
            signals.push('multiple question marks');
        }

        if (capsRatio > 0.5 && message.length > 10) {
            scores.frustrated += 0.15;
            signals.push('excessive caps');
        }

        // Short, terse messages may indicate impatience
        if (message.length < 15 && !lower.includes('thanks') && !lower.includes('yes')) {
            scores.impatient += 0.1;
        }

        // Find dominant emotion
        const entries = Object.entries(scores) as Array<[Emotion, number]>;
        entries.sort((a, b) => b[1] - a[1]);
        const [primary, intensity] = entries[0];

        // Calculate confidence based on signal strength
        const confidence = Math.min(1, signals.length * 0.2 + 0.3);

        const state: EmotionalState = {
            primary,
            intensity: Math.min(1, intensity),
            confidence,
            signals: signals.slice(0, 5),
        };

        // Record to history
        this.emotionHistory.push({
            emotion: primary,
            intensity: state.intensity,
            timestamp: new Date(),
        });

        // Track frustration window for early detection
        this.frustrationWindow.push(primary === 'frustrated' ? 1 : 0);
        if (this.frustrationWindow.length > 10) {
            this.frustrationWindow = this.frustrationWindow.slice(-10);
        }

        // Keep history manageable
        if (this.emotionHistory.length > 100) {
            this.emotionHistory = this.emotionHistory.slice(-50);
        }

        return state;
    }

    /**
     * Detect frustration level from recent conversation history.
     * Returns 0-1 where 1 = highly frustrated.
     */
    detectFrustration(): number {
        if (this.frustrationWindow.length < 2) return 0;

        const recentFrustration = this.frustrationWindow.reduce((sum, v) => sum + v, 0) / this.frustrationWindow.length;

        // Recent messages weigh more
        const last3 = this.frustrationWindow.slice(-3);
        const recentWeight = last3.length > 0
            ? last3.reduce((sum, v) => sum + v, 0) / last3.length
            : 0;

        return Math.min(1, recentFrustration * 0.4 + recentWeight * 0.6);
    }

    /**
     * Get tone guidance based on current emotional state.
     */
    getToneGuidance(state: EmotionalState): ToneGuidance {
        const frustrationLevel = this.detectFrustration();

        switch (state.primary) {
            case 'frustrated':
                return {
                    suggestedTone: 'empathetic',
                    engagementLevel: frustrationLevel > 0.6 ? 'minimal' : 'responsive',
                    reasoning: frustrationLevel > 0.6
                        ? 'User is highly frustrated. Be concise, direct, and solution-focused. Avoid verbose explanations.'
                        : 'User shows some frustration. Acknowledge the difficulty and provide clear solutions.',
                };

            case 'confused':
                return {
                    suggestedTone: 'patient',
                    engagementLevel: 'proactive',
                    reasoning: 'User is confused. Break down the explanation into simpler steps. Offer examples.',
                };

            case 'enthusiastic':
                return {
                    suggestedTone: 'encouraging',
                    engagementLevel: 'proactive',
                    reasoning: 'User is enthusiastic. Match their energy and suggest related opportunities.',
                };

            case 'impatient':
                return {
                    suggestedTone: 'direct',
                    engagementLevel: 'responsive',
                    reasoning: 'User wants quick answers. Be concise and skip unnecessary context.',
                };

            case 'satisfied':
                return {
                    suggestedTone: 'encouraging',
                    engagementLevel: 'responsive',
                    reasoning: 'User is satisfied. Acknowledge success and offer next steps if appropriate.',
                };

            default:
                return {
                    suggestedTone: 'neutral',
                    engagementLevel: 'responsive',
                    reasoning: 'No strong emotional signal detected. Maintain balanced, professional tone.',
                };
        }
    }

    /**
     * Generate a prompt section for emotional awareness.
     */
    toPromptSection(state: EmotionalState): string | null {
        // Only inject when there's a non-neutral emotion
        if (state.primary === 'neutral' && state.intensity < 0.3) {
            return null;
        }

        const guidance = this.getToneGuidance(state);
        const lines: string[] = ['## Emotional Context'];

        lines.push(`**User state:** ${state.primary} (intensity: ${(state.intensity * 100).toFixed(0)}%)`);
        lines.push(`**Recommended tone:** ${guidance.suggestedTone}`);
        lines.push(`**Guidance:** ${guidance.reasoning}`);

        const frustration = this.detectFrustration();
        if (frustration > 0.5) {
            lines.push(`**Warning:** Frustration accumulating (${(frustration * 100).toFixed(0)}%) — prioritize solutions over explanations`);
        }

        return lines.join('\n');
    }

    /**
     * Get emotion trend over recent interactions.
     */
    getEmotionTrend(): { dominant: Emotion; stability: number; trend: 'improving' | 'stable' | 'worsening' } {
        if (this.emotionHistory.length < 3) {
            return { dominant: 'neutral', stability: 1, trend: 'stable' };
        }

        // Count emotion frequencies
        const counts: Record<string, number> = {};
        for (const entry of this.emotionHistory.slice(-10)) {
            counts[entry.emotion] = (counts[entry.emotion] || 0) + 1;
        }

        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const dominant = (entries[0]?.[0] || 'neutral') as Emotion;

        // Stability: how consistent is the emotion
        const maxCount = entries[0]?.[1] || 0;
        const total = this.emotionHistory.slice(-10).length;
        const stability = maxCount / total;

        // Trend: compare first half vs second half
        const half = Math.floor(this.emotionHistory.length / 2);
        const firstHalf = this.emotionHistory.slice(-10, -half || undefined);
        const secondHalf = this.emotionHistory.slice(-half);

        const positiveEmotions = new Set<Emotion>(['enthusiastic', 'satisfied']);
        const firstPositive = firstHalf.filter(e => positiveEmotions.has(e.emotion)).length / Math.max(firstHalf.length, 1);
        const secondPositive = secondHalf.filter(e => positiveEmotions.has(e.emotion)).length / Math.max(secondHalf.length, 1);

        const diff = secondPositive - firstPositive;
        const trend = diff > 0.2 ? 'improving' : diff < -0.2 ? 'worsening' : 'stable';

        return { dominant, stability, trend };
    }
}
