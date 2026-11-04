import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const p = await pool.query('SELECT * FROM "Project"');
  console.log('Projects:', p.rows);
  await pool.end();
}

run().catch(console.error);
