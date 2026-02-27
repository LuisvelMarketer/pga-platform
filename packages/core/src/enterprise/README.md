# PGA Enterprise Features

Enterprise-grade security, access control, and resource management for PGA.

## Features

- **Rate Limiting** - Token bucket, sliding window, and fixed window algorithms
- **Authentication & Authorization** - RBAC (Role-Based Access Control)
- **Multi-Tenancy Support** - Tenant isolation and management
- **Policy-Based Access Control** - Fine-grained permission policies

## Rate Limiting

Prevent abuse and ensure fair resource allocation with multiple algorithms.

### Quick Start

```typescript
import { RateLimiter } from '@pga/core';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  algorithm: 'sliding-window',
});

// Check if request is allowed
const result = await limiter.check({
  userId: 'user-123',
  operation: 'chat',
});

if (!result.allowed) {
  console.log(`Rate limit exceeded. Retry after ${result.retryAfter}ms`);
}
```

### Algorithms

#### Token Bucket
Best for: APIs with burst traffic

```typescript
const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  algorithm: 'token-bucket',
});
```

**How it works:**
- Tokens refill at a constant rate
- Each request consumes one token
- Allows bursts while maintaining average rate
- Smooth rate limiting

#### Sliding Window
Best for: Accurate rate limiting

```typescript
const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  algorithm: 'sliding-window',
});
```

**How it works:**
- Considers requests in a rolling time window
- More accurate than fixed window
- Prevents double-spending at boundaries
- Slightly higher memory usage

#### Fixed Window
Best for: Simple, fast rate limiting

```typescript
const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  algorithm: 'fixed-window',
});
```

**How it works:**
- Counts requests in fixed time windows
- Simple and fast
- Can allow 2x limit at window boundaries
- Lowest memory usage

### Custom Key Generation

```typescript
const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  keyGenerator: (context) => {
    // Custom key based on multiple factors
    return `${context.userId}:${context.operation}:${context.ip}`;
  },
});
```

### Per-User, Per-Operation Limits

```typescript
// Different limits for different operations
const chatLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
});

const genomeLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000,
});

// Check before operation
const chatResult = await chatLimiter.check({
  userId: 'user-123',
  operation: 'chat',
});

const genomeResult = await genomeLimiter.check({
  userId: 'user-123',
  operation: 'genome:evolve',
});
```

### Usage Tracking

```typescript
const usage = limiter.getUsage('user:user-123');

console.log(`Requests: ${usage.count}/${maxRequests}`);
console.log(`Remaining: ${usage.remaining}`);
```

## Authentication & Authorization

Comprehensive RBAC system with policy-based access control.

### Quick Start

```typescript
import { AuthManager } from '@pga/core';

const auth = new AuthManager({
  defaultRole: 'user',
  enableMultiTenancy: true,
});

// Create user
const user = auth.createUser({
  id: 'user-123',
  email: 'john@example.com',
  roles: ['developer'],
  tenantId: 'company-abc',
});

// Check permission
const canWrite = await auth.hasPermission('user-123', 'genome:write');

if (canWrite) {
  // Allow operation
} else {
  // Deny operation
}
```

### Roles & Permissions

#### Built-in Roles

| Role | Permissions |
|------|-------------|
| **admin** | All permissions (`admin:all`) |
| **developer** | Read/write genomes, chat, evolve, view metrics |
| **viewer** | Read-only access to genomes, chat history, metrics |
| **user** | Send/read chat messages, view genomes |

#### Built-in Permissions

- `genome:read` - View genome details
- `genome:write` - Create/update genomes
- `genome:delete` - Delete genomes
- `genome:evolve` - Trigger evolution
- `chat:send` - Send chat messages
- `chat:read` - Read chat history
- `metrics:read` - View metrics
- `metrics:export` - Export metrics
- `admin:all` - All permissions

### Custom Roles

```typescript
auth.defineRole('data-scientist', [
  'genome:read',
  'chat:read',
  'metrics:read',
  'metrics:export',
]);

// Assign custom role
auth.addRole('user-123', 'data-scientist');
```

### Direct Permissions

```typescript
// Grant specific permission to user
auth.addPermission('user-123', 'genome:evolve');

// Remove permission
auth.removePermission('user-123', 'genome:evolve');
```

### Policy-Based Access Control

Fine-grained access control with conditions.

```typescript
auth.addPolicy({
  name: 'allow-own-genomes',
  effect: 'allow',
  actions: ['genome:write', 'genome:delete'],
  resources: ['genome:*'],
  conditions: [
    async (context) => {
      // Only allow if user owns the genome
      const genome = await getGenome(context.metadata?.genomeId);
      return genome.ownerId === context.userId;
    },
  ],
});

auth.addPolicy({
  name: 'deny-weekend-evolution',
  effect: 'deny',
  actions: ['genome:evolve'],
  conditions: [
    (context) => {
      // Deny evolution on weekends
      const day = new Date().getDay();
      return day === 0 || day === 6;
    },
  ],
});
```

