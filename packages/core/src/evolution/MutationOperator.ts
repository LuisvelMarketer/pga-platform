/**
 * Mutation Operator Library - Controlled Evolution
 *
 * Provides a library of mutation operations for genome evolution.
 * Each operator implements a specific strategy for improving fitness.
 *
 * Key Operators:
 * 1. compress_instructions - Reduce token count while preserving meaning
 * 2. reorder_constraints - Optimize constraint ordering for LLM
 * 3. safety_reinforcement - Strengthen security boundaries
 * 4. tool_selection_bias - Adjust tool usage patterns
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0
 */

import type {
    GenomeV2,
    OperativeGene,
    MutationType,
    MutationRecord,
} from '../types/GenomeV2.js';

// ─── Mutation Context ───────────────────────────────────────

export interface MutationContext {
    genome: GenomeV2;
    targetChromosome: 'c1' | 'c2'; // Never c0!
    targetGene?: OperativeGene; // Specific gene or null for global
    reason: string; // Why this mutation
    evidence?: Record<string, unknown>; // Supporting data
}

// ─── Mutation Result ────────────────────────────────────────

export interface MutationResult {
    success: boolean;
    mutant: GenomeV2; // Mutated genome
    mutation: MutationRecord; // Audit record
    description: string; // Human-readable description
    expectedImprovement: number; // Predicted fitness gain (0-1)
}

// ─── Mutation Operator Interface ────────────────────────────

export interface IMutationOperator {
    name: MutationType;
    description: string;
    targetChromosome: 'c1' | 'c2';

    /**
     * Apply mutation to genome
     *
     * MUST NOT mutate original genome - returns new mutant.
     */
    mutate(context: MutationContext): Promise<MutationResult>;

    /**
     * Estimate fitness improvement
     *
     * Used for mutation selection.
     */
    estimateImprovement(context: MutationContext): number;
}

// ─── Mutation Operators ─────────────────────────────────────

/**
 * Compress Instructions - Cognitive Compression
 *
 * Reduces token count while preserving semantic meaning.
 * Target: Improve token efficiency, reduce cost.
 */
