/**
 * ContextMemory Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContextMemory } from '../ContextMemory';
import type { StorageAdapter } from '../../interfaces/StorageAdapter';

// Mock Storage Adapter
class MockStorageAdapter implements Partial<StorageAdapter> {
  private interactions: any[] = [];

  setInteractions(interactions: any[]) {
    this.interactions = interactions;
  }

  async getRecentInteractions(genomeId: string, userId: string, limit?: number) {
    return this.interactions.slice(0, limit || 50);
  }

  // Implement other required methods as no-ops
  async initialize() {}
  async saveGenome() {}
  async loadGenome() { return null; }
  async deleteGenome() {}
  async listGenomes() { return []; }
  async saveDNA() {}
  async loadDNA() { return null; }
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

describe('ContextMemory', () => {
  let contextMemory: ContextMemory;
  let mockStorage: MockStorageAdapter;

  beforeEach(() => {
    mockStorage = new MockStorageAdapter();
    contextMemory = new ContextMemory(mockStorage as StorageAdapter);
  });

  describe('buildContext', () => {
    it('should return empty context for new user', async () => {
      mockStorage.setInteractions([]);

      const context = await contextMemory.buildContext('user-1', 'genome-1');

      expect(context.userId).toBe('user-1');
      expect(context.genomeId).toBe('genome-1');
      expect(context.recentMessages).toHaveLength(0);
      expect(context.projectContext).toHaveLength(0);
      expect(context.technicalPreferences.languages).toHaveLength(0);
    });

    it('should extract projects from interactions', async () => {
      mockStorage.setInteractions([
        {
          userMessage: 'I\'m building a React app with TypeScript',
          assistantResponse: 'Great! Let me help you.',
          timestamp: new Date(),
          score: 0.8,
        },
        {
          userMessage: 'My e-commerce project uses Postgres',
          assistantResponse: 'Understood.',
          timestamp: new Date(),
          score: 0.9,
        },
      ]);

      const context = await contextMemory.buildContext('user-1', 'genome-1');

      expect(context.projectContext.length).toBeGreaterThan(0);
      const project = context.projectContext[0];
      expect(project.technology).toContain('react');
      expect(project.technology).toContain('typescript');
    });

    it('should detect technical preferences', async () => {
      mockStorage.setInteractions([
        {
          userMessage: 'Help me with JavaScript and React',
          assistantResponse: 'Sure!',
          timestamp: new Date(),
        },
        {
          userMessage: 'I need TypeScript help with Express',
          assistantResponse: 'Of course!',
          timestamp: new Date(),
        },
        {
          userMessage: 'Setting up Docker and Postgres',
          assistantResponse: 'Let\'s do it.',
          timestamp: new Date(),
        },
      ]);

      const context = await contextMemory.buildContext('user-1', 'genome-1');

      expect(context.technicalPreferences.languages).toContain('javascript');
      expect(context.technicalPreferences.languages).toContain('typescript');
      expect(context.technicalPreferences.frameworks).toContain('react');
      expect(context.technicalPreferences.frameworks).toContain('express');
      expect(context.technicalPreferences.tools).toContain('docker');
      expect(context.technicalPreferences.tools).toContain('postgres');
    });

    it('should identify frequent topics', async () => {
      mockStorage.setInteractions([
        {
          userMessage: 'I have a bug in my code',
          assistantResponse: 'Let me help debug.',
          timestamp: new Date(),
        },
        {
          userMessage: 'Another error appeared',
          assistantResponse: 'Let\'s fix it.',
          timestamp: new Date(),
        },
        {
          userMessage: 'Need to optimize performance',
          assistantResponse: 'Sure!',
          timestamp: new Date(),
        },
      ]);

      const context = await contextMemory.buildContext('user-1', 'genome-1');

      expect(context.commonPatterns.frequentTopics).toContain('debugging');
      expect(context.commonPatterns.frequentTopics.length).toBeGreaterThan(0);
    });

    it('should track recent messages', async () => {
      const interactions = Array.from({ length: 15 }, (_, i) => ({
        userMessage: `Message ${i}`,
        assistantResponse: `Response ${i}`,
        timestamp: new Date(),
        score: 0.8,
      }));

      mockStorage.setInteractions(interactions);

      const context = await contextMemory.buildContext('user-1', 'genome-1');

      // Should only keep last 10
      expect(context.recentMessages).toHaveLength(10);
      expect(context.recentMessages[0].userMessage).toBe('Message 0');
    });
  });

  describe('getMemoryPrompt', () => {
    it('should return empty string for new user', async () => {
      mockStorage.setInteractions([]);

      const prompt = await contextMemory.getMemoryPrompt('user-1', 'genome-1');

      expect(prompt).toBe('');
    });

    it('should generate memory prompt with conversation history', async () => {
      mockStorage.setInteractions([
        {
          userMessage: 'Help me with React',
          assistantResponse: 'Sure!',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          score: 0.9,
        },
      ]);

      const prompt = await contextMemory.getMemoryPrompt('user-1', 'genome-1');

      expect(prompt).toContain('CONVERSATION MEMORY');
      expect(prompt).toContain('Last conversation');
      expect(prompt).toContain('Help me with React');
    });

    it('should include active projects in prompt', async () => {
      mockStorage.setInteractions([
        {
          userMessage: 'My React project with TypeScript needs authentication',
          assistantResponse: 'Let\'s implement it.',
          timestamp: new Date(),
        },
      ]);

      const prompt = await contextMemory.getMemoryPrompt('user-1', 'genome-1');

      expect(prompt).toContain('ACTIVE PROJECTS');
      expect(prompt).toContain('react');
      expect(prompt).toContain('typescript');
    });

    it('should include technical preferences in prompt', async () => {
      mockStorage.setInteractions([
        {
          userMessage: 'I use JavaScript and React',
          assistantResponse: 'Got it!',
          timestamp: new Date(),
        },
      ]);

      const prompt = await contextMemory.getMemoryPrompt('user-1', 'genome-1');

      expect(prompt).toContain('TECHNICAL PREFERENCES');
      expect(prompt).toContain('javascript');
    });

    it('should include learned patterns in prompt', async () => {
      mockStorage.setInteractions([
        {
          userMessage: 'Bug in my code',
          assistantResponse: 'Let\'s debug.',
          timestamp: new Date(),
        },
        {
          userMessage: 'Another bug appeared',
          assistantResponse: 'I\'ll help.',
          timestamp: new Date(),
        },
      ]);

      const prompt = await contextMemory.getMemoryPrompt('user-1', 'genome-1');

      expect(prompt).toContain('LEARNED PATTERNS');
      expect(prompt).toContain('debugging');
    });
  });
});
