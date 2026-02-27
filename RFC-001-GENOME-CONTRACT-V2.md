# RFC-001: Genome Contract v2 - Living OS Foundation

**Status**: Draft → Implementation
**Author**: Luis Alfredo Velasquez Duran + Claude Sonnet 4.5
**Created**: 2026-02-27
**Updated**: 2026-02-27

---

## 🎯 Executive Summary

This RFC proposes **Genome Contract v2**, the foundational data structure that transforms PGA from a "prompt optimizer" to a **Living OS for AI Agents**.

**Key Innovation**: Evolving from "Layers" to **"Chromosomes"** with cryptographic integrity, cross-agent inheritance, and operational indispensability.

---

## 📋 Table of Contents

1. [Motivation](#motivation)
2. [Current State (v1)](#current-state-v1)
3. [Proposed Changes (v2)](#proposed-changes-v2)
4. [Technical Specification](#technical-specification)
5. [Migration Path](#migration-path)
6. [Implementation Plan](#implementation-plan)
7. [Security Considerations](#security-considerations)
8. [Performance Impact](#performance-impact)
9. [Alternatives Considered](#alternatives-considered)
10. [Success Metrics](#success-metrics)

---

## 1. Motivation

### The Problem

Current genome structure (v1) has **critical gaps**:

❌ **Layer 0 has no integrity verification**
- Can be corrupted by bugs or malicious mutations
- No cryptographic proof of immutability

❌ **No cross-genome inheritance**
- Each genome learns in isolation
- Massive waste of collective intelligence

❌ **No lineage tracking**
- Can't trace where genes came from
- No accountability for mutations

❌ **Fitness is single-dimensional**
- Only tracks one score
- Ignores cost, latency, and compression

### The Vision

**Genome Contract v2** enables:

✅ **Cryptographic Immutability** (C0 protected by SHA-256)
✅ **Cross-Agent Inheritance** (Gene Registry with lineage)
✅ **Multi-Objective Fitness** (Quality + Efficiency + Cost)
✅ **Full Auditability** (Every mutation tracked)
✅ **Operational Safety** (Automatic quarantine on violation)

---

## 2. Current State (v1)

### Current Genome Interface

```typescript
// packages/core/src/types/index.ts (current)
export interface Genome {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;

  config: GenomeConfig;

  // Layer-based structure
  layers: {
    layer0: GeneAllele[]; // Immutable (by convention only)
    layer1: GeneAllele[]; // Operative
    layer2: GeneAllele[]; // Epigenetic
  };

  // Simple fitness tracking
  fitness: number;
}

export interface GeneAllele {
  id: string;
  layer: Layer;
  gene: string;
  variant: string;
  content: string;
  fitness: number;
  lastUsed: Date;
  usageCount: number;
}
```

### Current Limitations

1. **No integrity protection** on Layer 0
2. **No lineage tracking** (where did this gene come from?)
3. **No family relationships** (which genomes are related?)
4. **Single fitness score** (not multi-dimensional)
5. **No inheritance metadata** (can't share across genomes)

---

## 3. Proposed Changes (v2)

### New Genome Contract v2

```typescript
// packages/core/src/types/GenomeV2.ts (proposed)

/**
 * Genome Contract v2 - Living OS Foundation
 *
 * Transforms genome from "prompt container" to "living organism"
 * with cryptographic integrity, lineage tracking, and inheritance.
 */
export interface GenomeV2 {
  // ─── Core Identity ───────────────────────────────────────
  id: string;                    // Unique identifier (UUID v4)
  name: string;                  // Human-readable name
  familyId: string;              // Gene family (for inheritance)
  version: number;               // Monotonic version counter

  createdAt: Date;
  updatedAt: Date;

  // ─── Chromosomal Architecture ────────────────────────────
  chromosomes: {
    c0: Chromosome0;             // Immutable (protected)
    c1: Chromosome1;             // Operative (validated)
    c2: Chromosome2;             // Epigenetic (fast)
  };

  // ─── Integrity Protection ────────────────────────────────
  integrity: {
    c0Hash: string;              // SHA-256 of C0 (immutable)
    lastVerified: Date;          // Last integrity check
    violations: number;          // Count of integrity failures
    quarantined: boolean;        // Safety lockdown state
  };

  // ─── Lineage & Inheritance ───────────────────────────────
  lineage: {
    parentVersion?: number;      // Previous genome version
    originGenome?: string;       // If forked from another
    inheritedGenes: InheritedGene[]; // Genes from registry
    mutations: MutationRecord[]; // Full mutation history
  };

  // ─── Multi-Objective Fitness ─────────────────────────────
  fitness: FitnessVector;        // Multi-dimensional score

  // ─── Operational Metadata ────────────────────────────────
  config: GenomeConfig;
  state: GenomeState;            // active | quarantined | archived
  tags: string[];                // For organization
}

/**
 * Chromosome 0 (C0) - Immutable Core
 *
 * Contains the "consciousness of species" - rules that NEVER mutate.
 * Protected by cryptographic hash verification.
 */
export interface Chromosome0 {
  identity: {
    role: string;                // "You are a helpful assistant"
    purpose: string;             // Core mission statement
    constraints: string[];       // Ethical boundaries
  };

  security: {
    forbiddenTopics: string[];   // Never discuss these
    accessControls: string[];    // Permission boundaries
    safetyRules: string[];       // Unbreakable rules
  };

  attribution: {
    creator: string;             // Creator name
    copyright: string;           // Copyright notice
    license: string;             // License terms
  };

  // Metadata (not part of hash)
  metadata: {
    version: string;             // C0 schema version
    createdAt: Date;
  };
}

/**
 * Chromosome 1 (C1) - Operative Genes
 *
 * Functional instructions that define agent behavior.
 * Mutations require sandbox validation before promotion.
 */
export interface Chromosome1 {
  operations: OperativeGene[];

  metadata: {
    lastMutated: Date;
    mutationCount: number;
    avgFitnessGain: number;
  };
}

export interface OperativeGene {
  id: string;
  category: 'tool-usage' | 'coding-patterns' | 'reasoning' | 'communication';
  content: string;

  fitness: FitnessVector;

  // Inheritance tracking
  origin: 'mutation' | 'inheritance' | 'initial';
  sourceGeneId?: string;        // If inherited from registry

  // Usage stats
  usageCount: number;
  lastUsed: Date;
  successRate: number;
}

/**
 * Chromosome 2 (C2) - Epigenetic Adaptations
 *
 * Rapid adaptations to user preferences and context.
 * Mutates frequently (hourly) with minimal validation.
 */
export interface Chromosome2 {
  userAdaptations: Map<string, UserEpigenome>;
  contextPatterns: ContextGene[];

  metadata: {
    lastMutated: Date;
    adaptationRate: number;      // Mutations per hour
  };
}

export interface UserEpigenome {
  userId: string;

  preferences: {
    communicationStyle: 'formal' | 'casual' | 'technical' | 'creative';
    verbosity: 'terse' | 'balanced' | 'detailed';
    tone: 'professional' | 'friendly' | 'direct';
  };

  learned: {
    preferredTools: string[];
    commonTopics: string[];
    peakHours: number[];
    domainExpertise: Map<string, number>; // domain → skill level (0-1)
  };

  fitness: FitnessVector;
}

/**
 * Multi-Dimensional Fitness Vector
 *
 * Replaces single score with comprehensive evaluation.
 */
export interface FitnessVector {
  // Quality dimensions
  quality: number;               // 0-1: Output coherence and correctness
  successRate: number;           // 0-1: Tasks completed successfully

  // Efficiency dimensions
  tokenEfficiency: number;       // 0-1: Cognitive compression (lower tokens = higher score)
  latency: number;               // milliseconds (lower = better)

  // Economic dimension
  costPerSuccess: number;        // USD per successful interaction

  // Human-in-loop dimension
  interventionRate: number;      // 0-1: Corrections needed (lower = better)

  // Composite score (weighted average)
  composite: number;             // 0-1: Overall fitness

  // Metadata
  sampleSize: number;            // How many interactions in this score
  lastUpdated: Date;
  confidence: number;            // 0-1: Statistical confidence
}

/**
 * Inherited Gene - Tracking cross-genome knowledge transfer
 */
export interface InheritedGene {
  geneId: string;                // Gene Registry ID
  inheritedFrom: string;         // Source genome family
  inheritedAt: Date;

  // Impact tracking
  fitnessBeforeInheritance: number;
  fitnessAfterInheritance: number;
  fitnessGain: number;

  // Status
  active: boolean;
  validated: boolean;
}

/**
 * Mutation Record - Full audit trail
 */
export interface MutationRecord {
  id: string;
  timestamp: Date;

  chromosome: 'c0' | 'c1' | 'c2';
  operation: MutationType;

  // What changed
  before: string;                // JSON snapshot before
  after: string;                 // JSON snapshot after
  diff: string;                  // Human-readable diff

  // Why it changed
  trigger: 'drift-detected' | 'feedback' | 'inheritance' | 'manual';
  reason: string;

  // Validation
  sandboxTested: boolean;
  testResults?: EvaluationResult;

  // Outcome
  promoted: boolean;
  rollbackAt?: Date;             // If later reverted

  // Attribution
  proposer: 'system' | 'user' | 'inheritance';
}

/**
 * Genome State Machine
 */
export type GenomeState =
  | 'active'                     // Normal operation
  | 'quarantined'                // C0 integrity violation
  | 'testing'                    // In sandbox evaluation
  | 'archived';                  // No longer in use

export type MutationType =
  | 'compress_instructions'
  | 'reorder_constraints'
  | 'safety_reinforcement'
  | 'tool_selection_bias'
  | 'inherit_gene'
  | 'rollback'
  | 'manual_edit';
```

---

## 4. Technical Specification

### 4.1 C0 Integrity Verification

**Algorithm**:
```typescript
class GenomeKernel {
  private c0Hash: string;

  constructor(genome: GenomeV2) {
    this.c0Hash = this.computeC0Hash(genome.chromosomes.c0);
  }

  /**
   * Compute SHA-256 hash of C0 content
   *
   * Hash includes ONLY semantic content (not metadata like timestamps)
   */
  private computeC0Hash(c0: Chromosome0): string {
    // Create canonical representation
    const canonical = {
      identity: c0.identity,
      security: c0.security,
      attribution: c0.attribution,
      // Explicitly exclude metadata
    };

    // Deterministic JSON serialization
    const content = JSON.stringify(canonical, Object.keys(canonical).sort());

    // SHA-256 hash
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Verify C0 integrity before EVERY prompt assembly
   *
   * Critical security check - must never be skipped
   */
  verifyIntegrity(): boolean {
    const currentHash = this.computeC0Hash(this.genome.chromosomes.c0);

    if (currentHash !== this.c0Hash) {
      this.handleIntegrityViolation(currentHash);
      return false;
    }

    // Update last verified timestamp
    this.genome.integrity.lastVerified = new Date();
    return true;
  }

  /**
   * Handle integrity violation
   *
   * CRITICAL: Quarantine genome immediately
   */
  private handleIntegrityViolation(currentHash: string): void {
    this.genome.state = 'quarantined';
    this.genome.integrity.violations += 1;
    this.genome.integrity.quarantined = true;

    // Log to audit trail
    this.logSecurityEvent({
      level: 'critical',
      event: 'c0_integrity_violation',
      expected: this.c0Hash,
      actual: currentHash,
      timestamp: new Date(),
    });

    // Trigger rollback to last known good state
    this.rollbackToSafeVersion();

    // Alert monitoring systems
    this.raiseAlert('CRITICAL: C0 Integrity Violation Detected');
  }
}
```

### 4.2 Multi-Objective Fitness Calculation

**Formula**:
```typescript
/**
 * Compute composite fitness score from multi-dimensional vector
 *
 * Weights are configurable but default to balanced optimization
 */
function computeCompositeFitness(vector: FitnessVector): number {
  const weights = {
    quality: 0.30,           // 30% - Most important
    successRate: 0.25,       // 25% - Second most important
    tokenEfficiency: 0.20,   // 20% - Economic efficiency
    latency: 0.10,           // 10% - Speed matters
    costPerSuccess: 0.10,    // 10% - Direct cost
    interventionRate: 0.05,  // 5% - Human corrections
  };

  // Normalize scores to 0-1 range
  const normalized = {
    quality: vector.quality,
    successRate: vector.successRate,
    tokenEfficiency: vector.tokenEfficiency,
    latency: normalizeLatency(vector.latency), // Lower is better
    costPerSuccess: normalizeCost(vector.costPerSuccess), // Lower is better
    interventionRate: 1 - vector.interventionRate, // Lower is better
  };

  // Weighted sum
  const composite =
    normalized.quality * weights.quality +
    normalized.successRate * weights.successRate +
    normalized.tokenEfficiency * weights.tokenEfficiency +
    normalized.latency * weights.latency +
    normalized.costPerSuccess * weights.costPerSuccess +
    normalized.interventionRate * weights.interventionRate;

  return composite;
}

function normalizeLatency(latency: number): number {
  // Assume 5000ms is worst, 100ms is best
  const worst = 5000;
  const best = 100;
  return 1 - Math.min(1, (latency - best) / (worst - best));
}

function normalizeCost(cost: number): number {
  // Assume $1 is worst, $0.001 is best
  const worst = 1.0;
  const best = 0.001;
  return 1 - Math.min(1, (cost - best) / (worst - best));
}
```

### 4.3 Gene Inheritance Protocol

**Algorithm**:
```typescript
/**
 * Gene Inheritance System
 *
 * Enables genomes to inherit validated genes from registry
 */
class GeneInheritanceEngine {

  /**
   * Attempt to inherit a gene from registry
   *
   * Returns true if inheritance successful and beneficial
   */
  async inheritGene(
    targetGenome: GenomeV2,
    geneId: string
  ): Promise<boolean> {
    // Step 1: Fetch gene from registry
    const gene = await this.registry.getValidatedGene(geneId);
    if (!gene) {
      throw new Error(`Gene ${geneId} not found in registry`);
    }

    // Step 2: Check compatibility
    const compatibility = this.computeCompatibility(targetGenome, gene);
    if (compatibility < this.MIN_COMPATIBILITY_THRESHOLD) {
      console.log(`Gene ${geneId} incompatible (score: ${compatibility})`);
      return false;
    }

    // Step 3: Measure baseline fitness
    const baselineFitness = await this.evaluator.evaluate(targetGenome);

    // Step 4: Create mutant with inherited gene
    const mutant = this.applyGene(targetGenome, gene);

    // Step 5: Test mutant in sandbox
    const mutantFitness = await this.evaluator.evaluate(mutant);

    // Step 6: Compare fitness
    const improvement = mutantFitness.composite - baselineFitness.composite;

    if (improvement > this.MIN_FITNESS_IMPROVEMENT) {
      // Step 7: Promote mutant
      this.promoteInheritance(targetGenome, mutant, gene, improvement);

      // Step 8: Record in registry
      await this.registry.recordInheritance({
        targetGenomeId: targetGenome.id,
        geneId: gene.id,
        improvement,
        timestamp: new Date(),
      });

      return true;
    }

    return false;
  }

  /**
   * Compute compatibility between genome and gene
   *
   * Based on family similarity, task type, and domain
   */
  private computeCompatibility(genome: GenomeV2, gene: ValidatedGene): number {
    let score = 0;

    // Family similarity (40%)
    if (genome.familyId === gene.familyId) {
      score += 0.4;
    } else if (this.areFamiliesRelated(genome.familyId, gene.familyId)) {
      score += 0.2;
    }

    // Task type match (30%)
    const taskOverlap = this.computeTaskOverlap(genome, gene);
    score += taskOverlap * 0.3;

    // Domain expertise match (20%)
    const domainMatch = this.computeDomainMatch(genome, gene);
    score += domainMatch * 0.2;

    // Historical success rate (10%)
    score += gene.metrics.inheritanceSuccessRate * 0.1;

    return score;
  }
}
```

---

## 5. Migration Path

### Phase 1: Backward Compatible Addition (Week 1)

```typescript
// Add v2 fields as optional to existing Genome
export interface Genome {
  // ... existing fields ...

  // NEW: v2 additions (optional for migration period)
  familyId?: string;
  integrity?: IntegrityMetadata;
  lineage?: LineageMetadata;
  fitnessVector?: FitnessVector;
}
```

### Phase 2: Dual Mode Operation (Week 2-4)

```typescript
// GenomeManager supports both v1 and v2
class GenomeManager {
  async loadGenome(id: string): Promise<Genome | GenomeV2> {
    const data = await this.storage.getGenome(id);

    if (this.isV2Genome(data)) {
      return data as GenomeV2;
    } else {
      // Auto-upgrade v1 → v2
      return this.upgradeToV2(data);
    }
  }

  private upgradeToV2(v1: Genome): GenomeV2 {
    return {
      ...v1,
      familyId: 'default',
      chromosomes: {
        c0: this.extractC0FromLayers(v1.layers),
        c1: this.extractC1FromLayers(v1.layers),
        c2: this.extractC2FromLayers(v1.layers),
      },
      integrity: {
        c0Hash: this.computeC0Hash(/* ... */),
        lastVerified: new Date(),
        violations: 0,
        quarantined: false,
      },
      lineage: {
        mutations: [],
        inheritedGenes: [],
      },
      fitness: this.convertToVector(v1.fitness),
      state: 'active',
      tags: [],
    };
  }
}
```

### Phase 3: v2 Enforcement (Week 5+)

```typescript
// All new genomes created as v2
// v1 genomes auto-upgraded on first load
// Remove v1 support after 30 days
```

---

## 6. Implementation Plan

### Week 1: Core Types & Integrity
- [x] Create `GenomeV2.ts` with full type definitions
- [ ] Implement `GenomeKernel` with C0 hash verification
- [ ] Add integrity checks to `PromptAssembler`
- [ ] Write unit tests (95%+ coverage)

### Week 2: Migration & Compatibility
- [ ] Implement v1 → v2 upgrade logic
- [ ] Update `GenomeManager` for dual-mode operation
- [ ] Create migration scripts for existing genomes
- [ ] Test backward compatibility

### Week 3: Multi-Objective Fitness
- [ ] Implement `FitnessVector` calculation
- [ ] Update `FitnessTracker` to use vector
- [ ] Modify `Evaluator` to return vector
- [ ] Update promotion gates to use composite score

### Week 4: Lineage & Inheritance (Foundation)
- [ ] Add lineage tracking to mutations
- [ ] Implement `MutationRecord` logging
- [ ] Create gene extraction utilities
- [ ] Prepare for Gene Registry integration

---

## 7. Security Considerations

### C0 Integrity Attacks

**Threat**: Malicious mutation attempts to modify Layer 0
**Mitigation**:
- Hash verification before every prompt assembly
- Automatic quarantine on mismatch
- Rollback to last known good version

### Hash Collision Attacks

**Threat**: Attacker finds SHA-256 collision to bypass integrity check
**Mitigation**:
- SHA-256 is cryptographically secure (collision resistance: 2^256)
- Computationally infeasible with current technology
- Can migrate to SHA-3 if needed

### Inheritance Poisoning

**Threat**: Malicious genes introduced via Gene Registry
**Mitigation**:
- All inherited genes sandbox-tested before promotion
- Fitness must exceed baseline + threshold
- Community validation required for registry
- Quarantine if gene causes integrity violation

---

## 8. Performance Impact

### C0 Hash Computation

**Cost**: ~0.5ms per hash (SHA-256 of ~5KB JSON)
**Frequency**: Once per prompt assembly
**Impact**: **Negligible** (<0.1% overhead)

### Fitness Vector Calculation

**Cost**: ~2ms per evaluation (6 metrics)
**Frequency**: After each interaction
**Impact**: **Minimal** (<0.5% overhead)

### Lineage Tracking

**Cost**: ~1KB per mutation record
**Frequency**: ~5-10 mutations per day
**Impact**: **Minimal** storage (~365KB/year)

**Total Overhead**: <1% performance impact for massive security/capability gain

---

## 9. Alternatives Considered

### Alternative 1: Keep Simple Layer Model

**Pros**: No migration needed
**Cons**: No integrity protection, no inheritance, not competitive

**Verdict**: ❌ Rejected - Insufficient for Living OS vision

### Alternative 2: Full Blockchain for Immutability

**Pros**: Distributed, censorship-resistant
**Cons**: Massive overhead, unnecessary complexity

**Verdict**: ❌ Rejected - Overkill for single-tenant use case

### Alternative 3: Digital Signatures Instead of Hashes

**Pros**: Non-repudiation
**Cons**: Requires key management, slower

**Verdict**: ❌ Rejected - Hashes sufficient for integrity verification

---

## 10. Success Metrics

### Technical Metrics

- ✅ C0 integrity verified on 100% of prompt assemblies
- ✅ Zero integrity violations in production
- ✅ <1% performance overhead
- ✅ 100% v1 → v2 migration success rate

### Business Metrics

- ✅ Gene inheritance working across 10+ genomes
- ✅ Lineage tracking enables audit compliance
- ✅ Multi-objective fitness improves decision-making
- ✅ Zero security incidents related to C0 corruption

### User Experience Metrics

- ✅ Transparent to end users (no breaking changes)
- ✅ Faster mutations due to better fitness signals
- ✅ Improved trust due to auditability

---

## 11. Open Questions

1. **Should C0 hash include metadata like timestamps?**
   - **Answer**: No - only semantic content

2. **What happens if inheritance test exceeds timeout?**
   - **Answer**: Fail-safe - reject inheritance

3. **Can users manually edit C0?**
   - **Answer**: Yes, but requires rehashing and explicit approval

4. **How do we handle fitness vector weights?**
   - **Answer**: Configurable per genome, default to balanced

---

## 12. Conclusion

**Genome Contract v2** is the foundation of PGA as a Living OS.

**Key Innovations**:
1. ✅ Cryptographic immutability (C0 hash)
2. ✅ Cross-agent inheritance (Gene Registry ready)
3. ✅ Multi-objective fitness (quality + efficiency + cost)
4. ✅ Full auditability (lineage + mutations)
5. ✅ Operational safety (quarantine + rollback)

**Next Steps**:
1. Approve this RFC
2. Implement Week 1 (Core Types & Integrity)
3. Begin migration testing
4. Prepare for Gene Registry (Sprint 4)

---

**Status**: ✅ Ready for Implementation
**Approval**: Luis Alfredo Velasquez Duran
**Implementation Start**: 2026-02-27

---

**Prepared by**: Luis Alfredo Velasquez Duran + Claude Sonnet 4.5
**Last Updated**: 2026-02-27
**Version**: 1.0.0
