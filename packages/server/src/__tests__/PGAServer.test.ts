/**
 * PGAServer Tests — Secure Pull/Push Evolution Server
 *
 * Uses Fastify inject() for testing (no real HTTP server needed).
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGAServer } from '../PGAServer.js';
import { HMACVerifier } from '../auth/HMACVerifier.js';
import { InMemoryStorageAdapter } from '@pga-ai/core';

// ─── Test Setup ──────────────────────────────────────────────

const ADMIN_KEY = 'test-admin-key-12345';

let server: PGAServer;

beforeAll(async () => {
    server = new PGAServer({
        storage: new InMemoryStorageAdapter(),
        adminApiKey: ADMIN_KEY,
        port: 0, // Don't actually bind a port
    });

    // Initialize routes without listening
    await server.start(0);
});

afterAll(async () => {
    await server.stop();
});

// ─── Health ─────────────────────────────────────────────────

describe('Health endpoint', () => {
    it('should return health status without auth', async () => {
        const response = await server.getApp().inject({
            method: 'GET',
            url: '/api/health',
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.status).toBe('ok');
        expect(typeof body.genomes).toBe('number');
        expect(typeof body.uptime).toBe('number');
    });
});

// ─── Genome Registration ────────────────────────────────────

describe('Genome CRUD', () => {
    it('should register a genome with admin key', async () => {
        const response = await server.getApp().inject({
            method: 'POST',
            url: '/api/genomes',
            headers: { 'x-pga-admin-key': ADMIN_KEY, 'content-type': 'application/json' },
            payload: {
                name: 'test-agent',
                systemPrompt: 'You are a helpful code assistant.\n\nProvide clear explanations.',
                protect: ['Never share secrets'],
                evolve: ['Provide detailed code analysis'],
            },
        });

        expect(response.statusCode).toBe(201);
        const body = response.json();
        expect(body.genomeId).toBeTruthy();
        expect(body.genomeId).toMatch(/^wrap_/);
        expect(body.secret).toBeTruthy();
        expect(body.secret.length).toBe(64); // 32 bytes hex
    });

    it('should reject genome creation without admin key', async () => {
        const response = await server.getApp().inject({
            method: 'POST',
            url: '/api/genomes',
            headers: { 'content-type': 'application/json' },
            payload: {
                name: 'unauthorized-agent',
                systemPrompt: 'Test prompt.',
            },
        });

        expect(response.statusCode).toBe(401);
    });

    it('should reject genome creation with wrong admin key', async () => {
        const response = await server.getApp().inject({
            method: 'POST',
            url: '/api/genomes',
            headers: { 'x-pga-admin-key': 'wrong-key', 'content-type': 'application/json' },
            payload: {
                name: 'bad-key-agent',
                systemPrompt: 'Test prompt.',
            },
        });

        expect(response.statusCode).toBe(401);
    });

    it('should list registered genomes', async () => {
        const response = await server.getApp().inject({
            method: 'GET',
            url: '/api/genomes',
            headers: { 'x-pga-admin-key': ADMIN_KEY },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThanOrEqual(1);
        expect(body[0].name).toBe('test-agent');
    });

    it('should reject listing without admin key', async () => {
        const response = await server.getApp().inject({
            method: 'GET',
            url: '/api/genomes',
        });

        expect(response.statusCode).toBe(401);
    });
});

// ─── PULL — Get Prompt ──────────────────────────────────────

describe('PULL - Get evolved prompt', () => {
    let genomeId: string;
    let secret: string;

    beforeAll(async () => {
        const response = await server.getApp().inject({
            method: 'POST',
            url: '/api/genomes',
            headers: { 'x-pga-admin-key': ADMIN_KEY, 'content-type': 'application/json' },
            payload: {
                name: 'pull-test-agent',
                systemPrompt: 'You are a data analyst.\n\nAnalyze data carefully and provide insights.',
                protect: ['Never fabricate data'],
                evolve: ['Use statistical methods'],
                adapt: ['tone'],
            },
        });
        const body = response.json();
        genomeId = body.genomeId;
        secret = body.secret;
    });

    it('should return evolved prompt with valid secret', async () => {
        const response = await server.getApp().inject({
            method: 'GET',
            url: `/api/genomes/${genomeId}/prompt`,
            headers: { authorization: `Bearer ${secret}` },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.prompt).toBeTruthy();
        expect(typeof body.prompt).toBe('string');
        expect(body.genomeId).toBe(genomeId);
        // Prompt should contain the protect content
        expect(body.prompt).toContain('Never fabricate data');
    });

    it('should reject without auth', async () => {
        const response = await server.getApp().inject({
            method: 'GET',
            url: `/api/genomes/${genomeId}/prompt`,
        });

        expect(response.statusCode).toBe(401);
    });

    it('should reject with wrong secret', async () => {
        const response = await server.getApp().inject({
            method: 'GET',
            url: `/api/genomes/${genomeId}/prompt`,
            headers: { authorization: 'Bearer wrong-secret-value' },
        });

        expect(response.statusCode).toBe(401);
    });

    it('should accept userId and taskType query params', async () => {
        const response = await server.getApp().inject({
            method: 'GET',
            url: `/api/genomes/${genomeId}/prompt?userId=user-42&taskType=analysis`,
            headers: { authorization: `Bearer ${secret}` },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.prompt).toBeTruthy();
    });
});

// ─── PUSH — Report Metrics ──────────────────────────────────

describe('PUSH - Report metrics', () => {
    let genomeId: string;
    let secret: string;

    beforeAll(async () => {
        const response = await server.getApp().inject({
            method: 'POST',
            url: '/api/genomes',
            headers: { 'x-pga-admin-key': ADMIN_KEY, 'content-type': 'application/json' },
            payload: {
                name: 'push-test-agent',
                systemPrompt: 'You are a test agent.',
            },
        });
        const body = response.json();
        genomeId = body.genomeId;
        secret = body.secret;
    });

    it('should accept valid signed report', async () => {
        const reportBody = {
            userId: 'user-1',
            success: true,
            latencyMs: 500,
            inputTokens: 200,
            outputTokens: 150,
        };
        const rawBody = JSON.stringify(reportBody);
        const signature = HMACVerifier.sign(secret, rawBody);

        const response = await server.getApp().inject({
            method: 'POST',
            url: `/api/genomes/${genomeId}/report`,
            headers: {
                'content-type': 'application/json',
                'x-pga-signature': signature,
            },
            payload: reportBody,
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.recorded).toBe(true);
    });

    it('should reject report without signature', async () => {
        const response = await server.getApp().inject({
            method: 'POST',
            url: `/api/genomes/${genomeId}/report`,
            headers: { 'content-type': 'application/json' },
            payload: {
                success: true,
                latencyMs: 300,
                inputTokens: 100,
                outputTokens: 50,
            },
        });

        expect(response.statusCode).toBe(401);
        const body = response.json();
        expect(body.error).toContain('Signature');
    });

    it('should reject report with invalid signature', async () => {
        const reportBody = {
            success: true,
            latencyMs: 300,
            inputTokens: 100,
            outputTokens: 50,
        };

        const response = await server.getApp().inject({
            method: 'POST',
            url: `/api/genomes/${genomeId}/report`,
            headers: {
                'content-type': 'application/json',
                'x-pga-signature': 'a'.repeat(64), // Fake signature
            },
            payload: reportBody,
        });

        expect(response.statusCode).toBe(401);
        const body = response.json();
        expect(body.error).toContain('HMAC');
    });

    it('should accept report with feedback', async () => {
        const reportBody = {
            userId: 'user-2',
            success: true,
            latencyMs: 400,
            inputTokens: 250,
            outputTokens: 180,
            feedback: 'positive',
        };
        const rawBody = JSON.stringify(reportBody);
        const signature = HMACVerifier.sign(secret, rawBody);

        const response = await server.getApp().inject({
            method: 'POST',
            url: `/api/genomes/${genomeId}/report`,
            headers: {
                'content-type': 'application/json',
                'x-pga-signature': signature,
            },
            payload: reportBody,
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().recorded).toBe(true);
    });

    it('should accept failure reports', async () => {
        const reportBody = {
            success: false,
            latencyMs: 5000,
            inputTokens: 500,
            outputTokens: 0,
        };
        const rawBody = JSON.stringify(reportBody);
        const signature = HMACVerifier.sign(secret, rawBody);

        const response = await server.getApp().inject({
            method: 'POST',
            url: `/api/genomes/${genomeId}/report`,
            headers: {
                'content-type': 'application/json',
                'x-pga-signature': signature,
            },
            payload: reportBody,
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().recorded).toBe(true);
    });
});

// ─── HMAC Verifier ──────────────────────────────────────────

describe('HMACVerifier', () => {
    it('should generate unique secrets', () => {
        const secret1 = HMACVerifier.generateSecret();
        const secret2 = HMACVerifier.generateSecret();

        expect(secret1).not.toBe(secret2);
        expect(secret1.length).toBe(64); // 32 bytes = 64 hex chars
        expect(secret2.length).toBe(64);
    });

    it('should sign and verify correctly', () => {
        const secret = HMACVerifier.generateSecret();
        const payload = JSON.stringify({ success: true, latencyMs: 500 });

        const signature = HMACVerifier.sign(secret, payload);
        expect(HMACVerifier.verify(secret, payload, signature)).toBe(true);
    });

    it('should reject tampered payload', () => {
        const secret = HMACVerifier.generateSecret();
        const payload = JSON.stringify({ success: true, latencyMs: 500 });
        const tampered = JSON.stringify({ success: true, latencyMs: 100 }); // Changed value

        const signature = HMACVerifier.sign(secret, payload);
        expect(HMACVerifier.verify(secret, tampered, signature)).toBe(false);
    });

    it('should reject wrong secret', () => {
        const secret1 = HMACVerifier.generateSecret();
        const secret2 = HMACVerifier.generateSecret();
        const payload = JSON.stringify({ data: 'test' });

        const signature = HMACVerifier.sign(secret1, payload);
        expect(HMACVerifier.verify(secret2, payload, signature)).toBe(false);
    });
});

// ─── Genome Delete & Detail ─────────────────────────────────

describe('Genome details and deletion', () => {
    let genomeId: string;

    beforeAll(async () => {
        const response = await server.getApp().inject({
            method: 'POST',
            url: '/api/genomes',
            headers: { 'x-pga-admin-key': ADMIN_KEY, 'content-type': 'application/json' },
            payload: {
                name: 'detail-test-agent',
                systemPrompt: 'You are a test agent for details.',
            },
        });
        genomeId = response.json().genomeId;
    });

    it('should return genome details with analytics', async () => {
        const response = await server.getApp().inject({
            method: 'GET',
            url: `/api/genomes/${genomeId}`,
            headers: { 'x-pga-admin-key': ADMIN_KEY },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.genomeId).toBe(genomeId);
        expect(body.name).toBe('detail-test-agent');
        expect(body.analytics).toBeDefined();
    });

    it('should return 404 for non-existent genome', async () => {
        const response = await server.getApp().inject({
            method: 'GET',
            url: '/api/genomes/nonexistent-id',
            headers: { 'x-pga-admin-key': ADMIN_KEY },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should delete a genome', async () => {
        const response = await server.getApp().inject({
            method: 'DELETE',
            url: `/api/genomes/${genomeId}`,
            headers: { 'x-pga-admin-key': ADMIN_KEY },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().deleted).toBe(true);

        // Verify it's gone
        const getResponse = await server.getApp().inject({
            method: 'GET',
            url: `/api/genomes/${genomeId}`,
            headers: { 'x-pga-admin-key': ADMIN_KEY },
        });
        expect(getResponse.statusCode).toBe(404);
    });
});