export class CompressInstructionsOperator implements IMutationOperator {
    name: MutationType = 'compress_instructions';
    description = 'Reduce token count while preserving meaning';
    targetChromosome: 'c1' = 'c1';

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);

        // Apply compression to C1 operative genes
        mutant.chromosomes.c1.operations = mutant.chromosomes.c1.operations.map((gene) =>
            this.compressGene(gene)
        );

        // Create mutation record
        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: JSON.stringify(context.genome.chromosomes.c1),
            after: JSON.stringify(mutant.chromosomes.c1),
            diff: this.computeDiff(
                context.genome.chromosomes.c1,
                mutant.chromosomes.c1
            ),
            trigger: 'drift-detected',
            reason: context.reason,
            sandboxTested: false,
            promoted: false,
            proposer: 'system',
        };

        return {
            success: true,
            mutant,
            mutation,
            description: 'Compressed instructions to reduce token usage',
            expectedImprovement: 0.15, // 15% improvement expected
        };
    }

    estimateImprovement(context: MutationContext): number {
        // Higher improvement if token efficiency is low
        const currentEfficiency = context.genome.fitness.tokenEfficiency;
        return (1 - currentEfficiency) * 0.2; // Up to 20% improvement
    }

    private compressGene(gene: OperativeGene): OperativeGene {
        const compressed = { ...gene };

        // Compression strategies
        compressed.content = this.removeRedundancy(gene.content);
        compressed.content = this.abbreviateCommon(compressed.content);
        compressed.content = this.consolidateInstructions(compressed.content);

        return compressed;
    }

    private removeRedundancy(content: string): string {
        // Remove duplicate phrases
        const sentences = content.split('. ');
        const unique = [...new Set(sentences)];
        return unique.join('. ');
    }

    private abbreviateCommon(content: string): string {
        const abbreviations: Record<string, string> = {
            'for example': 'e.g.',
            'that is': 'i.e.',
            'and so on': 'etc.',
            'please': 'pls',
            'you should': 'you must',
        };

        let result = content;
        for (const [full, abbrev] of Object.entries(abbreviations)) {
            result = result.replace(new RegExp(full, 'gi'), abbrev);
        }

        return result;
    }

    private consolidateInstructions(content: string): string {
        // Merge similar instructions
        return content
            .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
            .replace(/\s{2,}/g, ' ') // Remove excessive spaces
            .trim();
    }

    private deepClone(genome: GenomeV2): GenomeV2 {
        return JSON.parse(JSON.stringify(genome));
    }

    private generateId(): string {
        return `mut_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    private computeDiff(before: unknown, after: unknown): string {
        // Simple diff for now
        return `Changed ${JSON.stringify(before).length} → ${JSON.stringify(after).length} chars`;
    }
}

/**
 * Reorder Constraints - Optimize for LLM Processing
 *
 * Reorders constraints/instructions for better LLM comprehension.
 * Target: Improve quality, success rate.
 */
export class ReorderConstraintsOperator implements IMutationOperator {
    name: MutationType = 'reorder_constraints';
    description = 'Optimize constraint ordering for LLM processing';
    targetChromosome: 'c1' = 'c1';

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);

        // Reorder genes by priority
        mutant.chromosomes.c1.operations = this.reorderGenes(
            mutant.chromosomes.c1.operations
        );

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: JSON.stringify(context.genome.chromosomes.c1),
            after: JSON.stringify(mutant.chromosomes.c1),
            diff: 'Reordered genes for optimal LLM processing',
            trigger: 'drift-detected',
            reason: context.reason,
            sandboxTested: false,
            promoted: false,
            proposer: 'system',
        };

        return {
            success: true,
            mutant,
            mutation,
            description: 'Reordered constraints for better LLM comprehension',
            expectedImprovement: 0.10, // 10% improvement
        };
    }

    estimateImprovement(_context: MutationContext): number {
        return 0.10; // Consistent 10% improvement
    }

    private reorderGenes(genes: OperativeGene[]): OperativeGene[] {
        // Priority order: tool-usage > reasoning > communication
        const priorityOrder: Record<string, number> = {
            'tool-usage': 1,
            'reasoning': 2,
            'coding-patterns': 3,
            'communication': 4,
            'data-processing': 5,
            'error-handling': 6,
        };

        return [...genes].sort((a, b) => {
            const priorityA = priorityOrder[a.category] || 999;
            const priorityB = priorityOrder[b.category] || 999;
            return priorityA - priorityB;
        });
    }

    private deepClone(genome: GenomeV2): GenomeV2 {
        return JSON.parse(JSON.stringify(genome));
    }

    private generateId(): string {
        return `mut_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}

/**
 * Safety Reinforcement - Strengthen Security
 *
 * Adds or strengthens safety constraints.
 * Target: Reduce intervention rate, improve safety.
 */
