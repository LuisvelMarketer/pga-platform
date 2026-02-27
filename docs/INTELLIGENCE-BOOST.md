# 🧠 Intelligence Boost — Technical Documentation

## Overview

Intelligence Boost transforms PGA agents from basic AI assistants into genius-level intelligent systems. This document explains the architecture, implementation, and usage of the 5 intelligence systems.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GenomeInstance (PGA.ts)                   │
│  Orchestrates all intelligence systems                       │
└───────────┬──────────────────────────────────────────────────┘
            │
            ├─► ContextMemory ──────► Perfect conversation memory
            │                         - Project tracking
            │                         - Tech preferences
            │                         - Pattern detection
            │
            ├─► ProactiveSuggestions ► Anticipates user needs
            │                          - Error detection
            │                          - Optimization suggestions
            │                          - Task reminders
            │
            ├─► LearningAnnouncer ───► Makes learning visible
            │                          - DNA change detection
            │                          - Learning reports
            │                          - Real-time feedback
            │
            ├─► PromptAssembler ─────► Injects intelligence into prompts
            │                          - Memory injection
            │                          - Suggestion injection
            │                          - Context-aware assembly
            │
            └─► DNAProfile ──────────► Tracks user evolution
                                       - Communication style
                                       - Expertise tracking
                                       - Adaptation patterns
```

---

## 1. Context Memory

**File:** `packages/core/src/core/ContextMemory.ts`
**Purpose:** Gives the agent perfect memory of all past conversations

### Key Features

- **Conversation History**: Remembers all previous messages
- **Project Tracking**: Automatically detects and tracks user projects
- **Technical Preferences**: Learns preferred languages, frameworks, tools
- **Pattern Detection**: Identifies common topics, errors, and work patterns
- **Time Awareness**: Tracks peak productivity hours

### API

```typescript
class ContextMemory {
  /**
   * Build complete context from user's conversation history
   */
  async buildContext(userId: string, genomeId: string): Promise<ConversationContext>

  /**
   * Generate memory-aware prompt injection
   * This is automatically injected into the system prompt
   */
  async getMemoryPrompt(userId: string, genomeId: string): Promise<string>
}
```

### Data Structures

```typescript
interface ConversationContext {
  userId: string;
  genomeId: string;
  recentMessages: MessageMemory[];       // Last 10 messages
  projectContext: ProjectContext[];      // Active projects
  technicalPreferences: TechnicalPreferences;
  commonPatterns: CommonPatterns;
}

interface ProjectContext {
  name: string;
  technology: string[];
  status: 'active' | 'completed' | 'paused';
  lastMentioned: Date;
  description: string;
}

interface TechnicalPreferences {
  languages: string[];           // e.g., ['javascript', 'typescript']
  frameworks: string[];          // e.g., ['react', 'express']
  tools: string[];               // e.g., ['git', 'docker']
  codeStyle: 'minimal' | 'documented' | 'verbose';
}

interface CommonPatterns {
  frequentTopics: string[];      // e.g., ['debugging', 'optimization']
  commonErrors: string[];        // e.g., ['TypeError', 'NetworkError']
  successfulApproaches: string[];
  timePreferences: {
    workHours: number[];         // e.g., [9, 10, 14, 15]
    responseLength: 'short' | 'medium' | 'long';
  };
}
```

### Example Usage

```typescript
const context = await genome.getConversationContext('user-123');

console.log(context.projectContext);
// [
//   {
//     name: 'user-project',
//     technology: ['react', 'typescript', 'postgres'],
//     status: 'active',
//     lastMentioned: '2025-02-27T10:30:00Z',
//     description: 'Building a React app with TypeScript...'
//   }
// ]

console.log(context.technicalPreferences);
// {
//   languages: ['javascript', 'typescript', 'python'],
//   frameworks: ['react', 'express'],
//   tools: ['git', 'docker'],
//   codeStyle: 'documented'
// }
```

### How It Works

1. **Data Collection**: Analyzes all stored interactions
2. **Project Detection**: Searches for project-related keywords
3. **Technology Extraction**: Identifies mentioned technologies
4. **Pattern Analysis**: Calculates frequencies and trends
5. **Prompt Injection**: Formats context for LLM consumption

### Memory Prompt Example

```markdown
## CONVERSATION MEMORY

You have perfect memory of previous conversations with this user:

Last conversation (2 hours ago):
- Topic: development
- User asked: "I'm building a React app with TypeScript. Help me set up authentication..."

