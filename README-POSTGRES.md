PostgreSQL-only setup

- Local run (uses the same DB as production):
  - Ensure DATABASE_URL (or NETLIFY_DATABASE_URL) is set in .env.
  - npm start (runs server-postgresql.ts on :3002).

- Production (Netlify):
  - /api/* is routed to functions/server.js which wraps server-postgresql.js.
  - Set NETLIFY_DATABASE_URL and JWT_SECRET in site env.

- Avoid server-sqlite.js and server.js. They are legacy and no longer used in scripts.
