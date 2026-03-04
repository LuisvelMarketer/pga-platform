/**
 * PostgreSQL Storage Adapter for Gene Bank
 *
 * Implements GeneStorageAdapter interface with PostgreSQL backend
 *
 * @version 0.4.0
 */

import type { CognitiveGene } from '../CognitiveGene';
import type { GeneStorageAdapter, GeneSearchFilters } from '../GeneBank';

/**
 * PostgreSQL connection interface
 * Compatible with pg, postgres.js, or any SQL client
 */
export interface PostgresConnection {
    query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
}

/**
 * SQL Schema for Gene Bank Tables
 *
 * Run this to create the necessary tables:
 *
 * ```sql
 * -- Cognitive Genes table
 * CREATE TABLE cognitive_genes (
 *   id VARCHAR(255) PRIMARY KEY,
 *   version VARCHAR(50) NOT NULL,
 *   name VARCHAR(255) NOT NULL,
 *   description TEXT,
 *   type VARCHAR(100) NOT NULL,
 *   domain VARCHAR(100) NOT NULL,
 *
 *   -- Fitness metrics (JSONB for flexibility)
 *   fitness JSONB NOT NULL,
 *
 *   -- Lineage tracking
 *   parent_gene_id VARCHAR(255),
 *   generation INTEGER NOT NULL DEFAULT 0,
 *   ancestors JSONB NOT NULL DEFAULT '[]'::jsonb,
 *   mutation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
 *
 *   -- Content
 *   instruction TEXT NOT NULL,
 *   examples JSONB DEFAULT '[]'::jsonb,
 *   required_capabilities JSONB DEFAULT '[]'::jsonb,
 *   applicable_contexts JSONB DEFAULT '[]'::jsonb,
 *   contraindications JSONB DEFAULT '[]'::jsonb,
 *   content_metadata JSONB DEFAULT '{}'::jsonb,
 *
 *   -- Tenant & Sharing
 *   tenant_id VARCHAR(255) NOT NULL,
 *   created_by VARCHAR(255) NOT NULL,
 *   scope VARCHAR(50) NOT NULL,
 *   verified BOOLEAN DEFAULT FALSE,
 *
 *   -- Timestamps
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *
 *   -- Tags (for search)
 *   tags JSONB DEFAULT '[]'::jsonb,
 *
 *   -- Indexes
 *   CONSTRAINT fk_parent_gene FOREIGN KEY (parent_gene_id) REFERENCES cognitive_genes(id) ON DELETE SET NULL
 * );
 *
 * -- Indexes for fast queries
 * CREATE INDEX idx_genes_tenant_id ON cognitive_genes(tenant_id);
 * CREATE INDEX idx_genes_type ON cognitive_genes(type);
 * CREATE INDEX idx_genes_domain ON cognitive_genes(domain);
 * CREATE INDEX idx_genes_scope ON cognitive_genes(scope);
 * CREATE INDEX idx_genes_fitness ON cognitive_genes((fitness->>'overallFitness'));
 * CREATE INDEX idx_genes_tags ON cognitive_genes USING GIN (tags);
 * CREATE INDEX idx_genes_created_at ON cognitive_genes(created_at DESC);
 *
 * -- Gene Adoptions table
 * CREATE TABLE gene_adoptions (
 *   id SERIAL PRIMARY KEY,
 *   gene_id VARCHAR(255) NOT NULL REFERENCES cognitive_genes(id) ON DELETE CASCADE,
 *   agent_id VARCHAR(255) NOT NULL,
 *   performance DECIMAL(5,4) NOT NULL,
 *   adopted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *
 *   CONSTRAINT unique_adoption UNIQUE (gene_id, agent_id, adopted_at)
 * );
 *
 * CREATE INDEX idx_adoptions_gene_id ON gene_adoptions(gene_id);
 * CREATE INDEX idx_adoptions_agent_id ON gene_adoptions(agent_id);
 * CREATE INDEX idx_adoptions_adopted_at ON gene_adoptions(adopted_at DESC);
 * ```
 */

/**
 * PostgreSQL Gene Storage Adapter
 */
export class PostgresGeneStorage implements GeneStorageAdapter {
    constructor(private connection: PostgresConnection) {}

