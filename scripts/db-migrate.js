/**
 * Applies db/migrations/*.sql (in filename order) to the `orbland` schema, once each.
 * Usage: npm run db:migrate   (reads DATABASE_URL_UNPOOLED or DATABASE_URL from env / .env)
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS orbland;
      CREATE TABLE IF NOT EXISTS orbland._migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    const { rows } = await client.query('SELECT name FROM orbland._migrations');
    const applied = new Set(rows.map((r) => r.name));

    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO orbland._migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`${file}: ${err.message}`);
      }
      console.log(`applied ${file}`);
      count += 1;
    }
    console.log(count ? `${count} migration(s) applied.` : 'Database is up to date.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
