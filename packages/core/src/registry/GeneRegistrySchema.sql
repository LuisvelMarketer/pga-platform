-- ═══════════════════════════════════════════════════════════
-- Gene Registry Database Schema
--
-- The MOAT - Cross-genome knowledge sharing via validated genes
--
-- Author: Luis Alfredo Velasquez Duran
-- Created: 2026-02-27
-- Version: 2.0.0
-- ═══════════════════════════════════════════════════════════

-- ─── Gene Families ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gene_families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100), -- 'customer-support', 'code-review', 'data-analysis', etc.

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),

    -- Statistics
    member_count INTEGER DEFAULT 0,
    gene_count INTEGER DEFAULT 0,
    total_usage INTEGER DEFAULT 0
);

CREATE INDEX idx_gene_families_category ON gene_families(category);
CREATE INDEX idx_gene_families_created_at ON gene_families(created_at DESC);

-- ─── Validated Genes ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS validated_genes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Gene Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    family_id UUID NOT NULL REFERENCES gene_families(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'tool-usage', 'coding-patterns', 'communication', etc.

    -- Gene Content
    content TEXT NOT NULL, -- The actual gene content (prompt instructions)
    version INTEGER NOT NULL DEFAULT 1,

    -- Origin Tracking
    source_genome_id UUID, -- Original genome that created this gene
    source_gene_id VARCHAR(255), -- Original gene ID in source genome
    creator_user_id VARCHAR(255),

    -- Validation Status
    validation_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    validated_at TIMESTAMPTZ,
    validated_by VARCHAR(255),
    validation_notes TEXT,

    -- Fitness Metrics (from validation testing)
    quality DECIMAL(4,3), -- 0-1
    success_rate DECIMAL(4,3), -- 0-1
    token_efficiency DECIMAL(4,3), -- 0-1
    avg_latency INTEGER, -- milliseconds
    cost_per_success DECIMAL(8,6), -- USD
    intervention_rate DECIMAL(4,3), -- 0-1
    composite_fitness DECIMAL(4,3), -- 0-1

    -- Usage Statistics
    usage_count INTEGER DEFAULT 0,
    inheritance_count INTEGER DEFAULT 0, -- How many times inherited
    inheritance_success_rate DECIMAL(4,3) DEFAULT 0.0, -- Success rate when inherited
    avg_fitness_gain DECIMAL(4,3) DEFAULT 0.0, -- Average improvement when inherited

    -- Community
    rating_count INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2), -- 1-5 stars

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,

    -- Business (for marketplace)
    price_usd DECIMAL(10,2) DEFAULT 0.00,
    license VARCHAR(50) DEFAULT 'MIT', -- 'MIT', 'Apache-2.0', 'proprietary', etc.

    -- Soft delete
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_validated_genes_family ON validated_genes(family_id);
CREATE INDEX idx_validated_genes_category ON validated_genes(category);
CREATE INDEX idx_validated_genes_status ON validated_genes(validation_status);
CREATE INDEX idx_validated_genes_fitness ON validated_genes(composite_fitness DESC);
CREATE INDEX idx_validated_genes_usage ON validated_genes(usage_count DESC);
CREATE INDEX idx_validated_genes_rating ON validated_genes(avg_rating DESC);
CREATE INDEX idx_validated_genes_deleted ON validated_genes(deleted_at) WHERE deleted_at IS NULL;

-- ─── Gene Inheritance History ───────────────────────────────

CREATE TABLE IF NOT EXISTS gene_inheritance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was inherited
    gene_id UUID NOT NULL REFERENCES validated_genes(id) ON DELETE CASCADE,

    -- Where it was inherited
    target_genome_id UUID NOT NULL,
    target_genome_family_id UUID NOT NULL REFERENCES gene_families(id),

    -- Who inherited it
    user_id VARCHAR(255) NOT NULL,

    -- When inherited
    inherited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Impact Metrics
    fitness_before DECIMAL(4,3), -- Fitness before inheritance
    fitness_after DECIMAL(4,3), -- Fitness after inheritance
    fitness_gain DECIMAL(4,3), -- Improvement (can be negative)

    -- Validation
    test_duration_ms INTEGER, -- How long sandbox test took
    test_passed BOOLEAN NOT NULL,
    test_results JSONB, -- Full test results

    -- Status
    active BOOLEAN DEFAULT TRUE, -- Is this gene still active in target genome?
    deactivated_at TIMESTAMPTZ,
    deactivation_reason TEXT,

    -- Metadata
    compatibility_score DECIMAL(4,3), -- How compatible was this gene (0-1)
    metadata JSONB -- Additional context
);

