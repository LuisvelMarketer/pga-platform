# PGA Evolution Engine - Living OS Core

**Version**: 2.0.0
**Author**: Luis Alfredo Velasquez Duran
**Created**: 2026-02-27

The Evolution Engine is the heart of PGA's "Living OS" - enabling autonomous self-improvement without human intervention.

---

## 🎯 Overview

The Evolution Engine consists of 4 interconnected components that form a complete autonomous evolution cycle:

```
┌─────────────────────────────────────────────────────┐
│                 EVOLUTION CYCLE                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. DRIFT DETECTION (Proactive)                     │
│     DriftAnalyzer monitors performance               │
│     Triggers mutation when drift detected            │
│                                                      │
│  2. MUTATION GENERATION                              │
│     MutationEngine generates 3 candidates            │
│     Each optimized for specific improvement          │
│                                                      │
│  3. FITNESS EVALUATION                               │
│     FitnessCalculator computes multi-objective       │
│     6-dimensional optimization                       │
│                                                      │
│  4. PROMOTION VALIDATION                             │
│     PromotionGate validates mutation                 │
│     8-stage checks before deployment                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Components

### 1. DriftAnalyzer

**Purpose**: Proactive performance monitoring - detects issues BEFORE user feedback.

**Key Features**:
- Detects 5 types of drift: success rate, token efficiency, latency, cost, intervention rate
- Configurable thresholds per metric
- Confidence scoring based on sample size
- Automated recommendations

**Usage**:
```typescript
import { DriftAnalyzer } from '@pga/core';

const analyzer = new DriftAnalyzer({
  successRateThreshold: 0.10,     // 10% drop triggers alert
  tokenEfficiencyThreshold: 0.15, // 15% worse triggers alert
  latencyThreshold: 0.20,          // 20% slower triggers alert
});

// Record after each interaction
analyzer.recordFitness(fitnessVector);

// Check for drift
const analysis = analyzer.analyzeDrift();

if (analysis.isDrifting) {
  console.log(`Severity: ${analysis.overallSeverity}`);
  console.log(`Signals: ${analysis.signals.length}`);
  console.log(`Actions: ${analysis.recommendedActions}`);
}
```

**Output**:
```typescript
{
  isDrifting: true,
  overallSeverity: 'moderate',
  signals: [
    {
      type: 'token-efficiency-decline',
      severity: 'moderate',
      metric: 'tokenEfficiency',
      currentValue: 0.70,
      baselineValue: 0.85,
      percentageChange: -17.6,
      confidence: 0.88,
      recommendation: 'Apply compress_instructions mutation'
    }
  ],
  recommendedActions: [
    'Token usage increasing. Apply compress_instructions mutation',
    'Consider reorder_constraints to improve efficiency'
  ],
  confidence: 0.88
}
```

---

### 2. MutationOperator

**Purpose**: Generates controlled mutations optimized for specific improvements.

**Built-in Operators**:
1. **compress_instructions** - Reduces token count (-15-20%)
2. **reorder_constraints** - Improves quality (+10%)
3. **safety_reinforcement** - Reduces interventions (-8-15%)
4. **tool_selection_bias** - Optimizes tool usage (+12%)

**Usage**:
```typescript
import { MutationEngine } from '@pga/core';

const engine = new MutationEngine();

// Generate 3 mutation candidates
const mutants = await engine.generateMutants({
  genome: currentGenome,
  targetChromosome: 'c1',
  reason: 'Token efficiency declining',
  evidence: { currentEfficiency: 0.70, baseline: 0.85 }
}, 3);

// Each mutant includes:
mutants.forEach(m => {
  console.log(`${m.mutation.operation}: +${m.expectedImprovement * 100}%`);
  console.log(`Description: ${m.description}`);
});
```

**Creating Custom Operators**:
```typescript
import { IMutationOperator } from '@pga/core';

class CustomOperator implements IMutationOperator {
  name = 'my-custom-mutation';
  description = 'My custom mutation logic';
  targetChromosome = 'c1';

  async mutate(context) {
    const mutant = deepClone(context.genome);

    // Your mutation logic here
    mutant.chromosomes.c1.operations = modifyOperations(
      mutant.chromosomes.c1.operations
    );

    return {
      success: true,
      mutant,
      mutation: createMutationRecord(),
      description: 'Applied custom mutation',
      expectedImprovement: 0.12
    };
  }