    /**
     * Store a new gene
     */
    async store(gene: CognitiveGene): Promise<void> {
        await this.connection.query(
            `
            INSERT INTO cognitive_genes (
                id, version, name, description, type, domain,
                fitness,
                parent_gene_id, generation, ancestors, mutation_history,
                instruction, examples, required_capabilities,
                applicable_contexts, contraindications, content_metadata,
                tenant_id, created_by, scope, verified,
                created_at, updated_at, tags
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7::jsonb,
                $8, $9, $10::jsonb, $11::jsonb,
                $12, $13::jsonb, $14::jsonb,
                $15::jsonb, $16::jsonb, $17::jsonb,
                $18, $19, $20, $21,
                $22, $23, $24::jsonb
            )
            `,
            [
                gene.id,
                gene.version,
                gene.name,
                gene.description,
                gene.type,
                gene.domain,
                JSON.stringify(gene.fitness),
                gene.lineage.parentGeneId,
                gene.lineage.generation,
                JSON.stringify(gene.lineage.ancestors),
                JSON.stringify(gene.lineage.mutationHistory),
                gene.content.instruction,
                JSON.stringify(gene.content.examples || []),
                JSON.stringify(gene.content.requiredCapabilities || []),
                JSON.stringify(gene.content.applicableContexts || []),
                JSON.stringify(gene.content.contraindications || []),
                JSON.stringify(gene.content.metadata || {}),
                gene.tenant.tenantId,
                gene.tenant.createdBy,
                gene.tenant.scope,
                gene.tenant.verified,
                gene.createdAt,
                gene.updatedAt,
                JSON.stringify(gene.tags),
            ]
        );
    }

