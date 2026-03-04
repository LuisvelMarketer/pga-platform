/**
 * AnalyticMemoryEngine — Knowledge Graph Memory
 *
 * Goes beyond flat fact lists to build a connected knowledge graph
 * with entities, relations, and automatic inference. Enables
 * semantic queries and pattern-based predictions.
 *
 * Key differences from LayeredMemory:
 * - Entities with typed attributes (not flat facts)
 * - Relations between entities (not isolated)
 * - Automatic inference (A→B, B→C therefore A→C)
 * - Temporal pattern detection
 * - Semantic querying
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

// ─── Types ──────────────────────────────────────────────

export interface Entity {
    id: string;
    type: 'user' | 'tool' | 'concept' | 'project' | 'skill' | 'preference';
    name: string;
    attributes: Record<string, unknown>;
    confidence: number;
    firstSeen: Date;
    lastSeen: Date;
    mentionCount: number;
}

export interface Relation {
    id: string;
    from: string;     // entity id
    to: string;       // entity id
    type: RelationType;
    weight: number;    // 0-1: strength of relation
    evidence: string;  // why this relation exists
    confidence: number;
    createdAt: Date;
}

export type RelationType =
    | 'prefers'          // user prefers X
    | 'uses'             // user/project uses X
    | 'works-on'         // user works on project X
    | 'skilled-in'       // user is skilled in X
    | 'related-to'       // concept X is related to Y
    | 'requires'         // project requires X
    | 'follows'          // X follows Y temporally
    | 'implies'          // X implies Y (inference)
    | 'part-of';         // X is part of Y

export interface Inference {
    conclusion: string;
    basis: string[];     // entity/relation IDs that support this
    confidence: number;
    createdAt: Date;
}

export interface MemoryQueryResult {
    entities: Entity[];
    relations: Relation[];
    inferences: Inference[];
    relevanceScore: number;
}

export interface TemporalPattern {
    id: string;
    description: string;
    dayOfWeek?: number;     // 0=Sunday
    hourOfDay?: number;     // 0-23
    frequency: number;
    confidence: number;
    prediction?: string;
}

// ─── Constants ──────────────────────────────────────────

const MAX_ENTITIES = 200;
const MAX_RELATIONS = 500;
const MAX_INFERENCES = 100;
const MIN_CONFIDENCE_FOR_INFERENCE = 0.4;

// Domain implications: when entity X is observed, these relations are inferred
const DOMAIN_IMPLICATIONS: Record<string, Array<{ entity: string; relation: RelationType; confidence: number }>> = {
    'fintech': [
        { entity: 'security', relation: 'implies', confidence: 0.85 },
        { entity: 'compliance', relation: 'implies', confidence: 0.80 },
        { entity: 'precision', relation: 'implies', confidence: 0.75 },
    ],
    'healthcare': [
        { entity: 'privacy', relation: 'implies', confidence: 0.90 },
        { entity: 'compliance', relation: 'implies', confidence: 0.85 },
    ],
    'devops': [
        { entity: 'automation', relation: 'implies', confidence: 0.80 },
        { entity: 'monitoring', relation: 'implies', confidence: 0.75 },
    ],
    'frontend': [
        { entity: 'accessibility', relation: 'implies', confidence: 0.65 },
        { entity: 'responsive-design', relation: 'implies', confidence: 0.70 },
    ],
};

// ─── AnalyticMemoryEngine ───────────────────────────────

export class AnalyticMemoryEngine {
    private entities: Map<string, Entity> = new Map();
    private relations: Relation[] = [];
    private inferences: Inference[] = [];
    private temporalPatterns: TemporalPattern[] = [];
    private observationLog: Array<{ action: string; timestamp: Date }> = [];

    /**
     * Record an observation from an interaction.
     * Automatically extracts entities, relations, and patterns.
     */
    recordObservation(observation: {
        subject: string;
        action: string;
        object?: string;
        context?: Record<string, unknown>;
        timestamp?: Date;
    }): void {
        const ts = observation.timestamp ?? new Date();

        // Ensure subject entity exists
        this.upsertEntity({
            id: observation.subject,
            type: this.classifyEntityType(observation.subject),
            name: observation.subject,
        });

        // Ensure object entity exists
        if (observation.object) {
            this.upsertEntity({
                id: observation.object,
                type: this.classifyEntityType(observation.object),
                name: observation.object,
            });

            // Create relation from action
            const relationType = this.actionToRelation(observation.action);
            this.addRelation(observation.subject, observation.object, relationType, observation.action);
        }

        // Track temporal patterns
        this.observationLog.push({ action: observation.action, timestamp: ts });
        if (this.observationLog.length > 500) {
            this.observationLog = this.observationLog.slice(-250);
        }

        // Run inference if thresholds met
        if (this.entities.size % 5 === 0) {
            this.inferRelations();
        }
    }

    /**
     * Record a semantic fact and extract entities/relations from it.
     */
    recordFact(fact: {
        subject: string;
        predicate: string;
        value: string;
        confidence?: number;
    }): void {
        // Create/update subject entity
        const entity = this.upsertEntity({
            id: fact.subject,
            type: this.classifyEntityType(fact.subject),
            name: fact.subject,
        });
        entity.attributes[fact.predicate] = fact.value;

        // Create object entity for the value
        const valueEntity = this.upsertEntity({
            id: fact.value.toLowerCase().replace(/\s+/g, '-'),
            type: this.classifyEntityType(fact.value),
            name: fact.value,
        });

        // Create relation
        const relationType = this.predicateToRelation(fact.predicate);
        this.addRelation(entity.id, valueEntity.id, relationType, `${fact.subject} ${fact.predicate} ${fact.value}`, fact.confidence);
    }

    /**
     * Query the knowledge graph semantically.
     */
    query(question: string): MemoryQueryResult {
        const lower = question.toLowerCase();
        const tokens = lower.split(/\s+/);

        // Find matching entities
        const matchingEntities: Entity[] = [];
        for (const entity of this.entities.values()) {
            const nameMatch = tokens.some(t => entity.name.toLowerCase().includes(t) || t.includes(entity.name.toLowerCase()));
            const attrMatch = Object.values(entity.attributes).some(v =>
                typeof v === 'string' && tokens.some(t => v.toLowerCase().includes(t))
            );

            if (nameMatch || attrMatch) {
                matchingEntities.push(entity);
            }
        }

        // Find relations connected to matching entities
        const entityIds = new Set(matchingEntities.map(e => e.id));
        const matchingRelations = this.relations.filter(r =>
            entityIds.has(r.from) || entityIds.has(r.to)
        );

        // Find relevant inferences
        const matchingInferences = this.inferences.filter(inf =>
            tokens.some(t => inf.conclusion.toLowerCase().includes(t))
        );

        // Score relevance
        const relevanceScore = matchingEntities.length > 0
            ? Math.min(1, (matchingEntities.length * 0.3 + matchingRelations.length * 0.2) / 3)
            : 0;

        return {
            entities: matchingEntities,
            relations: matchingRelations,
            inferences: matchingInferences,
            relevanceScore,
        };
    }

    /**
     * Detect temporal patterns from observation log.
     */
    detectTemporalPatterns(): TemporalPattern[] {
        const dayFrequency: Map<string, Map<number, number>> = new Map();

        for (const obs of this.observationLog) {
            const day = obs.timestamp.getDay();
            if (!dayFrequency.has(obs.action)) {
                dayFrequency.set(obs.action, new Map());
            }
            const counts = dayFrequency.get(obs.action)!;
            counts.set(day, (counts.get(day) || 0) + 1);
        }

        const patterns: TemporalPattern[] = [];

        for (const [action, dayCounts] of dayFrequency) {
            const entries = Array.from(dayCounts.entries());
            const totalOccurrences = entries.reduce((sum, [, c]) => sum + c, 0);
            if (totalOccurrences < 3) continue;

            // Find dominant day
            const [peakDay, peakCount] = entries.sort((a, b) => b[1] - a[1])[0];
            const confidence = peakCount / totalOccurrences;

            if (confidence >= 0.4) {
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                patterns.push({
                    id: `temporal_${action}_${peakDay}`,
                    description: `${action} tends to happen on ${dayNames[peakDay]}`,
                    dayOfWeek: peakDay,
                    frequency: peakCount,
                    confidence,
                    prediction: `User may need help with ${action} on ${dayNames[peakDay]}`,
                });
            }
        }

        this.temporalPatterns = patterns;
        return patterns;
    }

    /**
     * Get proactive predictions based on current context.
     */
    predict(context: { dayOfWeek?: number; currentTopic?: string }): Array<{ prediction: string; confidence: number }> {
        const predictions: Array<{ prediction: string; confidence: number }> = [];

        // Temporal predictions
        if (context.dayOfWeek !== undefined) {
            for (const pattern of this.temporalPatterns) {
                if (pattern.dayOfWeek === context.dayOfWeek && pattern.prediction) {
                    predictions.push({
                        prediction: pattern.prediction,
                        confidence: pattern.confidence,
                    });
                }
            }
        }

        // Topic-based predictions from relations
        if (context.currentTopic) {
            const relatedEntities = this.getRelatedEntities(context.currentTopic);
            for (const { entity, relation } of relatedEntities) {
                if (relation.type === 'follows') {
                    predictions.push({
                        prediction: `Based on history, ${entity.name} typically follows ${context.currentTopic}`,
                        confidence: relation.confidence,
                    });
                }
            }
        }

        return predictions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Get all entities.
     */
    getEntities(): Entity[] {
        return Array.from(this.entities.values());
    }

    /**
     * Get all relations.
     */
    getRelations(): Relation[] {
        return [...this.relations];
    }

    /**
     * Get all inferences.
     */
    getInferences(): Inference[] {
        return [...this.inferences];
    }

    /**
     * Generate a prompt section with knowledge graph context.
     */
    toPromptSection(currentTopic?: string): string | null {
        if (this.entities.size === 0 && this.inferences.length === 0) {
            return null;
        }

        const lines: string[] = ['## Knowledge Context'];

        // Include relevant entities
        const relevantEntities = currentTopic
            ? this.getRelatedEntities(currentTopic).map(r => r.entity)
            : Array.from(this.entities.values()).sort((a, b) => b.mentionCount - a.mentionCount).slice(0, 5);

        if (relevantEntities.length > 0) {
            lines.push('**Known facts:**');
            for (const entity of relevantEntities.slice(0, 5)) {
                const attrs = Object.entries(entity.attributes)
                    .map(([k, v]) => `${k}=${String(v)}`)
                    .join(', ');
                lines.push(`- ${entity.name}: ${attrs || entity.type}`);
            }
        }

        // Include high-confidence inferences
        const activeInferences = this.inferences.filter(i => i.confidence >= 0.6);
        if (activeInferences.length > 0) {
            lines.push('**Inferences:**');
            for (const inf of activeInferences.slice(0, 3)) {
                lines.push(`- ${inf.conclusion} (confidence: ${(inf.confidence * 100).toFixed(0)}%)`);
            }
        }

        // Include predictions
        const predictions = this.predict({
            dayOfWeek: new Date().getDay(),
            currentTopic,
        });
        if (predictions.length > 0) {
            lines.push('**Predictions:**');
            for (const pred of predictions.slice(0, 2)) {
                lines.push(`- ${pred.prediction}`);
            }
        }

        return lines.length > 1 ? lines.join('\n') : null;
    }

    // ── Private Methods ─────────────────────────────────────

    private upsertEntity(data: { id: string; type: Entity['type']; name: string }): Entity {
        const existing = this.entities.get(data.id);
        if (existing) {
            existing.lastSeen = new Date();
            existing.mentionCount++;
            return existing;
        }

        const entity: Entity = {
            id: data.id,
            type: data.type,
            name: data.name,
            attributes: {},
            confidence: 0.7,
            firstSeen: new Date(),
            lastSeen: new Date(),
            mentionCount: 1,
        };

        // Enforce max entities — evict least mentioned
        if (this.entities.size >= MAX_ENTITIES) {
            const sorted = Array.from(this.entities.entries())
                .sort((a, b) => a[1].mentionCount - b[1].mentionCount);
            if (sorted.length > 0) {
                this.entities.delete(sorted[0][0]);
            }
        }

        this.entities.set(data.id, entity);
        return entity;
    }

    private addRelation(
        fromId: string,
        toId: string,
        type: RelationType,
        evidence: string,
        confidence?: number,
    ): void {
        // Check for existing same-type relation
        const existing = this.relations.find(
            r => r.from === fromId && r.to === toId && r.type === type
        );

        if (existing) {
            existing.weight = Math.min(1, existing.weight + 0.1);
            existing.confidence = Math.min(1, (existing.confidence + (confidence ?? 0.7)) / 2);
            return;
        }

        // Enforce max relations
        if (this.relations.length >= MAX_RELATIONS) {
            // Remove lowest weight relation
            this.relations.sort((a, b) => a.weight - b.weight);
            this.relations.shift();
        }

        this.relations.push({
            id: `rel_${fromId}_${toId}_${type}`,
            from: fromId,
            to: toId,
            type,
            weight: 0.5,
            evidence,
            confidence: confidence ?? 0.7,
            createdAt: new Date(),
        });
    }

    private inferRelations(): void {
        const newInferences: Inference[] = [];

        // Domain implications
        for (const entity of this.entities.values()) {
            const implications = DOMAIN_IMPLICATIONS[entity.name.toLowerCase()];
            if (!implications) continue;

            for (const impl of implications) {
                // Create implied entity if not exists
                const impliedEntity = this.upsertEntity({
                    id: impl.entity,
                    type: 'concept',
                    name: impl.entity,
                });

                // Create relation
                this.addRelation(entity.id, impliedEntity.id, impl.relation,
                    `${entity.name} implies ${impl.entity}`, impl.confidence);

                newInferences.push({
                    conclusion: `Since user works in ${entity.name}, ${impl.entity} is likely important`,
                    basis: [entity.id, impliedEntity.id],
                    confidence: impl.confidence,
                    createdAt: new Date(),
                });
            }
        }

        // Transitive relations: if A→B and B→C (both 'uses' or 'related-to'), infer A→C
        for (const relAB of this.relations) {
            if (relAB.confidence < MIN_CONFIDENCE_FOR_INFERENCE) continue;

            for (const relBC of this.relations) {
                if (relBC.from !== relAB.to) continue;
                if (relBC.confidence < MIN_CONFIDENCE_FOR_INFERENCE) continue;
                if (relAB.type !== relBC.type) continue;
                if (relAB.from === relBC.to) continue; // avoid cycles

                // Check if A→C already exists
                const existingAC = this.relations.find(
                    r => r.from === relAB.from && r.to === relBC.to && r.type === relAB.type
                );
                if (existingAC) continue;

                const inferredConfidence = relAB.confidence * relBC.confidence * 0.8;
                if (inferredConfidence < MIN_CONFIDENCE_FOR_INFERENCE) continue;

                const fromEntity = this.entities.get(relAB.from);
                const toEntity = this.entities.get(relBC.to);

                newInferences.push({
                    conclusion: `${fromEntity?.name || relAB.from} ${relAB.type} ${toEntity?.name || relBC.to} (inferred)`,
                    basis: [relAB.id, relBC.id],
                    confidence: inferredConfidence,
                    createdAt: new Date(),
                });
            }
        }

        // Merge new inferences, avoiding duplicates
        for (const inf of newInferences) {
            const exists = this.inferences.some(i => i.conclusion === inf.conclusion);
            if (!exists) {
                this.inferences.push(inf);
            }
        }

        // Enforce max inferences
        if (this.inferences.length > MAX_INFERENCES) {
            this.inferences.sort((a, b) => b.confidence - a.confidence);
            this.inferences = this.inferences.slice(0, MAX_INFERENCES);
        }
    }

    private getRelatedEntities(topic: string): Array<{ entity: Entity; relation: Relation }> {
        const topicLower = topic.toLowerCase();
        const results: Array<{ entity: Entity; relation: Relation }> = [];

        // Find entity matching topic
        let topicEntityId: string | null = null;
        for (const entity of this.entities.values()) {
            if (entity.name.toLowerCase().includes(topicLower) || topicLower.includes(entity.name.toLowerCase())) {
                topicEntityId = entity.id;
                break;
            }
        }

        if (!topicEntityId) return results;

        // Find all related entities
        for (const relation of this.relations) {
            if (relation.from === topicEntityId) {
                const entity = this.entities.get(relation.to);
                if (entity) results.push({ entity, relation });
            } else if (relation.to === topicEntityId) {
                const entity = this.entities.get(relation.from);
                if (entity) results.push({ entity, relation });
            }
        }

        return results.sort((a, b) => b.relation.confidence - a.relation.confidence);
    }

    private classifyEntityType(name: string): Entity['type'] {
        const lower = name.toLowerCase();
        if (lower.startsWith('user') || lower === 'luis') return 'user';
        if (['python', 'javascript', 'typescript', 'react', 'vue', 'docker', 'kubernetes'].includes(lower)) return 'tool';
        if (['fintech', 'healthcare', 'devops', 'frontend', 'backend'].includes(lower)) return 'concept';
        return 'concept';
    }

    private actionToRelation(action: string): RelationType {
        const lower = action.toLowerCase();
        if (lower.includes('prefer')) return 'prefers';
        if (lower.includes('use') || lower.includes('uses')) return 'uses';
        if (lower.includes('work')) return 'works-on';
        if (lower.includes('skill') || lower.includes('knows')) return 'skilled-in';
        if (lower.includes('require') || lower.includes('need')) return 'requires';
        if (lower.includes('follow') || lower.includes('then') || lower.includes('after')) return 'follows';
        return 'related-to';
    }

    private predicateToRelation(predicate: string): RelationType {
        const lower = predicate.toLowerCase();
        if (lower.includes('prefer')) return 'prefers';
        if (lower.includes('use')) return 'uses';
        if (lower.includes('work')) return 'works-on';
        if (lower.includes('skill') || lower.includes('expert')) return 'skilled-in';
        if (lower.includes('part') || lower.includes('component')) return 'part-of';
        return 'related-to';
    }
}
