import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const p = await pool.query('SELECT count(*) FROM "Project"');
  const t = await pool.query('SELECT count(*) FROM "Task"');
  const w = await pool.query('SELECT count(*) FROM "WorkLog"');
  const statuses = await pool.query('SELECT status, count(*) FROM "Task" GROUP BY status');
  console.log('Projects count:', p.rows[0].count);
  console.log('Tasks count:', t.rows[0].count);
  console.log('WorkLogs count:', w.rows[0].count);
  console.log('Task Statuses:', statuses.rows);
  await pool.end();
}

run().catch(console.error);