export class SafetyReinforcementOperator implements IMutationOperator {
    name: MutationType = 'safety_reinforcement';
    description = 'Strengthen security and safety boundaries';
    targetChromosome: 'c1' = 'c1';

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);

        // Add safety checks to operative genes
        mutant.chromosomes.c1.operations = mutant.chromosomes.c1.operations.map((gene) =>
            this.reinforceGene(gene)
        );

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: JSON.stringify(context.genome.chromosomes.c1),
            after: JSON.stringify(mutant.chromosomes.c1),
            diff: 'Added safety reinforcements',
            trigger: 'drift-detected',
            reason: context.reason,
            sandboxTested: false,
            promoted: false,
            proposer: 'system',
        };

        return {
            success: true,
            mutant,
            mutation,
            description: 'Reinforced safety constraints',
            expectedImprovement: 0.08, // 8% improvement
        };
    }

    estimateImprovement(context: MutationContext): number {
        // Higher improvement if intervention rate is high
        const interventionRate = context.genome.fitness.interventionRate;
        return interventionRate * 0.15; // Up to 15% improvement
    }

    private reinforceGene(gene: OperativeGene): OperativeGene {
        const reinforced = { ...gene };

        // Add safety checks based on category
        if (gene.category === 'tool-usage') {
            reinforced.content += '\n\nSAFETY: Always validate inputs before tool execution.';
        } else if (gene.category === 'coding-patterns') {
            reinforced.content += '\n\nSAFETY: Check for security vulnerabilities (XSS, SQL injection, etc.).';
        }

        return reinforced;
    }

    private deepClone(genome: GenomeV2): GenomeV2 {
        return JSON.parse(JSON.stringify(genome));
    }

    private generateId(): string {
        return `mut_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}

/**
 * Tool Selection Bias - Optimize Tool Usage
 *
 * Adjusts tool usage patterns based on success rates.
 * Target: Improve success rate, reduce latency.
 */
export class ToolSelectionBiasOperator implements IMutationOperator {
    name: MutationType = 'tool_selection_bias';
    description = 'Adjust tool usage patterns based on performance';
    targetChromosome: 'c1' = 'c1';

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);

        // Adjust tool selection in operative genes
        const toolGenes = mutant.chromosomes.c1.operations.filter(
            (g) => g.category === 'tool-usage'
        );

        for (const gene of toolGenes) {
            gene.content = this.adjustToolBias(gene);
        }

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: JSON.stringify(context.genome.chromosomes.c1),
            after: JSON.stringify(mutant.chromosomes.c1),
            diff: 'Adjusted tool selection bias',
            trigger: 'drift-detected',
            reason: context.reason,
            sandboxTested: false,
            promoted: false,
            proposer: 'system',
        };

        return {
            success: true,
            mutant,
            mutation,
            description: 'Optimized tool usage patterns',
            expectedImprovement: 0.12, // 12% improvement
        };
    }

    estimateImprovement(_context: MutationContext): number {
        return 0.12; // Consistent 12% improvement
    }

    private adjustToolBias(gene: OperativeGene): string {
        let content = gene.content;

        // Favor high-success-rate tools
        if (gene.successRate > 0.8) {
            content += '\n\nPRIORITY: Prefer this tool for similar tasks (high success rate).';
        } else if (gene.successRate < 0.5) {
            content += '\n\nCAUTION: Use this tool sparingly (low success rate). Consider alternatives.';
        }

        return content;
    }

    private deepClone(genome: GenomeV2): GenomeV2 {
        return JSON.parse(JSON.stringify(genome));
    }

    private generateId(): string {
        return `mut_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}

// ─── Mutation Engine ────────────────────────────────────────

/**
 * MutationEngine - Orchestrates mutation operations
 *
 * Selects and applies appropriate mutations based on context.
 */
export class MutationEngine {
    private operators: Map<MutationType, IMutationOperator> = new Map();

    constructor() {
        // Register all operators
        this.registerOperator(new CompressInstructionsOperator());
        this.registerOperator(new ReorderConstraintsOperator());
        this.registerOperator(new SafetyReinforcementOperator());
        this.registerOperator(new ToolSelectionBiasOperator());
    }

    /**
     * Register a custom mutation operator
     */
    public registerOperator(operator: IMutationOperator): void {
        this.operators.set(operator.name, operator);
    }

    /**
     * Generate N mutation candidates
     *
     * Returns multiple mutants for sandbox testing.
     */
    public async generateMutants(
        context: MutationContext,
        count: number = 3
    ): Promise<MutationResult[]> {
        const results: MutationResult[] = [];

        // Select top N operators by estimated improvement
        const rankedOperators = this.rankOperators(context);
        const selected = rankedOperators.slice(0, count);

        // Apply each operator
        for (const operator of selected) {
            const result = await operator.mutate(context);
            results.push(result);
        }

        return results;
    }

    /**
     * Rank operators by estimated improvement
     */
    private rankOperators(context: MutationContext): IMutationOperator[] {
        const scored = Array.from(this.operators.values()).map((op) => ({
            operator: op,
            score: op.estimateImprovement(context),
        }));

        return scored.sort((a, b) => b.score - a.score).map((s) => s.operator);
    }

    /**
     * Get operator by name
     */
    public getOperator(name: MutationType): IMutationOperator | undefined {
        return this.operators.get(name);
    }

    /**
     * List all registered operators
     */
    public listOperators(): IMutationOperator[] {
        return Array.from(this.operators.values());
    }
}
