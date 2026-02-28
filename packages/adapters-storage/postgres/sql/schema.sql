-- PGA PostgreSQL Schema
-- Created by Luis Alfredo Velasquez Duran (Germany, 2025)

-- ═══════════════════════════════════════════════════════════
-- GENOMES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pga_genomes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    -- Living OS v1.0: Lineage tracking
    family_id TEXT,
    version INTEGER DEFAULT 1,
    lineage JSONB DEFAULT '{}',
    c0_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_genomes_name ON pga_genomes(name);
CREATE INDEX IF NOT EXISTS idx_genomes_family ON pga_genomes(family_id, version DESC);

-- ═══════════════════════════════════════════════════════════
-- LAYERS (Three-Layer Architecture)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pga_alleles (
    id BIGSERIAL PRIMARY KEY,
    genome_id TEXT NOT NULL REFERENCES pga_genomes(id) ON DELETE CASCADE,
    layer INTEGER NOT NULL CHECK (layer IN (0, 1, 2)),
    gene TEXT NOT NULL,
    variant TEXT NOT NULL,
    content TEXT NOT NULL,
    fitness NUMERIC(5,4) DEFAULT 0.5000,
    sample_count INTEGER DEFAULT 0,
    parent_variant TEXT,
    generation INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'retired')),
    sandbox_tested BOOLEAN DEFAULT FALSE,
    sandbox_score NUMERIC(5,4),
    recent_scores JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(genome_id, layer, gene, variant)
);

CREATE INDEX IF NOT EXISTS idx_alleles_genome ON pga_alleles(genome_id);
CREATE INDEX IF NOT EXISTS idx_alleles_active ON pga_alleles(genome_id, layer, gene, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_alleles_fitness ON pga_alleles(genome_id, layer, gene, fitness DESC);

-- ═══════════════════════════════════════════════════════════
-- USER DNA (Cognitive Profiles)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pga_user_dna (
    user_id TEXT NOT NULL,
    genome_id TEXT NOT NULL REFERENCES pga_genomes(id) ON DELETE CASCADE,
    traits JSONB NOT NULL DEFAULT '{}',
    confidence JSONB NOT NULL DEFAULT '{}',
    generation INTEGER DEFAULT 0,
    last_evolved TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, genome_id)
);

CREATE INDEX IF NOT EXISTS idx_user_dna_genome ON pga_user_dna(genome_id);
CREATE INDEX IF NOT EXISTS idx_user_dna_evolved ON pga_user_dna(genome_id, last_evolved DESC);

-- ═══════════════════════════════════════════════════════════
-- INTERACTIONS (Learning Data)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pga_interactions (
    id BIGSERIAL PRIMARY KEY,
    genome_id TEXT NOT NULL REFERENCES pga_genomes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    tool_calls JSONB DEFAULT '[]',
    score NUMERIC(5,4),
    task_type TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_genome ON pga_interactions(genome_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON pga_interactions(genome_id, user_id, timestamp DESC);

-- ═══════════════════════════════════════════════════════════
-- MUTATIONS (Evolution Log)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pga_mutations (
    id BIGSERIAL PRIMARY KEY,
    genome_id TEXT NOT NULL REFERENCES pga_genomes(id) ON DELETE CASCADE,
    layer INTEGER NOT NULL,
    gene TEXT NOT NULL,
    variant TEXT NOT NULL,
    mutation_type TEXT NOT NULL,
    parent_variant TEXT,
    trigger_reason TEXT,
    fitness_delta NUMERIC(5,4),
    deployed BOOLEAN DEFAULT FALSE,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mutations_genome ON pga_mutations(genome_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mutations_gene ON pga_mutations(genome_id, gene, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mutations_deployed ON pga_mutations(genome_id, deployed, timestamp DESC);

-- ═══════════════════════════════════════════════════════════
-- FEEDBACK (User Feedback Signals)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pga_feedback (
    id BIGSERIAL PRIMARY KEY,
    genome_id TEXT NOT NULL REFERENCES pga_genomes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    gene TEXT,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_genome ON pga_feedback(genome_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON pga_feedback(genome_id, user_id, timestamp DESC);

-- ═══════════════════════════════════════════════════════════
-- ANALYTICS (Pre-aggregated Stats)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pga_analytics (
    genome_id TEXT NOT NULL REFERENCES pga_genomes(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    value JSONB NOT NULL,
    snapshot_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (genome_id, metric, snapshot_at)
);

CREATE INDEX IF NOT EXISTS idx_analytics_genome ON pga_analytics(genome_id, snapshot_at DESC);

-- ═══════════════════════════════════════════════════════════
-- GENE REGISTRY (Cross-Genome Knowledge Inheritance)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pga_gene_registry (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    gene TEXT NOT NULL,
    variant TEXT NOT NULL,
    content TEXT NOT NULL,
    layer INTEGER NOT NULL CHECK (layer IN (0, 1, 2)),
    fitness NUMERIC(5,4) NOT NULL,
    sample_count INTEGER NOT NULL,
    success_rate NUMERIC(5,4) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, gene, variant)
);

CREATE INDEX IF NOT EXISTS idx_gene_registry_family ON pga_gene_registry(family_id, fitness DESC);
CREATE INDEX IF NOT EXISTS idx_gene_registry_gene ON pga_gene_registry(family_id, gene, fitness DESC);

-- ═══════════════════════════════════════════════════════════
-- CALIBRATION HISTORY (Dynamic Threshold Tuning)
-- Living OS v1.0 Final 10/10
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pga_calibration_history (
    id BIGSERIAL PRIMARY KEY,
    context_key TEXT NOT NULL,
    layer INTEGER CHECK (layer IN (0, 1, 2)),
    operator TEXT,
    task_type TEXT,
    threshold NUMERIC(5,4) NOT NULL,
    total_candidates INTEGER NOT NULL,
    passed_sandbox INTEGER NOT NULL,
    deployed_successfully INTEGER NOT NULL,
    rolled_back INTEGER NOT NULL,
    false_positive_rate NUMERIC(5,4) NOT NULL,
    false_negative_rate NUMERIC(5,4) NOT NULL,
    optimal_threshold NUMERIC(5,4) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_context ON pga_calibration_history(context_key, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_calibration_layer ON pga_calibration_history(layer, timestamp DESC);
