import dotenv from 'dotenv';
import pg from 'pg';
import { readFileSync } from 'node:fs';
dotenv.config({ path: '.env.local' });
dotenv.config();
// PostgreSQL DATE has no timezone; keep YYYY-MM-DD instead of converting midnight
// in the machine's timezone to a different UTC calendar day.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
export function database() {
  return new pg.Client({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.SUPERBASE_DATABASE_PASSWORD,
    database: 'postgres',
    port: 5432,
    ssl: { rejectUnauthorized: true, ca: readFileSync('supabase/prod-ca-2021.crt', 'utf8') },
    connectionTimeoutMillis: 15000,
  });
}
