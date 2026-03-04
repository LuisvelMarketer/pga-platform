# PGA Advanced AI

Advanced reasoning techniques: Chain-of-Thought, Self-Reflection, and Meta-Learning.

## Features

- **Chain-of-Thought** - Step-by-step reasoning
- **Self-Reflection** - Quality analysis and improvements
- **Meta-Learning** - Learn from patterns and adapt
- **Confidence Scoring** - Measure response certainty
- **Best Practices** - Identify successful patterns

## Chain-of-Thought

```typescript
import { ThinkingEngine } from '@pga-ai/core';

const thinking = new ThinkingEngine();

const result = await thinking.chainOfThought(
  'How to optimize database queries?'
);

console.log('Thinking steps:', result.steps);
console.log('Final answer:', result.finalAnswer);
console.log('Confidence:', result.overallConfidence);
```

## Self-Reflection

```typescript
const reflection = await thinking.selfReflect(
  'What is AI?',
  'AI is artificial intelligence...',
);

console.log('Strengths:', reflection.strengths);
console.log('Weaknesses:', reflection.weaknesses);
console.log('Improvements:', reflection.improvements);
console.log('Quality score:', reflection.qualityScore);
```

## Meta-Learning

```typescript
// Record pattern usage
thinking.recordPattern('detailed-explanation', true, 0.9);
thinking.recordPattern('brief-answer', false, 0.5);

// Get best practices
const bestPractices = thinking.getBestPractices();

// Check pattern recommendation
const recommendation = thinking.shouldUsePattern('detailed-explanation');
console.log(recommendation.recommended); // true
console.log(recommendation.reason); // "Pattern has 90% success rate..."
```

## Author

**Luis Alfredo Velasquez Duran** (Germany, 2025)
