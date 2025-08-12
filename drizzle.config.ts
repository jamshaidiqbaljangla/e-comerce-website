import type { Config } from 'drizzle-kit';

export default {
  schema: './database/schema.ts',
  out: './database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
} satisfies Config;