CREATE INDEX idx_gene_inheritance_gene ON gene_inheritance(gene_id);
CREATE INDEX idx_gene_inheritance_genome ON gene_inheritance(target_genome_id);
CREATE INDEX idx_gene_inheritance_user ON gene_inheritance(user_id);
CREATE INDEX idx_gene_inheritance_active ON gene_inheritance(active) WHERE active = TRUE;
CREATE INDEX idx_gene_inheritance_gain ON gene_inheritance(fitness_gain DESC);

-- ─── Gene Ratings & Reviews ─────────────────────────────────

CREATE TABLE IF NOT EXISTS gene_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    gene_id UUID NOT NULL REFERENCES validated_genes(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,

    -- Rating
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,

    -- Context
    genome_id UUID, -- Which genome was this used in
    use_case VARCHAR(255), -- What was it used for

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one rating per user per gene
    UNIQUE(gene_id, user_id)
);

CREATE INDEX idx_gene_ratings_gene ON gene_ratings(gene_id);
CREATE INDEX idx_gene_ratings_rating ON gene_ratings(rating DESC);

-- ─── Genome Registry ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS genome_registry (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    family_id UUID NOT NULL REFERENCES gene_families(id),

    -- Owner
    owner_user_id VARCHAR(255) NOT NULL,

    -- Visibility
    visibility VARCHAR(50) NOT NULL DEFAULT 'private', -- 'private', 'family', 'public'

    -- Statistics
    total_interactions INTEGER DEFAULT 0,
    inherited_genes_count INTEGER DEFAULT 0,
    contributed_genes_count INTEGER DEFAULT 0,

    -- Fitness
    current_fitness DECIMAL(4,3),
    fitness_history JSONB[], -- Array of fitness snapshots

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_genome_registry_family ON genome_registry(family_id);
CREATE INDEX idx_genome_registry_owner ON genome_registry(owner_user_id);
CREATE INDEX idx_genome_registry_visibility ON genome_registry(visibility);
CREATE INDEX idx_genome_registry_fitness ON genome_registry(current_fitness DESC);

-- ─── Inheritance Policies ───────────────────────────────────

CREATE TABLE IF NOT EXISTS inheritance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Policy Identity
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,

    -- Rules
    min_compatibility_score DECIMAL(4,3) DEFAULT 0.60,
    min_fitness_threshold DECIMAL(4,3) DEFAULT 0.70,
    min_success_rate DECIMAL(4,3) DEFAULT 0.80,
    max_cost_per_success DECIMAL(8,6) DEFAULT 0.01,

    -- Restrictions
    allowed_families UUID[], -- Array of family IDs (NULL = all allowed)
    blocked_families UUID[], -- Array of family IDs to block

    -- Auto-approval
    auto_approve_threshold DECIMAL(4,3) DEFAULT 0.90, -- Auto-approve if fitness > this
    require_manual_review BOOLEAN DEFAULT FALSE,

    -- Created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- ─── Usage Analytics ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gene_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    gene_id UUID NOT NULL REFERENCES validated_genes(id) ON DELETE CASCADE,
    genome_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,

    -- Time period
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),

    -- Metrics
    usage_count INTEGER DEFAULT 1,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0.0,
    avg_latency INTEGER,

    -- Aggregation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint for aggregation
    UNIQUE(gene_id, genome_id, user_id, date, hour)
);

CREATE INDEX idx_gene_usage_gene ON gene_usage_analytics(gene_id);
CREATE INDEX idx_gene_usage_genome ON gene_usage_analytics(genome_id);
CREATE INDEX idx_gene_usage_date ON gene_usage_analytics(date DESC);

-- ─── Views ──────────────────────────────────────────────────

-- Top performing genes view
CREATE OR REPLACE VIEW top_genes AS
SELECT
    vg.id,
    vg.name,
    vg.description,
    vg.category,
    gf.name AS family_name,
    vg.composite_fitness,
    vg.success_rate,
    vg.usage_count,
    vg.inheritance_count,
    vg.inheritance_success_rate,
    vg.avg_fitness_gain,
    vg.avg_rating,
    vg.rating_count
