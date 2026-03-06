/**
 * HMACVerifier — Cryptographic integrity for metric reports
 *
 * Ensures that metrics pushed by external agents cannot be forged.
 * Each genome gets a unique HMAC secret. Reports must be signed
 * with this secret to be accepted.
 *
 * Uses Node.js crypto (no external dependencies).
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export class HMACVerifier {
    /**
     * Generate a cryptographically secure secret (32 bytes, hex).
     */
    static generateSecret(): string {
        return randomBytes(32).toString('hex');
    }

    /**
     * Sign a payload with HMAC-SHA256.
     *
     * @param secret - The genome's HMAC secret
     * @param payload - JSON string of the request body
     * @returns Hex-encoded HMAC signature
     */
    static sign(secret: string, payload: string): string {
        return createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }

    /**
     * Verify an HMAC signature using timing-safe comparison.
     *
     * Prevents timing attacks by ensuring constant-time comparison
     * regardless of how many characters match.
     *
     * @param secret - The genome's HMAC secret
     * @param payload - JSON string of the request body
     * @param signature - The signature to verify
     * @returns true if the signature is valid
     */
    static verify(secret: string, payload: string, signature: string): boolean {
        const expected = HMACVerifier.sign(secret, payload);

        // Both must be same length for timingSafeEqual
        if (expected.length !== signature.length) {
            return false;
        }

        return timingSafeEqual(
            Buffer.from(expected, 'hex'),
            Buffer.from(signature, 'hex'),
        );
    }
}
