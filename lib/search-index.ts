import { db } from "@/lib/db";

const indexedModules = new Set([
  "tasks",
  "bugs",
  "test-plans",
  "test-cases",
  "test-suites",
  "test-sessions",
  "meeting-notes",
  "sprints",
  "deployments",
  "assignees",
  "users",
  "activity",
]);

function collectSearchTokens(values: unknown[]) {
  const tokens = new Set<string>();
  for (const value of values) {
    const text = String(value ?? "").toLowerCase();
    for (const token of text.split(/[^a-z0-9]+/g)) {
      if (token.length >= 2) tokens.add(token);
    }
  }
  return [...tokens];
}

function buildBulkInsertSql(
  company: string,
  entityType: string,
  entityId: string,
  tokens: string[],
) {
  const placeholders = tokens.map(() => "(?, ?, ?, ?, ?)").join(", ");
  return {
    sql: `INSERT INTO "SearchToken" ("company", "entityType", "entityId", "entityIdInt", "token") VALUES ${placeholders}`,
    params: tokens.flatMap((token) => [company, entityType, entityId, Number(entityId) || 0, token]),
  };
}

function buildSearchText(module: string, data: Record<string, unknown>) {
  switch (module) {
    case "tasks":
      return [data.title, data.project, data.relatedFeature, data.category, data.status, data.priority, data.description, data.notes, data.assignee, data.relatedItems];
    case "bugs":
      return [data.project, data.module, data.bugType, data.title, data.preconditions, data.stepsToReproduce, data.expectedResult, data.actualResult, data.severity, data.priority, data.status, data.relatedItems, data.suggestedDev, data.evidence];
    case "test-plans":
      return [data.title, data.project, data.sprint, data.scope, data.status, data.notes, data.assignee];
    case "test-cases":
      return [data.tcId, data.typeCase, data.preCondition, data.caseName, data.assignee, data.testStep, data.expectedResult, data.actualResult, data.status, data.priority, data.evidence, data.relatedItems];
    case "test-suites":
      return [data.title, data.assignee, data.status, data.notes, data.publicToken];
    case "test-sessions":
      return [data.date, data.project, data.sprint, data.tester, data.scope, data.result, data.notes, data.evidence];
    case "meeting-notes":
      return [data.date, data.project, data.title, data.attendees, data.content, data.actionItems, data.relatedItems, data.summary];
    case "sprints":
      return [data.name, data.startDate, data.endDate, data.status, data.goal];
    case "deployments":
      return [data.date, data.version, data.project, data.environment, data.developer, data.changelog, data.status, data.notes];
    case "assignees":
      return [data.name, data.role, data.email, data.skills, data.status];
    case "users":
      return [data.name, data.email, data.role];
    case "activity":
      return [data.entityType, data.entityId, data.action, data.summary];
    default:
      return [];
  }
}

export function shouldIndexModule(module: string) {
  return indexedModules.has(module);
}

export async function syncSearchTokens(module: string, company: string, entityId: string | number, data: Record<string, unknown>) {
  if (!shouldIndexModule(module)) return;
  const tokens = collectSearchTokens(buildSearchText(module, data));
  const entityType = module;
  const normalizedEntityId = String(entityId);
  const normalizedEntityIdInt = Number(entityId) || 0;
  await db.run(
    `DELETE FROM "SearchToken" WHERE "company" = ? AND "entityType" = ? AND ("entityIdInt" = ? OR "entityId" = ?)`,
    [company, entityType, normalizedEntityIdInt, normalizedEntityId],
  );
  if (tokens.length === 0) return;
  const bulkInsert = buildBulkInsertSql(company, entityType, normalizedEntityId, tokens);
  await db.run(bulkInsert.sql, bulkInsert.params);
}

export async function syncSearchTokensBulk(
  rows: Array<{ module: string; company: string; entityId: string | number; data: Record<string, unknown> }>,
) {
  if (rows.length === 0) return;
  // Process in batches of 10 to avoid overly large SQL statements
  const batchSize = 10;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await Promise.all(batch.map((row) =>
      syncSearchTokens(row.module, row.company, row.entityId, row.data),
    ));
  }
}

export async function deleteSearchTokens(module: string, company: string, entityId: string | number) {
  if (!shouldIndexModule(module)) return;
  const normalizedEntityId = String(entityId);
  const normalizedEntityIdInt = Number(entityId) || 0;
  await db.run(
    `DELETE FROM "SearchToken" WHERE "company" = ? AND "entityType" = ? AND ("entityIdInt" = ? OR "entityId" = ?)`,
    [company, module, normalizedEntityIdInt, normalizedEntityId],
  );
}

export function buildSearchIndexPrefilter(module: string, company: string, query: string, alias = "t") {
  if (!shouldIndexModule(module) || !company.trim()) {
    return { clause: "", params: [] as unknown[] };
  }
  const tokens = collectSearchTokens([query]).slice(0, 3);
  if (tokens.length === 0) {
    return { clause: "", params: [] as unknown[] };
  }
  const entityIdExpr = alias ? `${alias}."id"` : '"id"';
  const tokenClauses = tokens.map(() => `EXISTS (SELECT 1 FROM "SearchToken" st WHERE st."company" = ? AND st."entityType" = ? AND st."entityIdInt" = ${entityIdExpr} AND SUBSTR(st."token", 1, LENGTH(?)) = ? )`);
  return {
    clause: ` AND ${tokenClauses.join(" AND ")}`,
    params: tokens.flatMap((token) => [company, module, token, token]),
  };
}

export function buildSearchTokenClause(module: string, company: string, query: string, alias = "t") {
  if (!shouldIndexModule(module) || !company.trim()) {
    return { clause: "", params: [] as unknown[] };
  }
  const tokens = collectSearchTokens([query]).slice(0, 3);
  if (tokens.length === 0) {
    return { clause: "", params: [] as unknown[] };
  }
  const entityIdExpr = alias ? `${alias}."id"` : '"id"';
  return {
    clause: ` AND ${tokens.map(() => `EXISTS (SELECT 1 FROM "SearchToken" st WHERE st."company" = ? AND st."entityType" = ? AND st."entityIdInt" = ${entityIdExpr} AND SUBSTR(st."token", 1, LENGTH(?)) = ? )`).join(" AND ")}`,
    params: tokens.flatMap((token) => [company, module, token, token]),
  };
}
