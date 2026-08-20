import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ModuleWorkspace } from "@/components/module/module-workspace";
import { getAssigneeOptions, getModuleRows, getModuleRowsPage, getProjectOptions, getTestCaseStatsBySuiteIds, getTestPlanReferenceRows, getTestSuitesByPlanIds } from "@/lib/data";
import { moduleOrder, moduleConfigs, type ModuleKey } from "@/lib/modules";
import { getCurrentUser } from "@/lib/auth";
import { PAGE_SIZE } from "@/lib/pagination";
import { db } from "@/lib/db";
import { getTableName, getAccessScope } from "@/lib/data-helpers";
import { getItemTitleField, buildOgDescription } from "@/lib/og-helpers";

export const dynamic = "force-dynamic";

type RowData = Record<string, unknown> & {
  id?: string | number;
  title?: string | null;
  project?: string | null;
  publicToken?: string;
  testPlanId?: string | number;
  testPlanLabel?: string;
  testPlanRowSpan?: number;
  projectRowSpan?: number;
  version?: string;
};
type PlanRow = {
  id?: string | number;
  title?: string;
  project?: string;
  publicToken?: string;
};
type AssigneeOption = { value: string; label: string; role?: string };
type RelatedSuite = { id?: string | number; title?: string; token: string; publicToken: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { module: rawModule } = await params;
  const query = searchParams ? await searchParams : {};

  if (!moduleOrder.includes(rawModule as ModuleKey)) {
    return { title: "Aksora" };
  }

  const moduleKey = rawModule as ModuleKey;
  const config = moduleConfigs[moduleKey];
  const moduleLabel = config?.shortTitle ?? moduleKey;

  const rawViewParam = Array.isArray(query.view) ? query.view[0] : query.view;
  const viewId = rawViewParam ? String(rawViewParam).trim() || null : null;

  if (viewId) {
    try {
      const user = await getCurrentUser();
      const { company, isAdmin } = getAccessScope(user);
      const table = getTableName(moduleKey);

      if (table) {
        const companyFilter = isAdmin ? "" : ' AND "company" = ?';

        // Try lookup by publicToken first, then by numeric ID for backward compat
        let item: Record<string, unknown> | undefined;
        const parsedNum = parseInt(viewId, 10);
        if (Number.isFinite(parsedNum) && parsedNum > 0 && String(parsedNum) === viewId) {
          const queryParams: unknown[] = isAdmin ? [parsedNum] : [parsedNum, company];
          item = await db.get<Record<string, unknown>>(
            `SELECT * FROM "${table}" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${companyFilter}`,
            queryParams,
          );
        } else {
          const queryParams: unknown[] = isAdmin ? [viewId] : [viewId, company];
          item = await db.get<Record<string, unknown>>(
            `SELECT * FROM "${table}" WHERE "publicToken" = ? AND "deletedAt" IS NULL${companyFilter}`,
            queryParams,
          );
        }

        if (item) {
          const itemTitle = getItemTitleField(moduleKey, item);
          const ogTitle = `[${moduleLabel}] ${itemTitle}`;
          const ogDescription = buildOgDescription(moduleKey, item);

          return {
            title: ogTitle,
            openGraph: {
              title: ogTitle,
              description: ogDescription,
              url: `/${moduleKey}?view=${viewId}`,
              type: "article",
              siteName: "Aksora",
            },
          };
        }
      }
    } catch {
      // Fall through to module-level metadata on any error
    }
  }

  // Default module-level metadata
  return {
    title: `${moduleLabel} - Aksora`,
    openGraph: {
      title: `${moduleLabel} - Aksora`,
      description: `View and manage ${moduleLabel.toLowerCase()}`,
      type: "website",
      siteName: "Aksora",
    },
  };
}

