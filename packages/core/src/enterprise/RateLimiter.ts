/**
 * Rate Limiter for PGA
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Implements token bucket and sliding window rate limiting algorithms.
 */

export interface RateLimitConfig {
    /**
     * Maximum requests per window
     */
    maxRequests: number;

    /**
     * Time window in milliseconds
     */
    windowMs: number;

    /**
     * Algorithm to use
     * @default 'sliding-window'
     */
    algorithm?: 'token-bucket' | 'sliding-window' | 'fixed-window';

    /**
     * Custom identifier function
     */
    keyGenerator?: (context: RateLimitContext) => string;

    /**
     * Action when rate limit exceeded
     * @default 'reject'
     */
    onLimitExceeded?: 'reject' | 'queue' | 'callback';

    /**
     * Callback when limit exceeded (if onLimitExceeded = 'callback')
     */
    onLimitExceededCallback?: (context: RateLimitContext) => Promise<void>;
}

export interface RateLimitContext {
    userId?: string;
    genomeId?: string;
    operation?: string;
    ip?: string;
    metadata?: Record<string, unknown>;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    retryAfter?: number; // milliseconds
}

interface RequestRecord {
    timestamp: number;
    count: number;
}

/**
 * Rate Limiter
 *
 * Prevents abuse and ensures fair resource allocation.
 */
export class RateLimiter {
    private config: Required<Omit<RateLimitConfig, 'onLimitExceededCallback'>> & {
        onLimitExceededCallback?: (context: RateLimitContext) => Promise<void>;
    };
    private records: Map<string, RequestRecord[]> = new Map();
    private tokenBuckets: Map<string, { tokens: number; lastRefill: number }> = new Map();

    constructor(config: RateLimitConfig) {
        this.config = {
            maxRequests: config.maxRequests,
            windowMs: config.windowMs,
            algorithm: config.algorithm || 'sliding-window',
            keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
            onLimitExceeded: config.onLimitExceeded || 'reject',
            onLimitExceededCallback: config.onLimitExceededCallback,
        };

        // Cleanup old records periodically
        setInterval(() => this.cleanup(), this.config.windowMs);
    }

    /**
     * Check if request is allowed
     */
    async check(context: RateLimitContext): Promise<RateLimitResult> {
        const key = this.config.keyGenerator(context);

        if (this.config.algorithm === 'token-bucket') {
            return this.checkTokenBucket(key);
        } else if (this.config.algorithm === 'sliding-window') {
            return this.checkSlidingWindow(key);
        } else {
            return this.checkFixedWindow(key);
        }
    }

    /**
     * Token Bucket Algorithm
     *
     * Tokens are added at a constant rate. Each request consumes one token.
     * Allows bursts while maintaining average rate.
     */
    private checkTokenBucket(key: string): RateLimitResult {
        const now = Date.now();
        let bucket = this.tokenBuckets.get(key);

        if (!bucket) {
            bucket = {
                tokens: this.config.maxRequests,
                lastRefill: now,
            };
            this.tokenBuckets.set(key, bucket);
        }

        // Refill tokens based on time elapsed
        const elapsed = now - bucket.lastRefill;
        const refillRate = this.config.maxRequests / this.config.windowMs;
        const tokensToAdd = Math.floor(elapsed * refillRate);

        bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;

        // Check if request is allowed
        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;

            return {
                allowed: true,
                remaining: Math.floor(bucket.tokens),
                resetAt: new Date(now + this.config.windowMs),
            };
        }

        // Calculate retry after
        const timeToNextToken = (1 - bucket.tokens) / refillRate;