  estimateImprovement(context) {
    return 0.12; // 12% expected improvement
  }
}

// Register custom operator
engine.registerOperator(new CustomOperator());
```

---

### 3. FitnessCalculator

**Purpose**: Multi-objective optimization - balances quality, efficiency, and cost.

**6-Dimensional Optimization**:
```typescript
{
  quality: 0.89,           // 30% weight - Output correctness
  successRate: 0.94,       // 25% weight - Task completion
  tokenEfficiency: 0.82,   // 20% weight - Cognitive compression
  latency: 1250,           // 10% weight - Response speed
  costPerSuccess: 0.0042,  // 10% weight - Economic efficiency
  interventionRate: 0.06,  //  5% weight - Human corrections
  composite: 0.87          // ← Final score (weighted average)
}
```

**Usage**:
```typescript
import { FitnessCalculator, InteractionData } from '@pga/core';

const calc = new FitnessCalculator({
  weights: {
    quality: 0.30,
    successRate: 0.25,
    tokenEfficiency: 0.20,
    latency: 0.10,
    costPerSuccess: 0.10,
    interventionRate: 0.05
  }
});

// Compute fitness from interactions
const interactions: InteractionData[] = [
  {
    success: true,
    quality: 0.92,
    inputTokens: 450,
    outputTokens: 1200,
    latency: 1250,
    model: 'claude-sonnet-4.5',
    interventionNeeded: false,
    timestamp: new Date()
  },
  // ... more interactions
];

const fitness = calc.computeFitness(interactions);

console.log(`Composite fitness: ${fitness.composite}`);
console.log(`Sample size: ${fitness.sampleSize}`);
console.log(`Confidence: ${fitness.confidence}`);
```

**Comparison**:
```typescript
const improvement = calc.computeImprovement(baseline, current);
console.log(`Improvement: ${(improvement * 100).toFixed(1)}%`);

const meetsThreshold = calc.meetsThreshold(current, baseline, 0.05);
console.log(`Meets 5% threshold: ${meetsThreshold}`);
```

---

### 4. PromotionGate

**Purpose**: Validates mutations before deployment - ensures only beneficial changes go live.

**8-Stage Validation**:
1. ✅ **C0 Integrity** [CRITICAL] - Immutability preserved
2. ✅ **Sandbox Tested** [CRITICAL] - Tested in isolation
3. ✅ **Fitness Improvement** [HIGH] - >5% improvement
4. ✅ **Quality Regression** [HIGH] - <5% quality drop
5. ✅ **Success Rate** [HIGH] - <3% success drop
6. ✅ **Confidence** [MEDIUM] - >70% confidence
7. ✅ **Latency** [MEDIUM] - <20% slower
8. ✅ **Cost** [LOW] - <15% more expensive

**Usage**:
```typescript
import { PromotionGate } from '@pga/core';

const gate = new PromotionGate({
  minFitnessImprovement: 0.05,
  maxQualityRegression: 0.05,
  maxSuccessRateRegression: 0.03,
  minConfidence: 0.70
});

// Evaluate mutation
const decision = await gate.evaluateMutation(
  baseline,
  mutant,
  mutation
);

console.log(`Approved: ${decision.approved}`);
console.log(`Reason: ${decision.reason}`);
console.log(`Confidence: ${decision.confidence}`);
console.log(`Action: ${decision.recommendedAction}`);

// Print detailed report
console.log(gate.generateReport(decision));
```

**Decision Logic**:
- ❌ **Critical failures** → `rollback` (immediate)
- ❌ **2+ High failures** → `reject` (mutation bad)
- ⚠️ **1 High failure** → `retest` (need more data)
- ✅ **All passed** → `promote` (deploy to production)

---

## 🔄 Complete Flow Example

```typescript
import {
  GenomeKernel,
  DriftAnalyzer,
  MutationEngine,
  FitnessCalculator,
  PromotionGate
} from '@pga/core';

// ─── Setup ───────────────────────────────────────────────────
const kernel = new GenomeKernel(genome);
const analyzer = new DriftAnalyzer();
const engine = new MutationEngine();
const calc = new FitnessCalculator();
const gate = new PromotionGate();

