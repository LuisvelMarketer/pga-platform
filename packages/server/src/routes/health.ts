/**
 * Health Route — Public health check endpoint
 *
 * No authentication required.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { FastifyInstance } from 'fastify';
import type { PGAServer } from '../PGAServer.js';

export function registerHealthRoutes(app: FastifyInstance, server: PGAServer): void {
    app.get('/api/health', async () => {
        return {
            status: 'ok',
            genomes: server.getGenomeCount(),
            uptime: server.getUptime(),
        };
    });
}