## USER'S ACTIVE PROJECTS

The user is currently working on:

• **user-project** (react, typescript, postgres)
  Status: active
  Last mentioned: 2 hours ago

## TECHNICAL PREFERENCES

User prefers:
- Languages: javascript, typescript
- Frameworks: react, express
- Code style: documented

## LEARNED PATTERNS

You've learned that this user:
- Often asks about: development, debugging
- Prefers documented responses
```

---

## 2. Proactive Suggestions

**File:** `packages/core/src/core/ProactiveSuggestions.ts`
**Purpose:** Makes the agent proactive instead of just reactive

### Key Features

- **Error Detection**: Identifies repeated errors
- **Optimization Opportunities**: Suggests performance improvements
- **Task Reminders**: Reminds about incomplete tasks
- **Expertise-Based Suggestions**: Offers learning or teaching opportunities
- **Time-Based Warnings**: Alerts about off-peak work hours
- **Best Practice Suggestions**: Recommends testing, documentation, version control

### API

```typescript
class ProactiveSuggestions {
  /**
   * Generate proactive suggestions based on user context
   */
  async generateSuggestions(
    userId: string,
    genomeId: string,
    currentMessage: string
  ): Promise<ProactiveSuggestion[]>

  /**
   * Format suggestions into a prompt injection
   */
  formatSuggestionsPrompt(suggestions: ProactiveSuggestion[]): string
}
```

### Data Structures

```typescript
interface ProactiveSuggestion {
  type: 'improvement' | 'warning' | 'opportunity' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action?: string;
  confidence: number; // 0-1
}
```

### Suggestion Types

| Type | Icon | Purpose | Example |
|------|------|---------|---------|
| **improvement** | 🚀 | Optimization opportunities | "Set up performance profiling?" |
| **warning** | ⚠️ | Potential issues | "Recurring error pattern detected" |
| **opportunity** | 💡 | Learning/teaching chances | "Share your expertise in React?" |
| **reminder** | ⏰ | Incomplete tasks | "Revisit task from 2 days ago?" |

### Detection Methods

1. **Repeated Errors** (≥2 occurrences)
   ```typescript
   // Detects: "TypeError", "NetworkError", etc.
   // Suggests: Investigating root cause
   ```

2. **Performance Patterns** (≥2 mentions)
   ```typescript
   // Detects: "slow", "performance", "optimize"
   // Suggests: Systematic performance monitoring
   ```

3. **Incomplete Tasks** (1+ day old)
   ```typescript
   // Detects: "later", "tomorrow", "next"
   // Suggests: Revisiting the task
   ```

4. **Expertise Mismatches**
   ```typescript
   // High expertise: Suggest teaching/documenting
   // Low success rate: Offer deeper explanations
   ```

5. **Time-Based Warnings**
   ```typescript
   // Working outside peak hours
   // Suggests: Taking a break or rescheduling
   ```

6. **Best Practice Opportunities**
   ```typescript
   // Code without tests → Suggest testing
   // Complex logic → Suggest documentation
   // Changes without commits → Suggest version control
   ```

### Example Usage

```typescript
const suggestions = await genome.getProactiveSuggestions(
  'user-123',
  'My app is running slow'
);

console.log(suggestions);
// [
//   {
//     type: 'improvement',
//     priority: 'medium',
//     title: 'Performance Optimization Opportunity',
//     description: 'I see performance is a recurring concern. I can help you establish a systematic performance monitoring approach.',
//     action: 'Set up performance profiling and benchmarking?',
//     confidence: 0.75
//   },
//   {
//     type: 'warning',
//     priority: 'high',
//     title: 'Recurring Error Pattern Detected',
//     description: 'I noticed you\'ve encountered "NetworkError" 3 times recently. This might indicate a deeper issue.',
//     action: 'Would you like me to help you investigate the root cause?',
//     confidence: 0.8
//   }
// ]
```

### Prompt Injection Example

```markdown
## PROACTIVE INTELLIGENCE

Based on my analysis, I have some proactive suggestions:

🚀 **Performance Optimization Opportunity** (improvement, priority: medium)
   I see performance is a recurring concern. I can help you establish a systematic performance monitoring approach.
   → Suggested action: Set up performance profiling and benchmarking?

⚠️  **Recurring Error Pattern Detected** (warning, priority: high)
   I noticed you've encountered "NetworkError" 3 times recently. This might indicate a deeper issue.
   → Suggested action: Would you like me to help you investigate the root cause?

