/**
 * Token Utilities Tests
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect } from 'vitest';
import { estimateTokenCount, tokenEfficiency, compressionRatio } from '../tokens.js';

describe('estimateTokenCount', () => {
    it('should return 0 for empty string', () => {
        expect(estimateTokenCount('')).toBe(0);
    });

    it('should return 0 for null/undefined input', () => {
        expect(estimateTokenCount(null as any)).toBe(0);
        expect(estimateTokenCount(undefined as any)).toBe(0);
    });

    it('should estimate 1 token for 4 characters or fewer', () => {
        expect(estimateTokenCount('abcd')).toBe(1);
        expect(estimateTokenCount('ab')).toBe(1);
        expect(estimateTokenCount('a')).toBe(1);
    });

    it('should estimate correctly for longer text', () => {
        // 'hello world' = 11 chars → ceil(11/4) = 3
        expect(estimateTokenCount('hello world')).toBe(3);
    });

    it('should estimate for typical gene content', () => {
        const geneContent = 'Use tools efficiently and appropriately for each task.';
        // 55 chars → ceil(55/4) = 14
        expect(estimateTokenCount(geneContent)).toBe(14);
    });

    it('should handle very long content', () => {
        const longContent = 'a'.repeat(4000);
        expect(estimateTokenCount(longContent)).toBe(1000);
    });
});

describe('tokenEfficiency', () => {
    it('should calculate fitness per token', () => {
        expect(tokenEfficiency(0.8, 25)).toBeCloseTo(0.032);
    });

    it('should return 0 when tokenCount is 0', () => {
        expect(tokenEfficiency(0.5, 0)).toBe(0);
    });

    it('should return 0 when tokenCount is negative', () => {
        expect(tokenEfficiency(0.5, -1)).toBe(0);
    });

    it('should show higher efficiency for fewer tokens with same fitness', () => {
        const highEff = tokenEfficiency(0.8, 10);  // 0.08
        const lowEff = tokenEfficiency(0.8, 100);   // 0.008
        expect(highEff).toBeGreaterThan(lowEff);
    });
});

describe('compressionRatio', () => {
    it('should calculate ratio correctly', () => {
        expect(compressionRatio(100, 50)).toBe(0.5);
    });

    it('should return 1 for no compression', () => {
        expect(compressionRatio(100, 100)).toBe(1);
    });

    it('should return > 1 for expansion', () => {
        expect(compressionRatio(50, 100)).toBe(2);
    });

    it('should return 1 when originalTokens is 0', () => {
        expect(compressionRatio(0, 50)).toBe(1);
    });

    it('should return 0 for perfect compression', () => {
        expect(compressionRatio(100, 0)).toBe(0);
    });
});
