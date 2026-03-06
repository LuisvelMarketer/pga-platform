/**
 * Genome Routes — CRUD operations for genome management
 *
 * All routes require admin API key authentication.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { FastifyInstance } from 'fastify';
import type { PGAServer } from '../PGAServer.js';

export function registerGenomeRoutes(app: FastifyInstance, server: PGAServer): void {

    // ─── Create Genome ─────────────────────────────────────

    app.post('/api/genomes', async (request, reply) => {
        const apiKey = request.headers['x-pga-admin-key'] as string | undefined;
        if (!server.verifyAdminKey(apiKey)) {
            return reply.status(401).send({ error: 'Invalid or missing admin API key' });
        }

        const body = request.body as {
            name: string;
            systemPrompt: string;
            protect?: string[];
            evolve?: Array<string | { category: string; content: string }>;
            adapt?: Array<string | { trait: string; content: string }>;
        };

        if (!body.name || !body.systemPrompt) {
            return reply.status(400).send({ error: 'name and systemPrompt are required' });
        }

        const result = await server.registerGenome({
            name: body.name,
            systemPrompt: body.systemPrompt,
            protect: body.protect,
            evolve: body.evolve as Parameters<typeof server.registerGenome>[0]['evolve'],
            adapt: body.adapt,
        });

        return reply.status(201).send(result);
    });

    // ─── List Genomes ───────────────────────────────────────

    app.get('/api/genomes', async (request, reply) => {
        const apiKey = request.headers['x-pga-admin-key'] as string | undefined;
        if (!server.verifyAdminKey(apiKey)) {
            return reply.status(401).send({ error: 'Invalid or missing admin API key' });
        }

        return server.listGenomes();
    });

    // ─── Get Genome Details ─────────────────────────────────

    app.get<{ Params: { id: string } }>('/api/genomes/:id', async (request, reply) => {
        const apiKey = request.headers['x-pga-admin-key'] as string | undefined;
        if (!server.verifyAdminKey(apiKey)) {
            return reply.status(401).send({ error: 'Invalid or missing admin API key' });
        }

        const entry = server.getGenomeEntry(request.params.id);
        if (!entry) {
            return reply.status(404).send({ error: 'Genome not found' });
        }

        const analytics = await entry.instance.getAnalytics();

        return {
            genomeId: request.params.id,
            name: entry.name,
            createdAt: entry.createdAt,
            analytics,
        };
    });

    // ─── Delete Genome ──────────────────────────────────────

    app.delete<{ Params: { id: string } }>('/api/genomes/:id', async (request, reply) => {
        const apiKey = request.headers['x-pga-admin-key'] as string | undefined;
        if (!server.verifyAdminKey(apiKey)) {
            return reply.status(401).send({ error: 'Invalid or missing admin API key' });
        }

        const removed = await server.removeGenome(request.params.id);
        if (!removed) {
            return reply.status(404).send({ error: 'Genome not found' });
        }

        return { deleted: true };
    });

    // ─── Drift Analysis ─────────────────────────────────────

    app.get<{ Params: { id: string } }>('/api/genomes/:id/drift', async (request, reply) => {
        const apiKey = request.headers['x-pga-admin-key'] as string | undefined;
        if (!server.verifyAdminKey(apiKey)) {
            return reply.status(401).send({ error: 'Invalid or missing admin API key' });
        }

        const entry = server.getGenomeEntry(request.params.id);
        if (!entry) {
            return reply.status(404).send({ error: 'Genome not found' });
        }

        return entry.instance.getDriftAnalysis();
    });

    // ─── Evolution Health ───────────────────────────────────

    app.get<{ Params: { id: string } }>('/api/genomes/:id/health', async (request, reply) => {
        const apiKey = request.headers['x-pga-admin-key'] as string | undefined;
        if (!server.verifyAdminKey(apiKey)) {
            return reply.status(401).send({ error: 'Invalid or missing admin API key' });
        }

        const entry = server.getGenomeEntry(request.params.id);
        if (!entry) {
            return reply.status(404).send({ error: 'Genome not found' });
        }

        return entry.instance.getEvolutionHealth();
    });
}