💡 Mention these suggestions naturally if relevant to the conversation.
```

---

## 3. Learning Announcer

**File:** `packages/core/src/core/LearningAnnouncer.ts`
**Purpose:** Makes learning visible to build trust

### Key Features

- **DNA Change Detection**: Compares previous vs current DNA
- **Learning Event Generation**: Creates structured learning events
- **Real-time Announcements**: Injects learning into responses
- **Learning Reports**: Generates comprehensive summaries
- **Confidence Tracking**: Only announces high-confidence learning

### API

```typescript
class LearningAnnouncer {
  /**
   * Detect what the agent learned from DNA changes
   */
  detectLearning(
    previousDNA: UserDNA | null,
    currentDNA: UserDNA
  ): LearningEvent[]

  /**
   * Format learning announcement for injection into response
   */
  formatLearningAnnouncement(events: LearningEvent[]): string

  /**
   * Generate a learning summary for user transparency
   */
  generateLearningSummary(
    dna: UserDNA,
    recentEvents: LearningEvent[]
  ): string
}
```

### Data Structures

```typescript
interface LearningEvent {
  type: 'preference' | 'pattern' | 'adaptation' | 'improvement';
  category: string;
  whatLearned: string;
  howItHelps: string;
  confidence: number;
  timestamp: Date;
}
```

### Learning Types

| Type | Icon | Detects | Example |
|------|------|---------|---------|
| **preference** | ⚙️ | Communication style changes | "You prefer technical communication" |
| **pattern** | 🔍 | Behavioral patterns | "You frequently use React, TypeScript" |
| **adaptation** | 🔄 | Meta-learning changes | "You're becoming more receptive to new approaches" |
| **improvement** | 📈 | Performance gains | "Your debugging success rate improved to 85%" |

### Detection Criteria

```typescript
// Communication style changed
if (previousDNA.traits.communicationStyle !== currentDNA.traits.communicationStyle) {
  → Generate preference event (confidence: 0.8)
}

// New tools detected
if (newTools.length > 0) {
  → Generate pattern event (confidence: 0.75)
}

// Expertise improved by ≥10%
if (expertiseImprovement >= 0.1) {
  → Generate improvement event (confidence: 0.9)
}

// Task success rate improved by ≥15%
if (successRateImprovement >= 0.15) {
  → Generate improvement event (confidence: 0.85)
}

// Task success rate dropped by ≥15%
if (successRateDrop >= 0.15) {
  → Generate pattern event (confidence: 0.8)
}

// Adaptation rate changed by ≥20%
if (abs(adaptationChange) >= 0.2) {
  → Generate adaptation event (confidence: 0.75)
}
```

### Example Usage

```typescript
// After a few interactions
const learningEvents = learningAnnouncer.detectLearning(previousDNA, currentDNA);

console.log(learningEvents);
// [
//   {
//     type: 'preference',
//     category: 'communication',
//     whatLearned: 'You prefer technical communication',
//     howItHelps: 'I\'ll match this style in my responses',
//     confidence: 0.8,
//     timestamp: '2025-02-27T12:00:00Z'
//   },
//   {
//     type: 'pattern',
//     category: 'tools',
//     whatLearned: 'You frequently use: React, TypeScript',
//     howItHelps: 'I\'ll prioritize these tools in my suggestions',
//     confidence: 0.75,
//     timestamp: '2025-02-27T12:00:00Z'
//   }
// ]
```

### Announcement Example

```markdown
## 🧬 LEARNING ANNOUNCEMENT

⚙️ **I just learned something about you:**
   → You prefer technical communication
   → How this helps: I'll match this style in my responses

_I also learned 1 other thing(s). My understanding of you is evolving!_
```

### Learning Summary Example

```markdown
# 🧬 Your AI Learning Report

**Generation**: 5 (interactions with this agent)

---

## 💬 Communication Style

- **Style**: technical
- **Verbosity**: terse
- **Tone**: direct

## 🎓 Detected Expertise

- **javascript**: ██████████ 95%
- **react**: ████████░░ 85%
- **typescript**: ███████░░░ 70%

## 📚 Recent Learning

- ⚙️ You prefer terse responses with code examples
- 🔍 You frequently use React, TypeScript
- 📈 Your debugging success rate improved to 85%

## ⏰ Productivity Patterns

