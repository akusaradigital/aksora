import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

type GapItem = {
  source: "task" | "bug";
  id: number;
  title: string;
  project: string;
  module?: string;
  feature?: string;
  status: string;
  priority: string;
  matchedCases: number;
  coverage: "covered" | "partial" | "uncovered";
};

type ProjectGap = {
  project: string;
  totalItems: number;
  coveredItems: number;
  partialItems: number;
  uncoveredItems: number;
  coverageRate: number;
  totalCases: number;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company: _company, isAdmin, params } = getAccessScope(user);
  const companyFilter = isAdmin ? "" : ' AND "company" = ?';

  try {
    // Get all active tasks (features/enhancements that should have test coverage)
    const tasks = await db.query<{
      id: number;
      title: string;
      project: string;
      relatedFeature: string;
      category: string;
      status: string;
      priority: string;
    }>(
      `SELECT "id", "title", "project", "relatedFeature", "category", "status", "priority"
       FROM "Task"
       WHERE "deletedAt" IS NULL AND "category" IN ('feature', 'enhancement') ${companyFilter}
       ORDER BY "project", "priority"`,
      params,
    );

    // Get all active bugs (should have regression test cases)
    const bugs = await db.query<{
      id: number;
      title: string;
      project: string;
      module: string;
      status: string;
      priority: string;
      severity: string;
    }>(
      `SELECT "id", "title", "project", "module", "status", "priority", "severity"
       FROM "Bug"
       WHERE "deletedAt" IS NULL AND "status" IN ('closed', 'ready_to_retest') ${companyFilter}
       ORDER BY "project", "severity" DESC`,
      params,
    );

    // Get all test cases with their names for matching
    const testCases = await db.query<{
      id: number;
      caseName: string;
      testStep: string;
      preCondition: string;
      tcId: string;
      suiteTitle: string;
      project: string;
    }>(
      `SELECT tc."id", tc."caseName", tc."testStep", tc."preCondition", tc."tcId",
              COALESCE(ts."title", '') as "suiteTitle",
              COALESCE(tp."project", '') as "project"
       FROM "TestCase" tc
       LEFT JOIN "TestSuite" ts ON CAST(tc."testSuiteId" AS TEXT) = CAST(ts."id" AS TEXT) AND ts."deletedAt" IS NULL
       LEFT JOIN "TestPlan" tp ON CAST(ts."testPlanId" AS TEXT) = CAST(tp."id" AS TEXT) AND tp."deletedAt" IS NULL
       WHERE tc."deletedAt" IS NULL ${companyFilter}`,
      params,
    );

    // Build searchable index from test cases
    const caseTexts = testCases.map((tc) => ({
      id: tc.id,
      text: `${tc.caseName} ${tc.testStep} ${tc.preCondition} ${tc.suiteTitle}`.toLowerCase(),
      project: tc.project.toLowerCase(),
    }));

    // Match tasks to test cases
    const gapItems: GapItem[] = [];

    for (const task of tasks) {
      const keywords = extractKeywords(task.title, task.relatedFeature);
      const projectLower = task.project.toLowerCase();

      const matchedCases = caseTexts.filter((tc) => {
        // Same project or project-agnostic match
        const projectMatch = !tc.project || tc.project === projectLower || projectLower === "";
        if (!projectMatch) return false;
        // Keyword match
        return keywords.some((kw) => tc.text.includes(kw));
      });

      const coverage: "covered" | "partial" | "uncovered" =
        matchedCases.length >= 3 ? "covered" : matchedCases.length > 0 ? "partial" : "uncovered";

      gapItems.push({
        source: "task",
        id: task.id,
        title: task.title,
        project: task.project,
        feature: task.relatedFeature,
        status: task.status,
        priority: task.priority,
        matchedCases: matchedCases.length,
        coverage,
      });
    }

    for (const bug of bugs) {
      const keywords = extractKeywords(bug.title, bug.module);
      const projectLower = bug.project.toLowerCase();

      const matchedCases = caseTexts.filter((tc) => {
        const projectMatch = !tc.project || tc.project === projectLower || projectLower === "";
        if (!projectMatch) return false;
        return keywords.some((kw) => tc.text.includes(kw));
      });

      const coverage: "covered" | "partial" | "uncovered" =
        matchedCases.length >= 2 ? "covered" : matchedCases.length > 0 ? "partial" : "uncovered";

      gapItems.push({
        source: "bug",
        id: bug.id,
        title: bug.title,
        project: bug.project,
        module: bug.module,
        status: bug.status,
        priority: bug.priority,
        matchedCases: matchedCases.length,
        coverage,
      });
    }

    // Aggregate by project
    const projectMap = new Map<string, ProjectGap>();
    for (const item of gapItems) {
      const existing = projectMap.get(item.project) || {
        project: item.project,
        totalItems: 0,
        coveredItems: 0,
        partialItems: 0,
        uncoveredItems: 0,
        coverageRate: 0,
        totalCases: 0,
      };
      existing.totalItems += 1;
      if (item.coverage === "covered") existing.coveredItems += 1;
      else if (item.coverage === "partial") existing.partialItems += 1;
      else existing.uncoveredItems += 1;
      existing.totalCases += item.matchedCases;
      projectMap.set(item.project, existing);
    }

    const byProject = Array.from(projectMap.values()).map((p) => ({
      ...p,
      coverageRate: p.totalItems > 0 ? Math.round(((p.coveredItems + p.partialItems * 0.5) / p.totalItems) * 100) : 0,
    }));

    // Summary
    const totalItems = gapItems.length;
    const coveredItems = gapItems.filter((i) => i.coverage === "covered").length;
    const partialItems = gapItems.filter((i) => i.coverage === "partial").length;
    const uncoveredItems = gapItems.filter((i) => i.coverage === "uncovered").length;
    const overallCoverage = totalItems > 0 ? Math.round(((coveredItems + partialItems * 0.5) / totalItems) * 100) : 0;

    // Sort: uncovered first, then partial, then covered
    const coverageOrder = { uncovered: 0, partial: 1, covered: 2 };
    gapItems.sort((a, b) => coverageOrder[a.coverage] - coverageOrder[b.coverage]);

    return NextResponse.json({
      summary: {
        totalItems,
        coveredItems,
        partialItems,
        uncoveredItems,
        overallCoverage,
        totalTestCases: testCases.length,
      },
      byProject,
      items: gapItems,
    });
  } catch (error) {
    console.error("Test gap API error:", error);
    return NextResponse.json({ error: "Failed to load test gap data" }, { status: 500 });
  }
}

function extractKeywords(title: string, secondary?: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "must", "to", "of",
    "in", "for", "on", "with", "at", "by", "from", "as", "into", "through",
    "during", "before", "after", "above", "below", "between", "and", "but",
    "or", "not", "no", "nor", "so", "yet", "both", "either", "neither",
    "each", "every", "all", "any", "few", "more", "most", "other", "some",
    "such", "than", "too", "very", "just", "also", "only", "then", "when",
    "where", "how", "what", "which", "who", "whom", "this", "that", "these",
    "those", "it", "its", "add", "fix", "update", "implement", "create",
    "new", "bug", "issue", "error", "feature", "task",
  ]);

  const combined = `${title} ${secondary || ""}`.toLowerCase();
  const words = combined
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  // Also include multi-word phrases (bigrams)
  const phrases: string[] = [];
  const wordList = combined.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3);
  for (let i = 0; i < wordList.length - 1; i++) {
    if (!stopWords.has(wordList[i]) && !stopWords.has(wordList[i + 1])) {
      phrases.push(`${wordList[i]} ${wordList[i + 1]}`);
    }
  }

  return [...new Set([...words, ...phrases])];
}