function getNextVersion(version: string) {
  const match = String(version ?? "").trim().match(/^(v\.?|)(\d+)\.(\d+)\.(\d+)$/i);
  if (!match) return "";
  const [, prefix, major, minor, patch] = match;
  return `${prefix}${major}.${minor}.${Number(patch) + 1}`;
}

function compareVersions(left: string, right: string) {
  const matchLeft = String(left ?? "").trim().match(/^(v\.?|)(\d+)\.(\d+)\.(\d+)$/i);
  const matchRight = String(right ?? "").trim().match(/^(v\.?|)(\d+)\.(\d+)\.(\d+)$/i);
  if (!matchLeft && !matchRight) return 0;
  if (!matchLeft) return -1;
  if (!matchRight) return 1;
  const [, leftPrefix, leftMajor, leftMinor, leftPatch] = matchLeft;
  const [, rightPrefix, rightMajor, rightMinor, rightPatch] = matchRight;
  const leftWeight = leftPrefix ? 1 : 0;
  const rightWeight = rightPrefix ? 1 : 0;
  if (leftWeight !== rightWeight) return leftWeight - rightWeight;
  const majorDiff = Number(leftMajor) - Number(rightMajor);
  if (majorDiff !== 0) return majorDiff;
  const minorDiff = Number(leftMinor) - Number(rightMinor);
  if (minorDiff !== 0) return minorDiff;
  return Number(leftPatch) - Number(rightPatch);
}

