/**
 * ProactiveSuggestions Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProactiveSuggestions } from '../ProactiveSuggestions';
import type { StorageAdapter } from '../../interfaces/StorageAdapter';
import type { UserDNA } from '../../types';

// Mock Storage Adapter
class MockStorageAdapter implements Partial<StorageAdapter> {
  private interactions: any[] = [];
  private dna: UserDNA | null = null;

  setInteractions(interactions: any[]) {
    this.interactions = interactions;
  }

  setDNA(dna: UserDNA) {
    this.dna = dna;
  }

  async getRecentInteractions(genomeId: string, userId: string, limit?: number) {
    return this.interactions.slice(0, limit || 20);
  }

  async loadDNA() {
    return this.dna;
  }

  // Implement other required methods as no-ops
  async initialize() {}
  async saveGenome() {}
  async loadGenome() { return null; }
  async deleteGenome() {}
  async listGenomes() { return []; }
  async saveDNA() {}
  async logMutation() {}
  async getMutationHistory() { return []; }
  async getGeneMutationHistory() { return []; }
  async recordInteraction() {}
  async recordFeedback() {}
  async getAnalytics() {
    return {
      totalMutations: 0,
      totalInteractions: 0,
      avgFitnessImprovement: 0,
      userSatisfaction: 0,
      topGenes: [],
    };
  }
}

describe('ProactiveSuggestions', () => {
  let proactiveSuggestions: ProactiveSuggestions;
  let mockStorage: MockStorageAdapter;

  beforeEach(() => {
    mockStorage = new MockStorageAdapter();
    proactiveSuggestions = new ProactiveSuggestions(mockStorage as StorageAdapter);
  });

  describe('generateSuggestions', () => {
    it('should return empty array for new user', async () => {
      mockStorage.setInteractions([]);
      mockStorage.setDNA(null as any);

      const suggestions = await proactiveSuggestions.generateSuggestions(
        'user-1',
        'genome-1',
        'Hello'
      );

      expect(suggestions).toHaveLength(0);
    });

    it('should detect repeated errors', async () => {
      mockStorage.setInteractions([
        {
          userMessage: 'I got a TypeError in my code',
          timestamp: new Date(),
        },
        {
          userMessage: 'TypeError again',
          timestamp: new Date(),
        },
        {
          userMessage: 'Same TypeError error',
          timestamp: new Date(),
        },
      ]);

      mockStorage.setDNA({
        userId: 'user-1',
        genomeId: 'genome-1',
        traits: {
          communicationStyle: 'technical',
          verbosity: 'balanced',
          tone: 'professional',
          preferredTools: [],
          preferredFormats: [],
          preferredLanguage: 'en',
          domainExpertise: {},
          taskSuccessRates: {},
          peakProductivityHours: [],
          averageTurnsToSuccess: 0,
          retryPatterns: {},
          adaptationRate: 0.5,
          stabilityScore: 0.5,
        },
        confidence: {},
        generation: 3,
        lastEvolved: new Date(),
      });

      const suggestions = await proactiveSuggestions.generateSuggestions(
        'user-1',
        'genome-1',
        'Another error appeared'
      );

      const errorSuggestion = suggestions.find(s => s.type === 'warning');
      expect(errorSuggestion).toBeDefined();
      expect(errorSuggestion?.title).toContain('Recurring Error');
      expect(errorSuggestion?.priority).toBe('high');
    });

    it('should suggest performance optimization', async () => {
      mockStorage.setInteractions([
        {
          userMessage: 'My app is slow',
          timestamp: new Date(),
        },
        {
          userMessage: 'Performance issues continue',
          timestamp: new Date(),
        },
      ]);

      mockStorage.setDNA({
        userId: 'user-1',
        genomeId: 'genome-1',
        traits: {
          communicationStyle: 'technical',
          verbosity: 'balanced',
          tone: 'professional',
          preferredTools: [],
          preferredFormats: [],
          preferredLanguage: 'en',
          domainExpertise: {},
          taskSuccessRates: {},
          peakProductivityHours: [],
          averageTurnsToSuccess: 0,
          retryPatterns: {},
          adaptationRate: 0.5,
          stabilityScore: 0.5,
        },
        confidence: {},
        generation: 2,
        lastEvolved: new Date(),
      });

      const suggestions = await proactiveSuggestions.generateSuggestions(
        'user-1',
        'genome-1',
        'Still having performance problems'
      );

      const perfSuggestion = suggestions.find(s => s.type === 'improvement');
      expect(perfSuggestion).toBeDefined();
      expect(perfSuggestion?.title).toContain('Performance');
    });

    it('should suggest testing for code without tests', async () => {
      mockStorage.setInteractions([]);
      mockStorage.setDNA({
        userId: 'user-1',
        genomeId: 'genome-1',
        traits: {
          communicationStyle: 'technical',
          verbosity: 'balanced',
          tone: 'professional',
          preferredTools: [],
          preferredFormats: [],
          preferredLanguage: 'en',
          domainExpertise: {},
          taskSuccessRates: {},
          peakProductivityHours: [],
          averageTurnsToSuccess: 0,
          retryPatterns: {},
          adaptationRate: 0.5,
          stabilityScore: 0.5,
        },
        confidence: {},
        generation: 1,
        lastEvolved: new Date(),
      });

      const suggestions = await proactiveSuggestions.generateSuggestions(
        'user-1',
        'genome-1',
        'I wrote a function to handle authentication'
      );

      const testSuggestion = suggestions.find(s =>
        s.title.includes('Testing')
      );
      expect(testSuggestion).toBeDefined();
      expect(testSuggestion?.type).toBe('improvement');
    });

    it('should suggest documentation for complex code', async () => {
      mockStorage.setInteractions([]);
      mockStorage.setDNA({
        userId: 'user-1',
        genomeId: 'genome-1',
        traits: {
          communicationStyle: 'technical',
          verbosity: 'balanced',
          tone: 'professional',
          preferredTools: [],
          preferredFormats: [],
          preferredLanguage: 'en',
          domainExpertise: {},
          taskSuccessRates: {},
          peakProductivityHours: [],
          averageTurnsToSuccess: 0,
          retryPatterns: {},
          adaptationRate: 0.5,
          stabilityScore: 0.5,
        },
        confidence: {},
        generation: 1,
        lastEvolved: new Date(),
      });

      const suggestions = await proactiveSuggestions.generateSuggestions(
        'user-1',
        'genome-1',
        'I implemented a complex algorithm'
      );

      const docSuggestion = suggestions.find(s =>
        s.title.includes('Documentation')
      );
      expect(docSuggestion).toBeDefined();
      expect(docSuggestion?.type).toBe('improvement');
    });

    it('should detect incomplete tasks', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      mockStorage.setInteractions([
        {
          userMessage: 'I\'ll handle this later',
          timestamp: twoDaysAgo,
        },
      ]);

      mockStorage.setDNA({
        userId: 'user-1',
        genomeId: 'genome-1',
        traits: {
          communicationStyle: 'technical',
          verbosity: 'balanced',
          tone: 'professional',
          preferredTools: [],
          preferredFormats: [],
          preferredLanguage: 'en',
          domainExpertise: {},
          taskSuccessRates: {},
          peakProductivityHours: [],
          averageTurnsToSuccess: 0,
          retryPatterns: {},
          adaptationRate: 0.5,
          stabilityScore: 0.5,
        },
        confidence: {},
        generation: 2,
        lastEvolved: new Date(),
      });

      const suggestions = await proactiveSuggestions.generateSuggestions(
        'user-1',
        'genome-1',
        'What should I do next?'
      );

      const reminderSuggestion = suggestions.find(s => s.type === 'reminder');
      expect(reminderSuggestion).toBeDefined();
      expect(reminderSuggestion?.title).toContain('Reminder');
    });

    it('should sort suggestions by priority', async () => {
      mockStorage.setInteractions([
        {
          userMessage: 'TypeError occurred',
          timestamp: new Date(),
        },
        {
          userMessage: 'TypeError again',
          timestamp: new Date(),
        },
      ]);

      mockStorage.setDNA({
        userId: 'user-1',
        genomeId: 'genome-1',
        traits: {
          communicationStyle: 'technical',
          verbosity: 'balanced',
          tone: 'professional',
          preferredTools: [],
          preferredFormats: [],
          preferredLanguage: 'en',
          domainExpertise: {},
          taskSuccessRates: {},
          peakProductivityHours: [],
          averageTurnsToSuccess: 0,
          retryPatterns: {},
          adaptationRate: 0.5,
          stabilityScore: 0.5,
        },
        confidence: {},
        generation: 2,
        lastEvolved: new Date(),
      });

      const suggestions = await proactiveSuggestions.generateSuggestions(
        'user-1',
        'genome-1',
        'I need to write some code'
      );

      // Should be sorted by priority * confidence
      if (suggestions.length > 1) {
        for (let i = 0; i < suggestions.length - 1; i++) {
          const current = suggestions[i];
          const next = suggestions[i + 1];

          const priorityScores = { critical: 4, high: 3, medium: 2, low: 1 };
          const currentScore = (priorityScores[current.priority] || 1) * current.confidence;
          const nextScore = (priorityScores[next.priority] || 1) * next.confidence;

          expect(currentScore).toBeGreaterThanOrEqual(nextScore);
        }
      }
    });
  });

  describe('formatSuggestionsPrompt', () => {
    it('should return empty string for no suggestions', () => {
      const prompt = proactiveSuggestions.formatSuggestionsPrompt([]);

      expect(prompt).toBe('');
    });

    it('should format suggestions into prompt', () => {
      const suggestions = [
        {
          type: 'improvement' as const,
          priority: 'high' as const,
          title: 'Test Suggestion',
          description: 'This is a test',
          action: 'Do something',
          confidence: 0.8,
        },
      ];

      const prompt = proactiveSuggestions.formatSuggestionsPrompt(suggestions);

      expect(prompt).toContain('PROACTIVE INTELLIGENCE');
      expect(prompt).toContain('Test Suggestion');
      expect(prompt).toContain('This is a test');
      expect(prompt).toContain('Do something');
    });

    it('should include icons for suggestion types', () => {
      const suggestions = [
        {
          type: 'improvement' as const,
          priority: 'medium' as const,
          title: 'Test 1',
          description: 'Desc 1',
          confidence: 0.7,
        },
        {
          type: 'warning' as const,
          priority: 'high' as const,
          title: 'Test 2',
          description: 'Desc 2',
          confidence: 0.8,
        },
      ];

      const prompt = proactiveSuggestions.formatSuggestionsPrompt(suggestions);

      expect(prompt).toContain('🚀'); // improvement icon
      expect(prompt).toContain('⚠️'); // warning icon
    });

    it('should only show top 3 suggestions', () => {
      const suggestions = Array.from({ length: 5 }, (_, i) => ({
        type: 'improvement' as const,
        priority: 'medium' as const,
        title: `Suggestion ${i}`,
        description: `Description ${i}`,
        confidence: 0.7,
      }));

      const prompt = proactiveSuggestions.formatSuggestionsPrompt(suggestions);

      expect(prompt).toContain('Suggestion 0');
      expect(prompt).toContain('Suggestion 1');
      expect(prompt).toContain('Suggestion 2');
      expect(prompt).not.toContain('Suggestion 3');
      expect(prompt).not.toContain('Suggestion 4');
    });
  });
});
