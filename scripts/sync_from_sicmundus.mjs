import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function syncAll() {
  console.log('--- Starting Sync from Sicmundus to Aksora ---');

  // 1. Load tasks.json and entries.json from D:\KERJAAN\sicmundus
  const sicmundusDir = 'D:/KERJAAN/sicmundus';
  const tasksRaw = JSON.parse(fs.readFileSync(path.join(sicmundusDir, 'tasks.json'), 'utf-8'));
  const entriesRaw = JSON.parse(fs.readFileSync(path.join(sicmundusDir, 'entries.json'), 'utf-8'));
  const projectsRaw = JSON.parse(fs.readFileSync(path.join(sicmundusDir, 'projects.json'), 'utf-8'));

  console.log(`Loaded ${tasksRaw.length} tasks and ${entriesRaw.length} entries from Sicmundus.`);

  const projectMap = new Map();
  for (const p of projectsRaw) {
    projectMap.set(p.id, p);
  }

  // 2. Upsert Projects in Aksora
  const uniqueProjects = new Set();
  for (const t of tasksRaw) {
    const pName = t.project_name || 'Sicmundus';
    if (pName) uniqueProjects.add(pName);
  }

  console.log(`Found ${uniqueProjects.size} unique projects:`, Array.from(uniqueProjects));

  for (const pName of uniqueProjects) {
    const existing = await pool.query('SELECT id FROM "Project" WHERE name = $1', [pName]);
    if (existing.rows.length === 0) {
      const key = pName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'PROJ';
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await pool.query(
        `INSERT INTO "Project" (company, name, key, description, status, "publicToken", "workspaceId")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Akusara Project', pName, key, `Synchronized from Sicmundus: ${pName}`, 'active', token, 15]
      );
      console.log(`[+] Created Project in Aksora: ${pName} (${key})`);
    }
  }

  // 3. Upsert Tasks in Aksora
  let taskCreated = 0;
  let taskUpdated = 0;

  for (const t of tasksRaw) {
    const pName = t.project_name || 'Sicmundus';
    const statusMap = {
      backlog: 'backlog',
      todo: 'todo',
      in_progress: 'in_progress',
      need_to_test: 'need_to_test',
      completed: 'completed',
      hold: 'hold',
    };
    const mappedStatus = statusMap[t.status] || 'in_progress';
    const mappedPriority = t.priority === 'urgent' ? 'P0' : t.priority === 'high' ? 'P1' : t.priority === 'low' ? 'P3' : 'P2';
    const startDate = (t.start_date || '').slice(0, 10) || null;
    const dueDate = (t.due_date || '').slice(0, 10) || null;
    const category = t.category || 'Feature';
    const duration = Number(t.total_minutes) || 0;

    // Check if task exists by sicmundusTaskId or title
    const existing = await pool.query(
      `SELECT id FROM "Task" WHERE "sicmundusTaskId" = $1 OR (title = $2 AND project = $3)`,
      [t.id, t.title, pName]
    );

    if (existing.rows.length === 0) {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await pool.query(
        `INSERT INTO "Task" (
          company, "workspaceId", "publicToken", title, project, "relatedFeature",
          category, status, priority, "startDate", "endDate", description,
          "durationMinutes", "sicmundusTaskId", assignee
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          'Akusara Project',
          15,
          token,
          t.title,
          pName,
          pName,
          category,
          mappedStatus,
          mappedPriority,
          startDate,
          dueDate,
          t.description || t.title,
          duration,
          t.id,
          'Alexander Wright',
        ]
      );
      taskCreated++;
    } else {
      await pool.query(
        `UPDATE "Task" SET
          status = $1, priority = $2, "durationMinutes" = $3, "sicmundusTaskId" = $4, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [mappedStatus, mappedPriority, duration, t.id, existing.rows[0].id]
      );
      taskUpdated++;
    }
  }

  console.log(`Tasks sync complete: ${taskCreated} created, ${taskUpdated} updated.`);

  // 4. Upsert WorkLogs in Aksora from Sicmundus Entries
  let logsCreated = 0;
  let logsUpdated = 0;

  for (const e of entriesRaw) {
    const startIso = e.start_time || '';
    const dateStr = startIso.slice(0, 10);
    if (!dateStr) continue;

    const startTimeStr = startIso.length >= 16 ? startIso.slice(11, 16) : '09:00';
    const endIso = e.end_time || '';
    const endTimeStr = endIso.length >= 16 ? endIso.slice(11, 16) : '17:00';
    const dur = Number(e.duration_minutes) || 240;

    // Resolve parent task
    const parentTask = tasksRaw.find((t) => t.id === e.task_id);
    const projectName = parentTask?.project_name || e.task_title || 'Sicmundus';
    const title = e.notes && e.notes.length > 5 ? e.notes : (e.task_title || 'Development & QA Task');

    // Check if WorkLog exists by sicmundusEntryId or by (date, durationMinutes, sicmundusTaskId)
    const existing = await pool.query(
      `SELECT id FROM "WorkLog" WHERE "sicmundusEntryId" = $1 OR ("sicmundusTaskId" = $2 AND date = $3 AND "durationMinutes" = $4)`,
      [e.id, e.task_id, dateStr, dur]
    );

    if (existing.rows.length === 0) {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await pool.query(
        `INSERT INTO "WorkLog" (
          company, "workspaceId", "publicToken", date, "startTime", "endTime",
          "durationMinutes", category, project, description, notes, assignee,
          "sicmundusTaskId", "sicmundusSubtaskId", "sicmundusEntryId"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          'Akusara Project',
          15,
          token,
          dateStr,
          startTimeStr,
          endTimeStr,
          dur,
          'testing',
          projectName,
          title,
          e.notes || '',
          'Alexander Wright',
          e.task_id,
          e.subtask_id || '',
          e.id,
        ]
      );
      logsCreated++;
    } else {
      await pool.query(
        `UPDATE "WorkLog" SET
          "durationMinutes" = $1, "sicmundusEntryId" = $2, "sicmundusSubtaskId" = $3, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [dur, e.id, e.subtask_id || '', existing.rows[0].id]
      );
      logsUpdated++;
    }
  }

  console.log(`WorkLogs sync complete: ${logsCreated} created, ${logsUpdated} updated.`);

  // Verify final count
  const tCount = await pool.query('SELECT count(*) FROM "Task"');
  const wlCount = await pool.query('SELECT count(*) FROM "WorkLog"');
  console.log(`\nFinal Aksora Database Counts:`);
  console.log(`- Tasks in DB: ${tCount.rows[0].count}`);
  console.log(`- WorkLogs in DB: ${wlCount.rows[0].count}`);

  await pool.end();
}

syncAll().catch(console.error);