// ─── Operational Loop ────────────────────────────────────────
async function evolutionCycle() {
  // 1. Verify integrity
  kernel.verifyIntegrity();

  // 2. Interact
  const response = await genome.chat(message, { userId });

  // 3. Record fitness
  const fitness = calc.computeFitness([interactionData]);
  analyzer.recordFitness(fitness);

  // 4. Check drift
  const analysis = analyzer.analyzeDrift();

  if (analysis.isDrifting) {
    // 5. Generate mutations
    const mutants = await engine.generateMutants({
      genome,
      targetChromosome: 'c1',
      reason: analysis.signals[0].recommendation
    }, 3);

    // 6. Test in sandbox
    for (const mutant of mutants) {
      const testResult = await sandbox.evaluate(mutant);
      mutant.mutation.testResults = testResult;
      mutant.mutation.sandboxTested = true;
    }

    // 7. Validate best mutant
    const best = mutants.sort((a, b) =>
      b.expectedImprovement - a.expectedImprovement
    )[0];

    const decision = await gate.evaluateMutation(
      genome,
      best.mutant,
      best.mutation
    );

    // 8. Deploy if approved
    if (decision.approved) {
      kernel.createSnapshot('pre-promotion');
      genome.promote(best.mutant);
      console.log(`✅ Promoted: ${best.mutation.operation}`);
    } else {
      console.log(`❌ Rejected: ${decision.reason}`);
    }
  }
}
```

---

## 📊 Performance Characteristics

| Component | Latency | Memory | CPU |
|-----------|---------|--------|-----|
| **DriftAnalyzer** | ~2ms | ~1KB per fitness point | Low |
| **MutationEngine** | ~10ms | ~50KB per mutant | Medium |
| **FitnessCalculator** | ~2ms | ~1KB | Low |
| **PromotionGate** | ~5ms | ~10KB | Low |
| **Total Overhead** | **~20ms** | **~70KB** | **Low** |

**Conclusion**: <1% overhead for massive capability gain.

---

## 🎯 Best Practices

### 1. Drift Detection
- ✅ Record fitness after EVERY interaction
- ✅ Use realistic thresholds (10-20% drops)
- ✅ Check drift periodically (every 10-100 interactions)
- ❌ Don't trigger on small sample sizes (<20)

### 2. Mutation Generation
- ✅ Generate 3+ candidates for selection
- ✅ Match operator to detected drift type
- ✅ Log all mutations for audit trail
- ❌ Don't mutate C0 (use C1/C2 only)

### 3. Fitness Calculation
- ✅ Customize weights for your use case
- ✅ Track model pricing accurately
- ✅ Include all 6 dimensions
- ❌ Don't rely on single metric

### 4. Promotion Validation
- ✅ Always sandbox test before promotion
- ✅ Use strict thresholds for production
- ✅ Create snapshots before mutations
- ❌ Don't skip validation checks

---

## 🔒 Security Considerations

### C0 Integrity
- ✅ **NEVER** mutate Chromosome 0
- ✅ Verify integrity before EVERY operation
- ✅ Automatic quarantine on violation
- ✅ Rollback to last known good version

### Mutation Safety
- ✅ All mutations sandbox-tested
- ✅ Fitness must improve >5%
- ✅ No critical check failures allowed
- ✅ Full audit trail maintained

### Resource Limits
- ✅ Limit mutation frequency (cooldown)
- ✅ Cap mutation budget (max per day)
- ✅ Monitor compute costs
- ✅ Rate limit promotions

---

## 📚 See Also

- [RFC-001: Genome Contract v2](../../../../RFC-001-GENOME-CONTRACT-V2.md)
- [GenomeKernel](../core/GenomeKernel.ts) - C0 integrity verification
- [GenomeV2 Types](../types/GenomeV2.ts) - Complete type definitions
- [SCIENTIFIC-VALIDATION.md](../../../../SCIENTIFIC-VALIDATION.md) - Benchmarks

---

## 🤝 Contributing

Want to add a custom mutation operator? See [CONTRIBUTING.md](../../../../CONTRIBUTING.md) for guidelines.

---

**Built with PGA Platform** 🧬
**The Living OS for AI Agents**

*© 2026 Luis Alfredo Velasquez Duran - Germany*
