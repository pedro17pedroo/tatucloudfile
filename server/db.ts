import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// For development without database, use in-memory storage
// In production, this would require a proper PostgreSQL connection
let db: any;
let pool: Pool | undefined;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  console.warn('No DATABASE_URL found. Using in-memory storage for development.');
  // Initialize a mock database for development
  db = null;
}

export { pool, db };