- **Peak hours**: 9, 10, 14, 15:00
- **Adaptation rate**: 60%
- **Stability score**: 75%

---

_This profile evolves with every interaction. The more we work together, the better I understand you!_ 🚀
```

---

## 4. Integration with PromptAssembler

**File:** `packages/core/src/core/PromptAssembler.ts`

### How Intelligence Is Injected

```typescript
async assemblePrompt(context?: SelectionContext, currentMessage?: string): Promise<string> {
  const sections: string[] = [];

  // Layer 0: Immutable DNA
  // Layer 1: Operative Genes
  // Layer 2: Epigenomes

  // 🧠 INTELLIGENCE BOOST
  if (context?.userId) {
    // 1. Inject Memory
    const memoryPrompt = await this.contextMemory.getMemoryPrompt(
      context.userId,
      this.genome.id
    );
    if (memoryPrompt) sections.push(memoryPrompt);

    // 2. Inject Proactive Suggestions
    if (currentMessage) {
      const suggestions = await this.proactiveSuggestions.generateSuggestions(
        context.userId,
        this.genome.id,
        currentMessage
      );
      if (suggestions.length > 0) {
        const suggestionsPrompt = this.proactiveSuggestions.formatSuggestionsPrompt(suggestions);
        sections.push(suggestionsPrompt);
      }
    }
  }

  return sections.join('\n\n---\n\n');
}
```

### Final Prompt Structure

```
┌────────────────────────────────────────┐
│ Layer 0: Immutable DNA                 │
│ (Core Identity, Ethics, Security)      │
├────────────────────────────────────────┤
│ Layer 1: Operative Genes               │
│ (Tool Usage, Problem Solving)          │
├────────────────────────────────────────┤
│ Layer 2: Epigenomes                    │
│ (User Preferences, Style)              │
├────────────────────────────────────────┤
│ 🧠 CONVERSATION MEMORY                 │
│ (Projects, Preferences, Patterns)      │
├────────────────────────────────────────┤
│ 💡 PROACTIVE SUGGESTIONS               │
│ (Improvements, Warnings, Reminders)    │
└────────────────────────────────────────┘
```

---

## 5. Integration with GenomeInstance

**File:** `packages/core/src/PGA.ts`

### Chat Flow with Intelligence

```typescript
async chat(userMessage: string, context: SelectionContext): Promise<string> {
  // 1. Assemble prompt with intelligence boost
  const prompt = await this.assemblePrompt(context, userMessage);

  // 2. Call LLM
  const response = await this.llm.chat([
    { role: 'system', content: prompt },
    { role: 'user', content: userMessage }
  ]);

  // 3. If userId provided, enable learning
  if (context.userId) {
    const previousDNA = await this.dnaProfile.getDNA(context.userId, this.genome.id);

    // Record interaction
    await this.recordInteraction({
      userId: context.userId,
      userMessage,
      assistantResponse: response.content,
      toolCalls: [],
      timestamp: new Date()
    });

    // Detect learning
    const updatedDNA = await this.dnaProfile.getDNA(context.userId, this.genome.id);
    const learningEvents = this.learningAnnouncer.detectLearning(previousDNA, updatedDNA);

    // Announce significant learning
    if (learningEvents.length > 0 && learningEvents[0].confidence > 0.7) {
      const announcement = this.learningAnnouncer.formatLearningAnnouncement(learningEvents);
      if (announcement) {
        return response.content + '\n\n' + announcement;
      }
    }
  }

  return response.content;
}
```

### New Public Methods

```typescript
// Get learning summary
async getLearningSummary(userId: string): Promise<string>

// Get proactive suggestions
async getProactiveSuggestions(userId: string, currentMessage: string): Promise<ProactiveSuggestion[]>

// Get conversation context
async getConversationContext(userId: string): Promise<ConversationContext>
```

---

## Performance Considerations

### Memory Usage

- **ContextMemory**: Loads last 50 interactions (~50KB per user)
- **ProactiveSuggestions**: Analyzes last 20 interactions (~20KB per user)
- **LearningAnnouncer**: In-memory comparison (~5KB per operation)

### Optimization Strategies

1. **Lazy Loading**: Only load context when userId is provided
2. **Caching**: Cache conversation context for 5 minutes
3. **Batch Processing**: Process learning events in batches
4. **Smart Truncation**: Keep only relevant message history

### Benchmarks

| Operation | Time | Memory |
|-----------|------|--------|
| `buildContext()` | ~50ms | ~50KB |
| `generateSuggestions()` | ~30ms | ~20KB |
| `detectLearning()` | ~5ms | ~5KB |
| **Total Overhead** | **~85ms** | **~75KB** |

---

## Best Practices

### 1. Always Provide userId

```typescript
// ✅ GOOD - Enables all intelligence features
await genome.chat(message, { userId: 'user-123' });

