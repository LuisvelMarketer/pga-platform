/**
 * Token Utilities — Estimation and Efficiency Metrics
 *
 * Provides token counting, efficiency scoring, and compression ratio
 * calculations for the PGA evolutionary token compression system.
 *
 * No external dependencies — uses character-based estimation (1 token ≈ 4 chars).
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

/**
 * Estimate token count from text content.
 *
 * Uses the standard approximation: 1 token ≈ 4 characters.
 * Accurate enough for budget/efficiency decisions without
 * requiring a tokenizer dependency.
 */
export function estimateTokenCount(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Calculate token efficiency: fitness per token.
 *
 * Higher values = gene achieves more fitness with fewer tokens.
 * Used to rank genes when token budget is exceeded.
 *
 * @param compositeFitness - Overall fitness score (0-1)
 * @param tokenCount - Number of tokens in the gene content
 * @returns Efficiency ratio (higher = better)
 */
export function tokenEfficiency(compositeFitness: number, tokenCount: number): number {
    if (tokenCount <= 0) return 0;
    return compositeFitness / tokenCount;
}

/**
 * Calculate compression ratio between original and compressed content.
 *
 * @param originalTokens - Token count before compression
 * @param compressedTokens - Token count after compression
 * @returns Ratio (0-1 = good compression, >1 = expansion)
 */
export function compressionRatio(originalTokens: number, compressedTokens: number): number {
    if (originalTokens <= 0) return 1;
    return compressedTokens / originalTokens;
}
