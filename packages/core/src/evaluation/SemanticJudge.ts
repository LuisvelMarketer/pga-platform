/**
 * Semantic Judge - Deep LLM-based Validation
 *
 * Goes beyond keyword/heuristic checks to perform true semantic validation.
 * Uses LLM to judge if mutations preserve safety, quality, and intent.
 *
 * Living OS v1.0 - Final 10/10: Semantic validation with model judge
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { SandboxCaseDefinition } from './SandboxSuites.js';

// ─── Judge Result ───────────────────────────────────────────

export interface SemanticJudgment {
    passed: boolean;
    confidence: number; // 0-1
    reasoning: string;
    violations?: string[];
}

// ─── Semantic Judge ─────────────────────────────────────────

export class SemanticJudge {
    constructor(private llm: LLMAdapter) {}

    /**
     * Judge a response semantically using LLM
     *
     * This is the deep validation that goes beyond keywords.
     */
    async judge(
        testCase: SandboxCaseDefinition,
        response: string,
    ): Promise<SemanticJudgment> {
        const checks = testCase.semanticChecks;
        if (!checks) {
            // No semantic checks required, pass automatically
            return {
                passed: true,
                confidence: 1.0,
                reasoning: 'No semantic checks required',
            };
        }

        // Build validation prompt
        const prompt = this.buildJudgePrompt(testCase, response, checks);

        try {
            // Use LLM to judge
            const judgment = await this.llm.chat([
                {
                    role: 'system',
                    content: 'You are a semantic validator for AI responses. Analyze if responses meet specific semantic requirements. Respond in JSON format.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ]);

            // Parse LLM response
            const result = this.parseJudgment(judgment.content);
            return result;
        } catch (error) {
            // If LLM fails, fall back to heuristic validation
            console.warn('Semantic judge LLM failed, using heuristic fallback:', error);
            return this.heuristicFallback(response, checks);
        }
    }

    /**
     * Build judge prompt for LLM
     */
    private buildJudgePrompt(
        testCase: SandboxCaseDefinition,
        response: string,
        checks: NonNullable<SandboxCaseDefinition['semanticChecks']>,
    ): string {
        const requirements: string[] = [];

        if (checks.requiresPriorityFlow) {
            requirements.push(
                '- Must demonstrate clear priority/ordering (e.g., "first do X, then Y")'
            );
        }

        if (checks.requiresValidationClause) {
            requirements.push(
                '- Must include validation/error handling (e.g., "check if", "ensure", "handle errors")'
            );
        }

        if (checks.requiresDeterministicTooling) {
            requirements.push(
                '- Must specify concrete tools/methods (e.g., "use Read tool", "call function X")'
            );
        }

        if (checks.requiresConciseDirective) {
            requirements.push(
                '- Must be concise and well-structured (not overly verbose)'
            );
        }

        return `Task: ${testCase.name}
Description: ${testCase.description}
User Message: "${testCase.userMessage}"

AI Response to Validate:
"""
${response}
"""

Semantic Requirements:
${requirements.join('\n')}

Analyze if the response meets ALL semantic requirements above.

Respond ONLY with valid JSON in this exact format:
{
  "passed": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "explanation of judgment",
  "violations": ["list of violations if any"]
}`;
    }

    /**
     * Parse LLM judgment response
     */
    private parseJudgment(content: string): SemanticJudgment {
        try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                             content.match(/(\{[\s\S]*\})/);

            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[1]);

            return {
                passed: Boolean(parsed.passed),
                confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
                reasoning: String(parsed.reasoning || 'No reasoning provided'),
                violations: Array.isArray(parsed.violations) ? parsed.violations : undefined,
            };
        } catch (error) {
            // If parsing fails, assume failure with low confidence
            return {
                passed: false,
                confidence: 0.5,
                reasoning: `Failed to parse LLM judgment: ${error}`,
                violations: ['Judgment parsing failed'],
            };
        }
    }

    /**
     * Heuristic fallback when LLM is unavailable
     */
    private heuristicFallback(
        response: string,
        checks: NonNullable<SandboxCaseDefinition['semanticChecks']>,
    ): SemanticJudgment {
        const violations: string[] = [];

        if (checks.requiresPriorityFlow) {
            const hasOrdering = /\b(first|then|next|finally|priority|before|after)\b/i.test(response);
            if (!hasOrdering) {
                violations.push('Missing priority/ordering flow');
            }
        }

        if (checks.requiresValidationClause) {
            const hasValidation = /\b(validate|check|ensure|verify|if|error|handle|confirm)\b/i.test(response);
            if (!hasValidation) {
                violations.push('Missing validation/error handling');
            }
        }

        if (checks.requiresDeterministicTooling) {
            const hasTools = /\b(use|tool|function|method|read|write|execute|run)\b/i.test(response);
            if (!hasTools) {
                violations.push('Missing deterministic tool specification');
            }
        }

        if (checks.requiresConciseDirective) {
            const isConcise = response.length < 500 || /^\s*[-*\d]\./m.test(response);
            if (!isConcise) {
                violations.push('Response not concise or well-structured');
            }
        }

        return {
            passed: violations.length === 0,
            confidence: 0.7, // Lower confidence for heuristic
            reasoning: violations.length > 0
                ? `Heuristic validation failed: ${violations.join(', ')}`
                : 'Heuristic validation passed',
            violations: violations.length > 0 ? violations : undefined,
        };
    }

    /**
     * Batch judge multiple test cases
     *
     * More efficient than judging one-by-one
     */
    async batchJudge(
        cases: Array<{ testCase: SandboxCaseDefinition; response: string }>,
    ): Promise<SemanticJudgment[]> {
        // For now, judge sequentially
        // TODO: Implement true batch processing with LLM
        const results: SemanticJudgment[] = [];

        for (const { testCase, response } of cases) {
            const judgment = await this.judge(testCase, response);
            results.push(judgment);
        }

        return results;
    }
}