        return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(now + this.config.windowMs),
            retryAfter: Math.ceil(timeToNextToken),
        };
    }

    /**
     * Sliding Window Algorithm
     *
     * Considers requests in a rolling time window.
     * More accurate than fixed window but slightly more expensive.
     */
    private checkSlidingWindow(key: string): RateLimitResult {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        let records = this.records.get(key) || [];

        // Remove old records
        records = records.filter((r) => r.timestamp > windowStart);

        // Count requests in window
        const count = records.reduce((sum, r) => sum + r.count, 0);

        if (count < this.config.maxRequests) {
            // Add new request
            records.push({ timestamp: now, count: 1 });
            this.records.set(key, records);

            return {
                allowed: true,
                remaining: this.config.maxRequests - count - 1,
                resetAt: new Date(now + this.config.windowMs),
            };
        }

        // Find when oldest request will expire
        const oldestRequest = records[0];
        const retryAfter = oldestRequest
            ? oldestRequest.timestamp + this.config.windowMs - now
            : this.config.windowMs;

        return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(oldestRequest.timestamp + this.config.windowMs),
            retryAfter: Math.max(0, retryAfter),
        };
    }

    /**
     * Fixed Window Algorithm
     *
     * Counts requests in fixed time windows.
     * Simple but can allow 2x limit at window boundaries.
     */
    private checkFixedWindow(key: string): RateLimitResult {
        const now = Date.now();
        const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;

        let records = this.records.get(key) || [];

        // Remove records from previous windows
        records = records.filter((r) => r.timestamp >= windowStart);

        // Count requests in current window
        const count = records.reduce((sum, r) => sum + r.count, 0);

        if (count < this.config.maxRequests) {
            // Add new request
            const existingRecord = records.find((r) => r.timestamp === windowStart);

            if (existingRecord) {
                existingRecord.count += 1;
            } else {
                records.push({ timestamp: windowStart, count: 1 });
            }

            this.records.set(key, records);

            return {
                allowed: true,
                remaining: this.config.maxRequests - count - 1,
                resetAt: new Date(windowStart + this.config.windowMs),
            };
        }

        return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(windowStart + this.config.windowMs),
            retryAfter: windowStart + this.config.windowMs - now,
        };
    }

    /**
     * Default key generator
     */
    private defaultKeyGenerator(context: RateLimitContext): string {
        const parts: string[] = [];

        if (context.userId) parts.push(`user:${context.userId}`);
        if (context.genomeId) parts.push(`genome:${context.genomeId}`);
        if (context.operation) parts.push(`op:${context.operation}`);
        if (context.ip) parts.push(`ip:${context.ip}`);

        return parts.length > 0 ? parts.join(':') : 'global';
    }

    /**
     * Reset limits for a key
     */
    reset(key: string): void {
        this.records.delete(key);
        this.tokenBuckets.delete(key);
    }

    /**
     * Reset all limits
     */
    resetAll(): void {
        this.records.clear();
        this.tokenBuckets.clear();
    }

    /**
     * Get current usage for a key
     */
    getUsage(key: string): { count: number; remaining: number } {
        if (this.config.algorithm === 'token-bucket') {
            const bucket = this.tokenBuckets.get(key);

            if (!bucket) {
                return { count: 0, remaining: this.config.maxRequests };
            }

            // Refill tokens
            const now = Date.now();
            const elapsed = now - bucket.lastRefill;
            const refillRate = this.config.maxRequests / this.config.windowMs;
            const tokensToAdd = Math.floor(elapsed * refillRate);
            const currentTokens = Math.min(
                this.config.maxRequests,
                bucket.tokens + tokensToAdd
            );

            return {
                count: this.config.maxRequests - Math.floor(currentTokens),
                remaining: Math.floor(currentTokens),
            };
        }

        const now = Date.now();
        const windowStart =
            this.config.algorithm === 'fixed-window'
                ? Math.floor(now / this.config.windowMs) * this.config.windowMs
                : now - this.config.windowMs;

        const records = this.records.get(key) || [];
        const count = records
            .filter((r) => r.timestamp > windowStart)
            .reduce((sum, r) => sum + r.count, 0);

        return {
            count,
            remaining: Math.max(0, this.config.maxRequests - count),
        };
    }

    /**
     * Cleanup old records
     */
    private cleanup(): void {
        const now = Date.now();
        const cutoff = now - this.config.windowMs * 2; // Keep 2x window for safety

        for (const [key, records] of this.records.entries()) {
            const filtered = records.filter((r) => r.timestamp > cutoff);

            if (filtered.length === 0) {
                this.records.delete(key);
            } else {
                this.records.set(key, filtered);
            }
        }

        // Cleanup token buckets that haven't been used
        for (const [key, bucket] of this.tokenBuckets.entries()) {
            if (bucket.lastRefill < cutoff) {
                this.tokenBuckets.delete(key);
            }
        }
    }

    /**
     * Get statistics
     */
    getStats(): {
        totalKeys: number;
        algorithm: string;
        config: {
            maxRequests: number;
            windowMs: number;
        };
    } {
        return {
            totalKeys:
                this.config.algorithm === 'token-bucket'
                    ? this.tokenBuckets.size
                    : this.records.size,
            algorithm: this.config.algorithm,
            config: {
                maxRequests: this.config.maxRequests,
                windowMs: this.config.windowMs,
            },
        };
    }
}
