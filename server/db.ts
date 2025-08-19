import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

console.log('[Database] Connecting to PostgreSQL...');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const db = drizzle(pool, { schema });

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[Database] Connection failed:', err);
  } else {
    console.log('[Database] Connected successfully at:', res.rows[0].now);
  }
});

export { pool, db };