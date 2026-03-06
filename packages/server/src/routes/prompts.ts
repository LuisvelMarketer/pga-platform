/**
 * Prompt Routes — PULL endpoint for evolved prompts
 *
 * External agents call this to get the latest evolved prompt.
 * Authenticated with genome-specific secret (not admin key).
 *
 * Security: PGA returns only its own evolved prompt content.
 * No user data, no LLM API keys, no message content flows through here.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { FastifyInstance } from 'fastify';
import type { PGAServer } from '../PGAServer.js';

export function registerPromptRoutes(app: FastifyInstance, server: PGAServer): void {

    app.get<{
        Params: { id: string };
        Querystring: { userId?: string; taskType?: string };
    }>('/api/genomes/:id/prompt', async (request, reply) => {
        const { id } = request.params;

        // Auth: genome secret via Bearer token
        const auth = request.headers.authorization;
        if (!server.verifyGenomeSecret(id, auth)) {
            return reply.status(401).send({ error: 'Invalid or missing genome secret' });
        }

        const entry = server.getGenomeEntry(id);
        if (!entry) {
            return reply.status(404).send({ error: 'Genome not found' });
        }

        const { userId, taskType } = request.query as { userId?: string; taskType?: string };

        // Assemble the evolved prompt (C0 + C1 + C2 + intelligence)
        const prompt = await entry.instance.assemblePrompt(
            { userId, taskType },
            '', // No current message in PULL model
        );

        // Set cache headers (prompt is cacheable for short periods)
        reply.header('Cache-Control', 'private, max-age=60');

        return {
            prompt,
            genomeId: id,
        };
    });
}