### Resource-Based Authorization

```typescript
// Check permission on specific resource
await auth.authorize('user-123', 'genome:write', 'genome:abc-123');
```

### Multi-Tenancy

```typescript
const auth = new AuthManager({
  enableMultiTenancy: true,
  requireTenantId: true,
});

// Create users in different tenants
const user1 = auth.createUser({
  id: 'user-1',
  tenantId: 'company-a',
  roles: ['developer'],
});

const user2 = auth.createUser({
  id: 'user-2',
  tenantId: 'company-b',
  roles: ['developer'],
});

// List users by tenant
const companyAUsers = auth.getUsersByTenant('company-a');
```

## Integration Examples

### Express.js Middleware

```typescript
import { RateLimiter, AuthManager } from '@pga/core';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
});

const auth = new AuthManager();

// Rate limiting middleware
app.use(async (req, res, next) => {
  const result = await limiter.check({
    userId: req.user?.id,
    ip: req.ip,
    operation: req.path,
  });

  if (!result.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: result.retryAfter,
    });
  }

  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

  next();
});

// Authorization middleware
app.use(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await auth.authorize(req.user.id, req.requiredPermission);
    next();
  } catch (error) {
    return res.status(403).json({ error: error.message });
  }
});

// Protected route
app.post('/genome/:id/evolve', async (req, res) => {
  req.requiredPermission = 'genome:evolve';

  await auth.authorize(req.user.id, 'genome:evolve', `genome:${req.params.id}`);

  // Proceed with evolution
});
```

### PGA Integration

```typescript
import { PGA, RateLimiter, AuthManager } from '@pga/core';

const pga = new PGA({
  llmAdapter: new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  }),
});

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
});

const auth = new AuthManager();

// Wrap chat with rate limiting and auth
async function secureChat(userId: string, genomeId: string, message: string) {
  // Check rate limit
  const rateLimitResult = await limiter.check({
    userId,
    operation: 'chat',
  });

  if (!rateLimitResult.allowed) {
    throw new Error(`Rate limit exceeded. Retry after ${rateLimitResult.retryAfter}ms`);
  }

  // Check authorization
  await auth.authorize(userId, 'chat:send', `genome:${genomeId}`);

  // Proceed with chat
  const genome = await pga.getGenome(genomeId);
  const response = await genome.chat(message, { userId });

  return response;
}
```

## Best Practices

### 1. Layer Rate Limits

```typescript
// Global rate limit
const globalLimiter = new RateLimiter({
  maxRequests: 1000,
  windowMs: 60000,
});

// Per-user rate limit
const userLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
});

// Per-operation rate limit
const expensiveOpLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000,
});

// Check all limits
await globalLimiter.check({ ip: req.ip });
await userLimiter.check({ userId: req.user.id });
await expensiveOpLimiter.check({ userId: req.user.id, operation: 'evolve' });
```

### 2. Least Privilege Principle

```typescript
// Start with minimal permissions
const user = auth.createUser({
  id: 'user-123',
  roles: ['user'], // Minimal role
});

// Grant additional permissions as needed
auth.addPermission('user-123', 'genome:write');
```

### 3. Audit Permission Checks

```typescript
class AuditedAuthManager extends AuthManager {
  async hasPermission(userId: string, permission: Permission, resource?: string) {
    const allowed = await super.hasPermission(userId, permission, resource);

    // Log permission check
    console.log({
      userId,
      permission,
      resource,
      allowed,
      timestamp: new Date(),
    });

    return allowed;
  }
}
```

### 4. Graceful Degradation

```typescript
try {
  await auth.authorize(userId, 'metrics:export');
  return fullMetrics;
} catch {
  // Fall back to basic metrics if not authorized
  return basicMetrics;
}
```

## Performance Considerations

### Rate Limiter

- **Token Bucket**: O(1) time, minimal memory
- **Sliding Window**: O(n) where n = requests in window
- **Fixed Window**: O(1) time, minimal memory

Cleanup runs periodically to prevent memory leaks.

### Auth Manager

- Permission checks: O(n) where n = user's roles
- Policy evaluation: O(m) where m = matching policies
- User lookups: O(1) with Map storage

## Security Best Practices

1. **Never store credentials in AuthManager** - Use external identity providers
2. **Validate tenant isolation** - Always check tenantId in multi-tenant setups
3. **Use HTTPS** - Encrypt all traffic in production
4. **Rotate keys** - Regularly update API keys and secrets
5. **Monitor access patterns** - Detect anomalies with metrics
6. **Implement retry budgets** - Prevent retry storms
7. **Use secure session management** - External to PGA

## License

MIT

## Author

**Luis Alfredo Velasquez Duran** (Germany, 2025)
