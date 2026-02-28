/**
 * LearningAnnouncer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LearningAnnouncer } from '../LearningAnnouncer';
import type { UserDNA } from '../../types';

const createMockDNA = (overrides: Partial<UserDNA> = {}): UserDNA => ({
  userId: 'user-1',
  genomeId: 'genome-1',
  traits: {
    communicationStyle: 'formal',
    verbosity: 'balanced',
    tone: 'friendly',
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
  generation: 0,
  lastEvolved: new Date(),
  ...overrides,
});

describe('LearningAnnouncer', () => {
  let learningAnnouncer: LearningAnnouncer;

  beforeEach(() => {
    learningAnnouncer = new LearningAnnouncer();
  });

  describe('detectLearning', () => {
    it('should detect first interaction', () => {
      const currentDNA = createMockDNA();

      const events = learningAnnouncer.detectLearning(null, currentDNA);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('preference');
      expect(events[0].category).toBe('initialization');
      expect(events[0].whatLearned).toContain('Started building');
    });

    it('should detect communication style change', () => {
      const previousDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          communicationStyle: 'formal',
        },
      });

      const currentDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          communicationStyle: 'technical',
        },
      });

      const events = learningAnnouncer.detectLearning(previousDNA, currentDNA);

      const styleEvent = events.find(e => e.category === 'communication');
      expect(styleEvent).toBeDefined();
      expect(styleEvent?.whatLearned).toContain('technical communication');
      expect(styleEvent?.confidence).toBeGreaterThan(0.7);
    });

    it('should detect verbosity change', () => {
      const previousDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          verbosity: 'balanced',
        },
      });

      const currentDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          verbosity: 'terse',
        },
      });

      const events = learningAnnouncer.detectLearning(previousDNA, currentDNA);

      const verbosityEvent = events.find(e =>
        e.whatLearned.includes('terse responses')
      );
      expect(verbosityEvent).toBeDefined();
      expect(verbosityEvent?.type).toBe('preference');
    });

    it('should detect new tools', () => {
      const previousDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          preferredTools: ['git'],
        },
      });

      const currentDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          preferredTools: ['git', 'docker', 'postgres'],
        },
      });

      const events = learningAnnouncer.detectLearning(previousDNA, currentDNA);

      const toolsEvent = events.find(e => e.category === 'tools');
      expect(toolsEvent).toBeDefined();
      expect(toolsEvent?.whatLearned).toContain('docker');
      expect(toolsEvent?.whatLearned).toContain('postgres');
    });

    it('should detect expertise improvement', () => {
      const previousDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          domainExpertise: { coding: 0.5 },
        },
      });

      const currentDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          domainExpertise: { coding: 0.7 },
        },
      });

      const events = learningAnnouncer.detectLearning(previousDNA, currentDNA);

      const expertiseEvent = events.find(e => e.type === 'improvement');
      expect(expertiseEvent).toBeDefined();
      expect(expertiseEvent?.whatLearned).toContain('coding');
      expect(expertiseEvent?.whatLearned).toContain('70%');
    });

    it('should detect task success rate improvement', () => {
      const previousDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          taskSuccessRates: { debugging: 0.6 },
        },
      });

      const currentDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          taskSuccessRates: { debugging: 0.8 },
        },
      });

      const events = learningAnnouncer.detectLearning(previousDNA, currentDNA);

      const successEvent = events.find(e =>
        e.whatLearned.includes('success rate')
      );
      expect(successEvent).toBeDefined();
      expect(successEvent?.type).toBe('improvement');
    });

    it('should detect task performance drop', () => {
      const previousDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          taskSuccessRates: { optimization: 0.8 },
        },
      });

      const currentDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          taskSuccessRates: { optimization: 0.5 },
        },
      });

      const events = learningAnnouncer.detectLearning(previousDNA, currentDNA);

      const dropEvent = events.find(e => e.type === 'pattern');
      expect(dropEvent).toBeDefined();
      expect(dropEvent?.whatLearned).toContain('challenging');
    });

    it('should detect peak productivity hours', () => {
      const previousDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          peakProductivityHours: [],
        },
      });

      const currentDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          peakProductivityHours: [9, 10, 14],
        },
      });

      const events = learningAnnouncer.detectLearning(previousDNA, currentDNA);

      const hoursEvent = events.find(e => e.category === 'timing');
      expect(hoursEvent).toBeDefined();
      expect(hoursEvent?.whatLearned).toContain('peak hours');
    });

    it('should detect adaptation rate change', () => {
      const previousDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          adaptationRate: 0.5,
        },
      });

      const currentDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          adaptationRate: 0.8,
        },
      });

      const events = learningAnnouncer.detectLearning(previousDNA, currentDNA);

      const adaptEvent = events.find(e => e.type === 'adaptation');
      expect(adaptEvent).toBeDefined();
      expect(adaptEvent?.whatLearned).toContain('receptive');
    });

    it('should not detect insignificant changes', () => {
      const previousDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          domainExpertise: { coding: 0.5 },
        },
      });

      const currentDNA = createMockDNA({
        traits: {
          ...createMockDNA().traits,
          domainExpertise: { coding: 0.55 }, // Only 5% improvement
        },
      });

      const events = learningAnnouncer.detectLearning(previousDNA, currentDNA);

      const expertiseEvent = events.find(e => e.type === 'improvement');
      expect(expertiseEvent).toBeUndefined();
    });
  });

  describe('formatLearningAnnouncement', () => {
    it('should return empty string for no events', () => {
      const announcement = learningAnnouncer.formatLearningAnnouncement([]);

      expect(announcement).toBe('');
    });

    it('should format single learning event', () => {
      const events = [
        {
          type: 'preference' as const,
          category: 'communication',
          whatLearned: 'You prefer technical communication',
          howItHelps: 'I\'ll match this style',
          confidence: 0.9,
          timestamp: new Date(),
        },
      ];

      const announcement = learningAnnouncer.formatLearningAnnouncement(events);

      expect(announcement).toContain('🧬 LEARNING ANNOUNCEMENT');
      expect(announcement).toContain('You prefer technical communication');
      expect(announcement).toContain('I\'ll match this style');
    });

    it('should show only highest confidence event', () => {
      const events = [
        {
          type: 'preference' as const,
          category: 'communication',
          whatLearned: 'Learning 1',
          howItHelps: 'Help 1',
          confidence: 0.7,
          timestamp: new Date(),
        },
        {
          type: 'improvement' as const,
          category: 'expertise',
          whatLearned: 'Learning 2',
          howItHelps: 'Help 2',
          confidence: 0.9,
          timestamp: new Date(),
        },
      ];

      const announcement = learningAnnouncer.formatLearningAnnouncement(events);

      expect(announcement).toContain('Learning 2');
      expect(announcement).not.toContain('Learning 1');
    });

    it('should mention additional learning count', () => {
      const events = Array.from({ length: 3 }, (_, i) => ({
        type: 'preference' as const,
        category: 'test',
        whatLearned: `Learning ${i}`,
        howItHelps: `Help ${i}`,
        confidence: 0.8,
        timestamp: new Date(),
      }));

      const announcement = learningAnnouncer.formatLearningAnnouncement(events);

      expect(announcement).toContain('2 other thing(s)');
    });

    it('should include appropriate icons', () => {
      const types: Array<'preference' | 'pattern' | 'adaptation' | 'improvement'> = [
        'preference',
        'pattern',
        'adaptation',
        'improvement',
      ];

      types.forEach(type => {
        const events = [
          {
            type,
            category: 'test',
            whatLearned: 'Test learning',
            howItHelps: 'Test help',
            confidence: 0.8,
            timestamp: new Date(),
          },
        ];

        const announcement = learningAnnouncer.formatLearningAnnouncement(events);
        expect(announcement).toMatch(/[⚙️🔍🔄📈]/);
      });
    });
  });

  describe('generateLearningSummary', () => {
    it('should generate comprehensive summary', () => {
      const dna = createMockDNA({
        generation: 10,
        traits: {
          communicationStyle: 'technical',
          verbosity: 'terse',
          tone: 'direct',
          preferredTools: ['git', 'docker'],
          preferredFormats: [],
          preferredLanguage: 'en',
          domainExpertise: {
            javascript: 0.9,
            react: 0.8,
          },
          taskSuccessRates: {},
          peakProductivityHours: [9, 10, 14],
          averageTurnsToSuccess: 0,
          retryPatterns: {},
          adaptationRate: 0.7,
          stabilityScore: 0.6,
        },
      });

      const events = [
        {
          type: 'improvement' as const,
          category: 'expertise',
          whatLearned: 'Your React expertise increased',
          howItHelps: 'More advanced guidance',
          confidence: 0.9,
          timestamp: new Date(),
        },
      ];

      const summary = learningAnnouncer.generateLearningSummary(dna, events);

      expect(summary).toContain('Your AI Learning Report');
      expect(summary).toContain('Generation: 10');
      expect(summary).toContain('Communication Style');
      expect(summary).toContain('technical');
      expect(summary).toContain('Detected Expertise');
      expect(summary).toContain('javascript');
      expect(summary).toContain('95%');
      expect(summary).toContain('Recent Learning');
      expect(summary).toContain('Productivity Patterns');
      expect(summary).toContain('9, 10, 14');
    });

    it('should handle DNA without expertise', () => {
      const dna = createMockDNA({
        generation: 1,
      });

      const summary = learningAnnouncer.generateLearningSummary(dna, []);

      expect(summary).toContain('Your AI Learning Report');
      expect(summary).toContain('Generation: 1');
    });

    it('should show recent learning events', () => {
      const dna = createMockDNA();
      const events = Array.from({ length: 3 }, (_, i) => ({
        type: 'preference' as const,
        category: 'test',
        whatLearned: `Event ${i}`,
        howItHelps: `Help ${i}`,
        confidence: 0.8,
        timestamp: new Date(),
      }));

      const summary = learningAnnouncer.generateLearningSummary(dna, events);

      expect(summary).toContain('Event 0');
      expect(summary).toContain('Event 1');
      expect(summary).toContain('Event 2');
    });
  });
});
