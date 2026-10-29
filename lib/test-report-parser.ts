export type ParsedTestResult = {
  name: string;
  suiteName?: string;
  status: "Passed" | "Failed" | "Blocked" | "Skipped";
  durationMs: number;
  errorMessage?: string;
  stackTrace?: string;
};

/**
 * Parses JUnit XML format.
 * Matches <testcase name="..." classname="..." time="...">...</testcase>
 */
export function parseJUnitXml(xml: string): ParsedTestResult[] {
  const results: ParsedTestResult[] = [];
  if (!xml || typeof xml !== "string") return results;

  // Regex to match <testcase ...>...</testcase> or self-closing <testcase .../>
  const testcaseRegex = /<testcase\s+([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/gi;
  let match: RegExpExecArray | null;

  while ((match = testcaseRegex.exec(xml)) !== null) {
    const attrsStr = match[1] || "";
    const innerContent = match[3] || "";

    // Extract attributes with word boundaries to avoid matching "name" inside "classname"
    const nameMatch = /\bname=["']([^"']+)["']/i.exec(attrsStr);
    const classnameMatch = /\bclassname=["']([^"']+)["']/i.exec(attrsStr);
    const timeMatch = /\btime=["']([^"']+)["']/i.exec(attrsStr);

    const name = nameMatch?.[1] ? nameMatch[1].trim() : "Unnamed Test";
    const suiteName = classnameMatch?.[1]?.trim();
    const durationSeconds = parseFloat(timeMatch?.[1] || "0");
    const durationMs = Math.round((Number.isNaN(durationSeconds) ? 0 : durationSeconds) * 1000);

    let status: "Passed" | "Failed" | "Blocked" | "Skipped" = "Passed";
    let errorMessage: string | undefined = undefined;
    let stackTrace: string | undefined = undefined;

    if (/<failure/i.test(innerContent)) {
      status = "Failed";
      const failureMsgMatch = /<failure[^>]*?message=["']([^"']+)["']/i.exec(innerContent);
      errorMessage = failureMsgMatch?.[1];
      const failureBodyMatch = /<failure[^>]*>([\s\S]*?)<\/failure>/i.exec(innerContent);
      stackTrace = failureBodyMatch?.[1]?.trim();
    } else if (/<error/i.test(innerContent)) {
      status = "Failed";
      const errorMsgMatch = /<error[^>]*?message=["']([^"']+)["']/i.exec(innerContent);
      errorMessage = errorMsgMatch?.[1];
      const errorBodyMatch = /<error[^>]*>([\s\S]*?)<\/error>/i.exec(innerContent);
      stackTrace = errorBodyMatch?.[1]?.trim();
    } else if (/<skipped/i.test(innerContent)) {
      status = "Skipped";
    }

    results.push({
      name,
      suiteName,
      status,
      durationMs,
      errorMessage,
      stackTrace,
    });
  }

  return results;
}

/**
 * Parses Playwright JSON test report format.
 */
export function parsePlaywrightJson(json: Record<string, unknown>): ParsedTestResult[] {
  const results: ParsedTestResult[] = [];
  if (!json || typeof json !== "object") return results;

  function traverseSuites(suiteList: unknown[], parentTitle = "") {
    if (!Array.isArray(suiteList)) return;
    for (const suite of suiteList) {
      if (!suite || typeof suite !== "object") continue;
      const s = suite as Record<string, unknown>;
      const suiteTitle = s.title ? (parentTitle ? `${parentTitle} > ${s.title}` : String(s.title)) : parentTitle;

      if (Array.isArray(s.specs)) {
        for (const spec of s.specs) {
          if (!spec || typeof spec !== "object") continue;
          const sp = spec as Record<string, unknown>;
          const testName = String(sp.title || "Unnamed Playwright Test");
          const tests = Array.isArray(sp.tests) ? sp.tests : [];
          for (const t of tests) {
            const testObj = t as Record<string, unknown>;
            const resultsList = Array.isArray(testObj.results) ? testObj.results : [];
            const lastResult = resultsList[resultsList.length - 1] as Record<string, unknown> | undefined;

            const rawStatus = String(lastResult?.status || "passed").toLowerCase();
            let status: "Passed" | "Failed" | "Blocked" | "Skipped" = "Passed";
            if (rawStatus === "failed" || rawStatus === "timedout") {
              status = "Failed";
            } else if (rawStatus === "skipped" || rawStatus === "interrupted") {
              status = "Skipped";
            }

            const durationMs = typeof lastResult?.duration === "number" ? Math.round(lastResult.duration) : 0;
            const errors = Array.isArray(lastResult?.errors) ? lastResult.errors : [];
            const errorMessage = errors.length > 0 ? String((errors[0] as { message?: string })?.message || "") : undefined;

            results.push({
              name: testName,
              suiteName: suiteTitle,
              status,
              durationMs,
              errorMessage,
            });
          }
        }
      }

      if (Array.isArray(s.suites)) {
        traverseSuites(s.suites, suiteTitle);
      }
    }
  }

  if (Array.isArray(json.suites)) {
    traverseSuites(json.suites);
  }

  return results;
}

/**
 * Universal dispatcher for any test report (JUnit XML, Playwright JSON, or generic array of tests).
 */
export function parseTestReport(raw: string | unknown, format?: string): ParsedTestResult[] {
  if (!raw) return [];

  // 1. If already an array of items
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const rec = (item || {}) as Record<string, unknown>;
      const rawStatus = String(rec.status || "passed").toLowerCase();
      let status: "Passed" | "Failed" | "Blocked" | "Skipped" = "Passed";
      if (rawStatus === "failed" || rawStatus === "fail" || rawStatus === "error") status = "Failed";
      else if (rawStatus === "skipped" || rawStatus === "skip") status = "Skipped";
      else if (rawStatus === "blocked") status = "Blocked";

      return {
        name: String(rec.name || rec.title || rec.caseName || "Unnamed Test"),
        suiteName: rec.suiteName ? String(rec.suiteName) : undefined,
        status,
        durationMs: typeof rec.durationMs === "number" ? rec.durationMs : typeof rec.duration === "number" ? rec.duration : 0,
        errorMessage: rec.errorMessage || rec.error ? String(rec.errorMessage || rec.error) : undefined,
        stackTrace: rec.stackTrace ? String(rec.stackTrace) : undefined,
      };
    });
  }

  // 2. If JSON object
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.tests) && obj.tests.every((t) => typeof t === "object")) {
      return parseTestReport(obj.tests);
    }
    if (Array.isArray(obj.suites)) {
      return parsePlaywrightJson(obj);
    }
  }

  // 3. String content
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("<") || format === "junit" || format === "xml") {
      return parseJUnitXml(trimmed);
    }
    try {
      const parsed = JSON.parse(trimmed);
      return parseTestReport(parsed, format);
    } catch {
      // If parsing fails as JSON, fallback to JUnit XML
      return parseJUnitXml(trimmed);
    }
  }

  return [];
}
