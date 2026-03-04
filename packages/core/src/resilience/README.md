# PGA Resilience

Production-hardening features: Circuit Breakers, Retry Logic, and Error Recovery.

## Circuit Breaker

```typescript
import { CircuitBreaker } from '@pga-ai/core';

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
});

const result = await breaker.execute(async () => {
  return await riskyOperation();
});
```

## Retry Logic

```typescript
import { RetryManager } from '@pga-ai/core';

const retry = new RetryManager({
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
});

const result = await retry.execute(async () => {
  return await unreliableOperation();
});
```

## Author

**Luis Alfredo Velasquez Duran** (Germany, 2025)
