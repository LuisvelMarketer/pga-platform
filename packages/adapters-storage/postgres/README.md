# @pga-ai/adapters-storage-postgres

> PostgreSQL storage adapter for PGA (Genomic Self-Evolving Prompts)

## Installation

```bash
npm install @pga-ai/core @pga-ai/adapters-storage-postgres
```

## Usage

```typescript
import { PGA } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';
import { PostgresAdapter } from '@pga-ai/adapters-storage-postgres';

const pga = new PGA({
  llm: new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
  storage: new PostgresAdapter({
    connectionString: process.env.DATABASE_URL,
    autoInitialize: true, // Creates tables automatically
  }),
});

await pga.initialize();

const genome = await pga.createGenome({ name: 'my-assistant' });
const response = await genome.chat('Hello!', { userId: 'user123' });

console.log(response);
```

## Configuration

### `PostgresAdapter(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `connectionString` | `string` | required | PostgreSQL connection string |
| `maxConnections` | `number` | `20` | Maximum pool size |
| `autoInitialize` | `boolean` | `true` | Auto-create database schema |

### Connection String Format

```
postgresql://user:password@host:port/database
```

**Example:**
```
postgresql://postgres:secret@localhost:5432/pga
```

## Database Schema

The adapter automatically creates the following tables:

- `pga_genomes` - Genome metadata
- `pga_alleles` - Gene alleles (Layer 0, 1, 2)
- `pga_user_dna` - User cognitive profiles
- `pga_interactions` - Interaction logs
- `pga_mutations` - Mutation history
- `pga_feedback` - User feedback signals
- `pga_analytics` - Pre-aggregated stats

See [`sql/schema.sql`](./sql/schema.sql) for full schema.

## Manual Schema Setup

If you prefer to manage migrations yourself:

```typescript
const adapter = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  autoInitialize: false, // Don't auto-create tables
});

// Run your own migrations
await runMigrations();

// Then initialize PGA (will skip schema creation)
await pga.initialize();
```

## Performance

### Connection Pooling

The adapter uses `pg` connection pooling by default:

```typescript
const adapter = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  maxConnections: 50, // Increase for high load
});
```

### Indexes

All critical queries are indexed:
- Genome lookups: `pga_genomes(id)`
- Allele selection: `pga_alleles(genome_id, layer, gene, status)`
- User DNA: `pga_user_dna(user_id, genome_id)`
- Analytics queries: All have composite indexes

## Production Checklist

✅ Use connection pooling (`maxConnections: 20+`)
✅ Enable SSL for remote databases
✅ Set up database backups
✅ Monitor connection pool usage
✅ Use read replicas for analytics queries
✅ Consider partitioning `pga_interactions` table for high volume

## Troubleshooting

### "relation does not exist" error

```typescript
// Ensure autoInitialize is true
const adapter = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  autoInitialize: true, // ← This creates tables
});

await pga.initialize();
```

### Connection timeout

```typescript
// Increase max connections
const adapter = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  maxConnections: 50, // Default is 20
});
```

### SSL connection required

```
postgresql://user:pass@host:5432/db?sslmode=require
```

## License

MIT © Luis Alfredo Velasquez Duran