// ❌ BAD - No intelligence features
await genome.chat(message, {});
```

### 2. Handle Learning Announcements

```typescript
// Option 1: Automatic (in response)
const response = await genome.chat(message, { userId });
// Learning announcements are appended automatically

// Option 2: Manual
const suggestions = await genome.getProactiveSuggestions(userId, message);
const context = await genome.getConversationContext(userId);
// Display in UI separately
```

### 3. Monitor Learning Progress

```typescript
// Generate periodic reports
setInterval(async () => {
  const summary = await genome.getLearningSummary(userId);
  console.log(summary);
}, 24 * 60 * 60 * 1000); // Every 24 hours
```

### 4. Configure Intelligence

```typescript
// Adjust confidence thresholds
if (learningEvents[0].confidence > 0.8) {
  // Only announce very confident learning
}

// Filter suggestion priorities
const criticalSuggestions = suggestions.filter(s =>
  s.priority === 'high' || s.priority === 'critical'
);
```

---

## Troubleshooting

### Learning Not Announcing

**Problem**: Learning events detected but not showing in responses

**Solutions**:
1. Check confidence threshold (default: 0.7)
2. Verify userId is provided
3. Check if DNA actually changed

```typescript
// Debug learning
const events = learningAnnouncer.detectLearning(prevDNA, currDNA);
console.log('Events:', events);
console.log('Top confidence:', events[0]?.confidence);
```

### Proactive Suggestions Empty

**Problem**: No suggestions generated

**Solutions**:
1. User needs ≥2 interactions for pattern detection
2. Check if message contains trigger keywords
3. Verify storage adapter returns interactions

```typescript
// Debug suggestions
const interactions = await storage.getRecentInteractions(genomeId, userId, 20);
console.log('Interactions:', interactions.length);

const suggestions = await genome.getProactiveSuggestions(userId, message);
console.log('Suggestions:', suggestions);
```

### Context Memory Empty

**Problem**: Agent doesn't remember previous conversations

**Solutions**:
1. Verify interactions are being recorded
2. Check storage adapter implementation
3. Ensure userId is consistent

```typescript
// Debug context
const context = await genome.getConversationContext(userId);
console.log('Projects:', context.projectContext);
console.log('Preferences:', context.technicalPreferences);
console.log('Recent messages:', context.recentMessages.length);
```

---

## Migration Guide

### From Regular PGA to Intelligence Boost

No breaking changes! Intelligence features are opt-in via `userId`:

```typescript
// Before (still works)
const response = await genome.chat(message, {});

// After (with intelligence)
const response = await genome.chat(message, { userId: 'user-123' });
```

### Upgrading Existing Agents

```typescript
// 1. Add userId to all chat calls
genome.chat(message, { userId: req.user.id })

// 2. Display learning announcements
if (response.includes('🧬 LEARNING ANNOUNCEMENT')) {
  // Highlight in UI
}

// 3. Show proactive suggestions
const suggestions = await genome.getProactiveSuggestions(userId, message);
renderSuggestions(suggestions);

// 4. Offer learning reports
const summary = await genome.getLearningSummary(userId);
showInProfile(summary);
```

---

## Future Enhancements

### Planned Features

- [ ] **Vector Search**: Semantic memory search
- [ ] **Multi-Agent Memory**: Share learning across agents
- [ ] **Export/Import**: Portable user profiles
- [ ] **Privacy Controls**: User-controlled memory deletion
- [ ] **A/B Testing**: Compare intelligence effectiveness
- [ ] **Real-time Streaming**: Stream learning events via WebSocket

### Experimental Features

- **Collaborative Filtering**: Learn from similar users
- **Predictive Suggestions**: ML-based need prediction
- **Emotional Intelligence**: Detect user mood/stress
- **Context Prioritization**: Smart memory pruning

---

## API Reference

See full API documentation: [API.md](./API.md)

## Examples

See working examples: [examples/](../examples/)

## Support

Questions? Open an issue: https://github.com/LuisvelMarketer/pga-platform/issues
