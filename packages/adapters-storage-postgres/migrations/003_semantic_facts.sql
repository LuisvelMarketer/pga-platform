-- Migration: Semantic Facts Table for Layered Memory
-- Author: Luis Alfredo Velasquez Duran
-- Date: 2026-03-01

-- ─── Semantic Facts Table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS semantic_facts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    genome_id TEXT NOT NULL,

    -- Fact content
    fact TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('profile', 'preference', 'constraint', 'knowledge')),

    -- Metadata
    confidence FLOAT NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    source_turn INTEGER NOT NULL,
    source_interaction_id TEXT,

    -- Lifecycle
    extracted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expiry TIMESTAMP,  -- NULL = never expires
    verified BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Indexes for Performance ───────────────────────────────

-- Primary lookup: get all facts for a user/genome
CREATE INDEX IF NOT EXISTS idx_semantic_facts_user_genome
    ON semantic_facts(user_id, genome_id);

-- Filter by expiry (for cleanup)
CREATE INDEX IF NOT EXISTS idx_semantic_facts_expiry
    ON semantic_facts(expiry)
    WHERE expiry IS NOT NULL;

-- Filter by category
CREATE INDEX IF NOT EXISTS idx_semantic_facts_category
    ON semantic_facts(genome_id, category);

-- Filter by verified facts
CREATE INDEX IF NOT EXISTS idx_semantic_facts_verified
    ON semantic_facts(genome_id, verified)
    WHERE verified = TRUE;

-- Composite index for common query: active facts for user
CREATE INDEX IF NOT EXISTS idx_semantic_facts_active
    ON semantic_facts(user_id, genome_id, expiry)
    WHERE expiry IS NULL OR expiry > NOW();

-- ─── Triggers ──────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_semantic_facts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_semantic_facts_updated_at
    BEFORE UPDATE ON semantic_facts
    FOR EACH ROW
    EXECUTE FUNCTION update_semantic_facts_updated_at();

-- ─── Comments ──────────────────────────────────────────────

COMMENT ON TABLE semantic_facts IS 'Persistent storage for extracted semantic facts (Layered Memory)';
COMMENT ON COLUMN semantic_facts.fact IS 'The actual fact content extracted from conversation';
COMMENT ON COLUMN semantic_facts.category IS 'Classification: profile, preference, constraint, or knowledge';
COMMENT ON COLUMN semantic_facts.confidence IS 'LLM confidence score (0.0 - 1.0)';
COMMENT ON COLUMN semantic_facts.source_turn IS 'Turn number when fact was extracted';
COMMENT ON COLUMN semantic_facts.expiry IS 'When this fact expires (NULL = permanent)';
COMMENT ON COLUMN semantic_facts.verified IS 'User has verified this fact (verified facts never expire)';
