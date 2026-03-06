/**
 * Report Routes — PUSH endpoint for external metrics
 *
 * External agents call this to report interaction metrics.
 * HMAC-signed to prevent metric forging.
 *
 * Security: Only numeric metrics flow in. No message content,
 * no API keys, no LLM responses. HMAC signature verification
 * ensures only the legitimate agent can report metrics.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { FastifyInstance } from 'fastify';
import type { PGAServer } from '../PGAServer.js';
import { HMACVerifier } from '../auth/HMACVerifier.js';

export function registerReportRoutes(app: FastifyInstance, server: PGAServer): void {

    app.post<{ Params: { id: string } }>('/api/genomes/:id/report', async (request, reply) => {
        const { id } = request.params;

        const entry = server.getGenomeEntry(id);
        if (!entry) {
            return reply.status(404).send({ error: 'Genome not found' });
        }

        // Verify HMAC signature
        const signature = request.headers['x-pga-signature'] as string | undefined;
        if (!signature) {
            return reply.status(401).send({ error: 'Missing X-PGA-Signature header' });
        }

        const rawBody = JSON.stringify(request.body);
        if (!HMACVerifier.verify(entry.secret, rawBody, signature)) {
            return reply.status(401).send({ error: 'Invalid HMAC signature' });
        }

        const body = request.body as {
            userId?: string;
            success: boolean;
            latencyMs: number;
            inputTokens: number;
            outputTokens: number;
            taskType?: string;
            quality?: number;
            feedback?: 'positive' | 'negative' | 'neutral';
        };

        // Validate required fields
        if (typeof body.success !== 'boolean' || typeof body.latencyMs !== 'number') {
            return reply.status(400).send({ error: 'success (boolean) and latencyMs (number) are required' });
        }

        // Feed metrics into PGA evolution pipeline
        try {
            await entry.instance.reportExternalMetrics({
                userId: body.userId,
                success: body.success,
                latencyMs: body.latencyMs,
                inputTokens: body.inputTokens ?? 0,
                outputTokens: body.outputTokens ?? 0,
                taskType: body.taskType,
                quality: body.quality,
                feedback: body.feedback,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return reply.status(500).send({ error: 'Failed to process metrics', detail: message });
        }

        return { recorded: true };
    });
}
