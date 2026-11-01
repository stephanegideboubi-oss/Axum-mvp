import fs from "fs";
import path from "path";
import { pool } from "../config/db";

// Arbitrary constant: serializes migrations if several instances boot at once.
const MIGRATION_LOCK_KEY = 727002;

// Works from both src/db (dev, tsx) and dist/db (production build).
const MIGRATIONS_DIR = path.resolve(__dirname, "../../src/db/migrations");

/**
 * Applies any not-yet-applied SQL file in src/db/migrations, in name order.
 * Files must be idempotent (IF NOT EXISTS etc.): the initial schema in
 * src/db/init predates this runner, so existing databases never recorded it.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`
    );

    const files = fs.existsSync(MIGRATIONS_DIR)
      ? fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()
      : [];

    for (const file of files) {
      const done = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
      if (done.rows.length > 0) continue;

      await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      console.log(`Applied migration ${file}`);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]).catch(() => undefined);
    client.release();
  }
}