FROM validated_genes vg
JOIN gene_families gf ON vg.family_id = gf.id
WHERE vg.validation_status = 'approved'
  AND vg.deleted_at IS NULL
ORDER BY vg.composite_fitness DESC, vg.usage_count DESC;

-- Gene leaderboard view
CREATE OR REPLACE VIEW gene_leaderboard AS
SELECT
    vg.id,
    vg.name,
    vg.family_id,
    gf.name AS family_name,
    vg.category,
    vg.composite_fitness,
    vg.usage_count,
    vg.inheritance_count,
    vg.avg_fitness_gain,
    vg.avg_rating,
    -- Composite score for ranking
    (
        vg.composite_fitness * 0.4 +
        (vg.usage_count::DECIMAL / NULLIF((SELECT MAX(usage_count) FROM validated_genes), 0)) * 0.3 +
        (vg.inheritance_success_rate) * 0.2 +
        (vg.avg_rating / 5.0) * 0.1
    ) AS leaderboard_score
FROM validated_genes vg
JOIN gene_families gf ON vg.family_id = gf.id
WHERE vg.validation_status = 'approved'
  AND vg.deleted_at IS NULL
ORDER BY leaderboard_score DESC;

-- Family statistics view
CREATE OR REPLACE VIEW family_stats AS
SELECT
    gf.id,
    gf.name,
    gf.category,
    COUNT(DISTINCT gr.id) AS member_genomes,
    COUNT(DISTINCT vg.id) AS total_genes,
    AVG(vg.composite_fitness) AS avg_gene_fitness,
    SUM(vg.usage_count) AS total_gene_usage,
    SUM(vg.inheritance_count) AS total_inheritances
FROM gene_families gf
LEFT JOIN genome_registry gr ON gf.id = gr.family_id
LEFT JOIN validated_genes vg ON gf.id = vg.family_id AND vg.validation_status = 'approved'
GROUP BY gf.id, gf.name, gf.category;

-- ─── Functions ──────────────────────────────────────────────

-- Update gene statistics after inheritance
CREATE OR REPLACE FUNCTION update_gene_stats_after_inheritance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update validated_genes stats
    UPDATE validated_genes
    SET
        inheritance_count = inheritance_count + 1,
        usage_count = usage_count + 1,
        inheritance_success_rate = (
            SELECT AVG(CASE WHEN test_passed THEN 1.0 ELSE 0.0 END)
            FROM gene_inheritance
            WHERE gene_id = NEW.gene_id
        ),
        avg_fitness_gain = (
            SELECT AVG(fitness_gain)
            FROM gene_inheritance
            WHERE gene_id = NEW.gene_id AND test_passed = TRUE
        ),
        updated_at = NOW()
    WHERE id = NEW.gene_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gene_stats
AFTER INSERT ON gene_inheritance
FOR EACH ROW
EXECUTE FUNCTION update_gene_stats_after_inheritance();

-- Update family statistics
CREATE OR REPLACE FUNCTION update_family_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE gene_families
    SET
        gene_count = (
            SELECT COUNT(*)
            FROM validated_genes
            WHERE family_id = NEW.family_id AND validation_status = 'approved'
        ),
        updated_at = NOW()
    WHERE id = NEW.family_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_family_stats
AFTER INSERT OR UPDATE ON validated_genes
FOR EACH ROW
EXECUTE FUNCTION update_family_stats();

-- ─── Initial Data ───────────────────────────────────────────

-- Create default families
INSERT INTO gene_families (name, description, category) VALUES
('customer-support', 'Customer support and helpdesk agents', 'support'),
('code-review', 'Code review and quality assurance', 'development'),
('data-analysis', 'Data analysis and visualization', 'analytics'),
('content-creation', 'Content writing and editing', 'creative'),
('personal-assistant', 'Personal productivity and organization', 'productivity')
ON CONFLICT (name) DO NOTHING;

-- Create default inheritance policy
INSERT INTO inheritance_policies (name, description) VALUES
('default-policy', 'Default inheritance policy with balanced safety and exploration')
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- End of Gene Registry Schema
-- ═══════════════════════════════════════════════════════════