    /**
     * Retrieve gene by ID
     */
    async get(geneId: string): Promise<CognitiveGene | null> {
        const result = await this.connection.query(
            'SELECT * FROM cognitive_genes WHERE id = $1',
            [geneId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.rowToGene(result.rows[0]);
    }

    /**
     * Update existing gene
     */
    async update(gene: CognitiveGene): Promise<void> {
        await this.connection.query(
            `
            UPDATE cognitive_genes SET
                version = $2,
                name = $3,
                description = $4,
                type = $5,
                domain = $6,
                fitness = $7::jsonb,
                parent_gene_id = $8,
                generation = $9,
                ancestors = $10::jsonb,
                mutation_history = $11::jsonb,
                instruction = $12,
                examples = $13::jsonb,
                required_capabilities = $14::jsonb,
                applicable_contexts = $15::jsonb,
                contraindications = $16::jsonb,
                content_metadata = $17::jsonb,
                tenant_id = $18,
                created_by = $19,
                scope = $20,
                verified = $21,
                updated_at = $22,
                tags = $23::jsonb
            WHERE id = $1
            `,
            [
                gene.id,
                gene.version,
                gene.name,
                gene.description,
                gene.type,
                gene.domain,
                JSON.stringify(gene.fitness),
                gene.lineage.parentGeneId,
                gene.lineage.generation,
                JSON.stringify(gene.lineage.ancestors),
                JSON.stringify(gene.lineage.mutationHistory),
                gene.content.instruction,
                JSON.stringify(gene.content.examples || []),
                JSON.stringify(gene.content.requiredCapabilities || []),
                JSON.stringify(gene.content.applicableContexts || []),
                JSON.stringify(gene.content.contraindications || []),
                JSON.stringify(gene.content.metadata || {}),
                gene.tenant.tenantId,
                gene.tenant.createdBy,
                gene.tenant.scope,
                gene.tenant.verified,
                gene.updatedAt,
                JSON.stringify(gene.tags),
            ]
        );
    }

    /**
     * Delete gene by ID
     */
    async delete(geneId: string): Promise<void> {
        await this.connection.query(
            'DELETE FROM cognitive_genes WHERE id = $1',
            [geneId]
        );
    }

    /**
     * Search genes by filters
     */
    async search(filters: GeneSearchFilters): Promise<CognitiveGene[]> {
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        // Tenant filter
        if (filters.tenantId) {
            conditions.push(`tenant_id = $${paramIndex++}`);
            params.push(filters.tenantId);
        }

        // Type filter
        if (filters.type && filters.type.length > 0) {
            conditions.push(`type = ANY($${paramIndex++})`);
            params.push(filters.type);
        }

        // Domain filter
        if (filters.domain && filters.domain.length > 0) {
            conditions.push(`domain = ANY($${paramIndex++})`);
            params.push(filters.domain);
        }

        // Fitness filter
        if (filters.minFitness !== undefined) {
            conditions.push(`(fitness->>'overallFitness')::numeric >= $${paramIndex++}`);
            params.push(filters.minFitness);
        }

        // Adoptions filter
        if (filters.minAdoptions !== undefined) {
            conditions.push(`(fitness->>'adoptionCount')::integer >= $${paramIndex++}`);
            params.push(filters.minAdoptions);
        }

        // Scope filter
        if (filters.scope && filters.scope.length > 0) {
            conditions.push(`scope = ANY($${paramIndex++})`);
            params.push(filters.scope);
        }

        // Verified filter
        if (filters.verifiedOnly) {
            conditions.push('verified = TRUE');
        }

        // Tags filter (JSONB array contains)
        if (filters.tags && filters.tags.length > 0) {
            conditions.push(`tags ?| $${paramIndex++}`);
            params.push(filters.tags);
        }

        // Build WHERE clause
        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        // Sorting
        const sortBy = filters.sortBy || 'fitness';
        const sortOrder = filters.sortOrder || 'desc';
        let orderBy = '';

        switch (sortBy) {
            case 'fitness':
                orderBy = `(fitness->>'overallFitness')::numeric ${sortOrder.toUpperCase()}`;
                break;
            case 'adoptions':
                orderBy = `(fitness->>'adoptionCount')::integer ${sortOrder.toUpperCase()}`;
                break;
            case 'createdAt':
                orderBy = `created_at ${sortOrder.toUpperCase()}`;
                break;
            case 'updatedAt':
                orderBy = `updated_at ${sortOrder.toUpperCase()}`;
                break;
            default:
                orderBy = `created_at DESC`;
        }

        // Pagination
        const limit = filters.limit || 10;
        const offset = filters.offset || 0;

        const sql = `
            SELECT * FROM cognitive_genes
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        params.push(limit, offset);

        const result = await this.connection.query(sql, params);
        return result.rows.map(row => this.rowToGene(row));
    }

    /**
     * List genes by tenant
     */
    async listByTenant(tenantId: string, scope?: string): Promise<CognitiveGene[]> {
        const sql = scope
            ? 'SELECT * FROM cognitive_genes WHERE tenant_id = $1 AND scope = $2'
            : 'SELECT * FROM cognitive_genes WHERE tenant_id = $1';

        const params = scope ? [tenantId, scope] : [tenantId];

        const result = await this.connection.query(sql, params);
        return result.rows.map(row => this.rowToGene(row));
    }

    /**
     * Get gene lineage (ancestors)
     */
    async getLineage(geneId: string): Promise<CognitiveGene[]> {
        // Recursive CTE to fetch lineage
        const sql = `
            WITH RECURSIVE gene_lineage AS (
                -- Base case: the gene itself
                SELECT * FROM cognitive_genes WHERE id = $1

                UNION ALL

                -- Recursive case: parent genes
                SELECT g.*
                FROM cognitive_genes g
                INNER JOIN gene_lineage gl ON g.id = gl.parent_gene_id
            )
            SELECT * FROM gene_lineage
            WHERE id != $1
            ORDER BY generation DESC
        `;

        const result = await this.connection.query(sql, [geneId]);
        return result.rows.map(row => this.rowToGene(row));
    }

    /**
     * Record gene adoption
     */
    async recordAdoption(geneId: string, agentId: string, performance: number): Promise<void> {
        // Insert adoption record
        await this.connection.query(
            `
            INSERT INTO gene_adoptions (gene_id, agent_id, performance)
            VALUES ($1, $2, $3)
            `,
            [geneId, agentId, performance]
        );

        // Update gene adoption metrics
        const adoptionsResult = await this.connection.query(
            `
            SELECT COUNT(*)::integer as count, AVG(performance)::numeric as avg_performance
            FROM gene_adoptions
            WHERE gene_id = $1
            `,
            [geneId]
        );

        const { count, avg_performance } = adoptionsResult.rows[0];

        await this.connection.query(
            `
            UPDATE cognitive_genes
            SET fitness = jsonb_set(
                    jsonb_set(
                        fitness,
                        '{adoptionCount}',
                        $2::text::jsonb
                    ),
                    '{adoptionPerformance}',
                    $3::text::jsonb
                ),
                updated_at = NOW()
            WHERE id = $1
            `,
            [geneId, count, avg_performance]
        );
    }

    /**
     * Convert database row to CognitiveGene
     */
    private rowToGene(row: any): CognitiveGene {
        return {
            id: row.id,
            version: row.version,
            name: row.name,
            description: row.description,
            type: row.type,
            domain: row.domain,
            fitness: row.fitness,
            lineage: {
                parentGeneId: row.parent_gene_id,
                generation: row.generation,
                ancestors: row.ancestors,
                mutationHistory: row.mutation_history,
            },
            content: {
                instruction: row.instruction,
                examples: row.examples,
                requiredCapabilities: row.required_capabilities,
                applicableContexts: row.applicable_contexts,
                contraindications: row.contraindications,
                metadata: row.content_metadata,
            },
            tenant: {
                tenantId: row.tenant_id,
                createdBy: row.created_by,
                scope: row.scope,
                verified: row.verified,
            },
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString(),
            tags: row.tags,
        };
    }
}
