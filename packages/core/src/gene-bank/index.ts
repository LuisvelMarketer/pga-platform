/**
 * Gene Bank Module
 *
 * Horizontal Knowledge Transfer (THK) system for PGA agents.
 *
 * Inspired by bacterial plasmid transfer, this module enables agents to:
 * - Extract successful behavioral patterns as "Cognitive Genes"
 * - Store genes in a local Gene Bank
 * - Share genes within tenant (THK protocol)
 * - Test genes in sandbox before adoption
 * - Adopt proven genes to improve performance
 *
 * @module gene-bank
 * @version 0.4.0
 */

// Core types and schemas
export {
    // Types
    CognitiveGene,
    GeneType,
    GeneContent,
    FitnessMetrics,
    Lineage,
    TenantInfo,
    SharingScope,
    GeneExtractionResult,
    GeneAdoptionResult,

    // Schemas
    CognitiveGeneSchema,
    GeneTypeSchema,
    GeneContentSchema,
    FitnessMetricsSchema,
    LineageSchema,
    TenantInfoSchema,
    SharingScopeSchema,
    GeneExtractionResultSchema,
    GeneAdoptionResultSchema,

    // Helper functions
    createGeneId,
    meetsMinimumFitness,
    calculateFitnessDelta,
    isMarketplaceReady,
} from './CognitiveGene';

// Gene Bank (storage and management)
export {
    GeneBank,
    GeneBankConfig,
    GeneBankConfigSchema,
    GeneBankStats,
    GeneStorageAdapter,
    GeneSearchFilters,
    GeneSearchFiltersSchema,
} from './GeneBank';

// Gene Extractor (extract from mutations)
export {
    GeneExtractor,
    GeneExtractionConfig,
    GeneExtractionConfigSchema,
    MutationContext,
} from './GeneExtractor';

// Gene Matcher (find and rank genes)
export {
    GeneMatcher,
    GeneMatchConfig,
    GeneMatchConfigSchema,
    MatchContext,
    GeneMatchResult,
} from './GeneMatcher';

// Sandbox Tester (test genes safely)
export {
    SandboxTester,
    SandboxConfig,
    SandboxConfigSchema,
    SandboxTestCase,
    TestCaseResult,
    SandboxTestResult,
    BaselinePerformance,
} from './SandboxTester';

// Gene Adopter (orchestrate adoption)
export {
    GeneAdopter,
    GeneAdoptionConfig,
    GeneAdoptionConfigSchema,
    AdoptionRequest,
    AdoptedGeneStatus,
} from './GeneAdopter';