function getLatestDeploymentVersion(rows: RowData[]) {
  return rows
    .map((row) => String(row.version ?? "").trim())
    .filter(Boolean)
    .reduce((latest, current) => (compareVersions(current, latest) > 0 ? current : latest), "");
}

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { module: rawModule } = await params;
  const query = searchParams ? await searchParams : {};
  const moduleKey = rawModule;
  const currentUser = await getCurrentUser();
  if (!moduleOrder.includes(moduleKey as ModuleKey)) {
    notFound();
  }

  const rawViewParam = Array.isArray(query.view) ? query.view[0] : query.view;
  const viewId = rawViewParam ? String(rawViewParam).trim() || null : null;

  const rawPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const requestedPage = Number(rawPage ?? 1);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const searchQuery = String(Array.isArray(query.q) ? query.q[0] : query.q ?? "").trim();
  const sortBy = String(Array.isArray(query.sortBy) ? query.sortBy[0] : query.sortBy ?? "").trim() || undefined;
  const sortDir = String(Array.isArray(query.sortDir) ? query.sortDir[0] : query.sortDir ?? "").trim() as "asc" | "desc" | undefined;

  let rows: RowData[] = [];
  let kanbanRows: RowData[] = [];
  let totalItems = 0;
  let relatedOptions: Record<string, Array<{ label: string; value: string }>> = {};
  const initialFormValues: Record<string, string> = {};
  
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (typeof v === "string") initialFormValues[k] = v;
      else if (Array.isArray(v) && v.length > 0) initialFormValues[k] = v[0];
    }
  }

  const hiddenFields: string[] = [];
  try {
    const firstPageData = await getModuleRowsPage(moduleKey as ModuleKey, currentPage, PAGE_SIZE, searchQuery, sortBy, sortDir);
    totalItems = firstPageData.total;

    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const resolvedPageData =
      safePage !== currentPage
        ? await getModuleRowsPage(moduleKey as ModuleKey, safePage, PAGE_SIZE, searchQuery, sortBy, sortDir)
        : firstPageData;

    rows = resolvedPageData.rows as Record<string, unknown>[];
    kanbanRows = rows;

    if (moduleKey === "tasks" || moduleKey === "bugs" || moduleKey === "test-cases" || moduleKey === "sprints") {
      // ponytail: 500 is a soft cap, not real pagination — no team realistically has >500 open items in one status board. Add per-column virtualization if that ever changes.
      const allRows = await getModuleRows(moduleKey as ModuleKey, 500);
      kanbanRows = allRows as Record<string, unknown>[];
    }

    if (moduleKey === "test-suites") {
      const plans = (await getTestPlanReferenceRows()) as PlanRow[];
      const planMap = new Map<string, { project: string; title: string; publicToken: string }>();
      for (const plan of plans) {
        const id = String(plan.id ?? "");
        if (!id) continue;
        planMap.set(id, {
          project: String(plan.project ?? ""),
          title: String(plan.title ?? ""),
          publicToken: String(plan.publicToken ?? ""),
        });
      }

      relatedOptions = {
        testPlanId: plans.map((plan) => ({
          value: String(plan.id ?? ""),
          label: String(plan.title ?? ""),
        })),
      };
      const suiteStats = await getTestCaseStatsBySuiteIds(rows.map((suite) => suite.id ?? ""));

      rows = rows.map((suite) => {
        const suiteId = String(suite.id ?? "");
        const planId = String(suite.testPlanId ?? "");
        const plan = planMap.get(planId);
        return {
          ...suite,
          testPlanLabel: plan?.title ?? "",
          testPlanToken: plan?.publicToken ?? "",
          projectLabel: plan?.project ?? "",
          testSuiteId: suiteId,
          publicToken: String(suite.publicToken ?? ""),
          token: String(suite.publicToken ?? ""),
          passed: suiteStats.get(suiteId)?.passed ?? 0,
          failed: suiteStats.get(suiteId)?.failed ?? 0,
          total: suiteStats.get(suiteId)?.total ?? 0,
        };
      });

      rows.sort((a, b) => {
        const leftPlan = String(a.testPlanLabel ?? "");
        const rightPlan = String(b.testPlanLabel ?? "");
        if (leftPlan !== rightPlan) return leftPlan.localeCompare(rightPlan);
        return String(a.title ?? "").localeCompare(String(b.title ?? ""));
      });

      const grouped = new Map<string, { start: number; count: number }>();
      rows.forEach((row, index) => {
        const key = String(row.testPlanLabel ?? "");
        const current = grouped.get(key);
        if (!current) grouped.set(key, { start: index, count: 1 });
        else current.count += 1;
      });
      rows = rows.map((row, index) => {
        const key = String(row.testPlanLabel ?? "");
        const group = grouped.get(key);
        return { ...row, testPlanRowSpan: group && group.start === index ? group.count : 0 };
      });
    }

    if (moduleKey === "test-plans") {
      const suites = await getTestSuitesByPlanIds(rows.map((plan) => plan.id ?? ""));
      const suitesByPlan = new Map<string, RelatedSuite[]>();
      for (const suite of suites as RowData[]) {
        const planId = String(suite.testPlanId ?? "");
        if (!planId) continue;
        const list = suitesByPlan.get(planId) ?? [];
        const token = String(suite.token ?? suite.publicToken ?? "");
        list.push({ id: suite.id, title: String(suite.title ?? ""), token, publicToken: token });
        suitesByPlan.set(planId, list);
      }
      rows = rows.map((row) => ({
        ...row,
        relatedSuites: suitesByPlan.get(String(row.id)) ?? [],
      }));

      rows.sort((a, b) => {
        const projA = String(a.project ?? "");
        const projB = String(b.project ?? "");
        if (projA !== projB) return projA.localeCompare(projB);
        return String(a.title ?? "").localeCompare(String(b.title ?? ""));
      });

      const groupedProj = new Map<string, { start: number; count: number }>();
      rows.forEach((row, index) => {
        const key = String(row.project ?? "");
        const current = groupedProj.get(key);
        if (!current) groupedProj.set(key, { start: index, count: 1 });
        else current.count += 1;
      });
      rows = rows.map((row, index) => {
        const key = String(row.project ?? "");
        const group = groupedProj.get(key);
        return { ...row, projectRowSpan: group && group.start === index ? group.count : 0 };
      });
    }

    if (["meeting-notes", "tasks", "bugs", "deployments", "work-logs"].includes(moduleKey)) {
      relatedOptions.project = await getProjectOptions();
    }

    if (moduleKey === "deployments" && !initialFormValues.version) {
      const deploymentRows = await getModuleRows("deployments");
      const latestVersion = getLatestDeploymentVersion(deploymentRows);
      const nextVersion = latestVersion ? getNextVersion(latestVersion) : "";
      if (nextVersion) {
        initialFormValues.version = nextVersion;
      }
    }

    const teamOptionsRaw = (await getAssigneeOptions()) as AssigneeOption[];
    const devRoles = new Set(["fe", "be", "fullstack", "ai"]);
    const qaRoles = new Set(["qa"]);
    const qaPmRoles = new Set(["qa", "pm"]);
    const filterByRoles = (roles: Set<string>) => teamOptionsRaw.filter((option) => roles.has(String(option.role ?? "")));
    const selfOnlyOptions = currentUser?.name?.trim()
      ? [{ value: currentUser.name.trim(), label: `${currentUser.name.trim()} (${currentUser.role})` }]
      : [];
    const teamOptionsAll = currentUser?.role === "admin"
      ? teamOptionsRaw.map(({ value, label }) => ({ value, label }))
      : selfOnlyOptions;
    const selfFieldByModule: Partial<Record<ModuleKey, string>> = {
      tasks: "assignee",
      bugs: "suggestedDev",
      "test-cases": "assignee",
      "test-plans": "assignee",
      "test-sessions": "tester",
      "test-suites": "assignee",
      deployments: "developer",
      "work-logs": "assignee",
    };

    const config = moduleConfigs[moduleKey as ModuleKey];
    if (config) {
      config.fields.forEach((field) => {
        if (field.name === "tester") {
          relatedOptions[field.name] = currentUser?.role === "admin"
            ? filterByRoles(qaRoles).map(({ value, label }) => ({ value, label }))
            : (selfFieldByModule[moduleKey as ModuleKey] === "tester" ? teamOptionsAll : []);
          return;
        }
        if (["suggestedDev", "developer"].includes(field.name)) {
          relatedOptions[field.name] = currentUser?.role === "admin"
            ? filterByRoles(devRoles).map(({ value, label }) => ({ value, label }))
            : (selfFieldByModule[moduleKey as ModuleKey] === field.name ? teamOptionsAll : []);
          return;
        }
        if (field.name === "assignee") {
          if (currentUser?.role === "admin") {
            if (["test-plans", "test-suites", "test-cases", "test-sessions", "sprints"].includes(moduleKey)) {
              relatedOptions[field.name] = filterByRoles(qaPmRoles).map(({ value, label }) => ({ value, label }));
            } else {
              relatedOptions[field.name] = teamOptionsRaw.map(({ value, label }) => ({ value, label }));
            }
          } else {
            relatedOptions[field.name] = selfFieldByModule[moduleKey as ModuleKey] === "assignee" ? teamOptionsAll : [];
          }
        }
      });
    }
  } catch (error) {
    console.error(`Failed to load module rows for ${moduleKey}:`, error);
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const plainRows = JSON.parse(JSON.stringify(rows));
  const plainRelatedOptions = JSON.parse(JSON.stringify(relatedOptions));

  return (
    <ModuleWorkspace
      key={moduleKey}
      module={moduleKey as ModuleKey}
      rows={plainRows}
      kanbanRows={JSON.parse(JSON.stringify(kanbanRows))}
      currentPage={safePage}
      totalPages={totalPages}
      totalItems={totalItems}
      relatedOptions={plainRelatedOptions}
      initialFormValues={initialFormValues}
      versionSequenceDefaultValue={initialFormValues.version || ""}
      hiddenFields={hiddenFields}
      user={JSON.parse(JSON.stringify(currentUser))}
      viewId={viewId}
    />
  );
}

