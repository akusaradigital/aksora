function compactText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;:]+$/g, "");
}

function normalizeTitle(value: string) {
  return compactText(value)
    .replace(/^\d+\s*[.)-]\s*/, "")
    .replace(/^\s*[-*•]\s*/, "")
    .replace(/\s*\([^)]*\)\s*$/i, "");
}

function parseLine(line: string) {
  const text = line.trim();
  if (!text) return null;

  const arrowMatch = text.match(/^(.+?)\s*(?:->|=>|:)\s*(.+)$/);
  if (!arrowMatch) {
    return { title: normalizeTitle(text) };
  }

  return {
    title: normalizeTitle(arrowMatch[1]),
  };
}

function joinNatural(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

type CategoryKey = "visual" | "access" | "interaction" | "navigation" | "general";

function classify(title: string): CategoryKey {
  const lower = title.toLowerCase();
  if (/(icon|garis|spasi|layout|ui|visual|warna|tampilan|size|ukuran|resize|library)/i.test(lower)) return "visual";
  if (/(?:\bakses\b|\baccess\b|\blogin\b|\bunlogged\b|\bforbid\b|\brestrict\b|\bpermission\b|\bauth\b|\bsecurity\b|\/vania)/i.test(lower)) return "access";
  if (/(auto[- ]?lock|auto[- ]?collapse|close modal|detail modal|generator|selection|click outside|modal)/i.test(lower)) return "interaction";
  if (/(redirect|prompt|edit\s*&\s*delete|delete prompt|feature|project|navigation|section|backlog row|add|new)/i.test(lower)) return "navigation";
  return "general";
}

function humanizePhrase(title: string) {
  const source = compactText(title);
  const lower = source.toLowerCase();

  if (/remove purple line/i.test(lower)) return "Remove the purple line in My Library";
  if (/forbid unlogged-in user/i.test(lower)) return "Add a restriction to the /vania path";
  if (/resize icon/i.test(lower)) return "Adjust the icon size";
  if (/auto lock project group selection/i.test(lower)) return "Apply auto-lock to project group selection";
  if (/auto collapse option in image and video generator/i.test(lower)) return "Apply auto-collapse in the image and video generator";
  if (/close modal when clicked from outside the detail modal/i.test(lower)) return "Close the modal automatically when clicking outside the area";
  if (/redirect to prompt section when delete prompt/i.test(lower)) return "Redirect to the Prompt section after deletion";
  if (/edit\s*&\s*delete feature for project/i.test(lower)) return "Add Edit & Delete project functionality";
  if (/prompt title/i.test(lower)) return "Update the prompt title";
  if (/auto collapse/i.test(lower)) return "Apply auto-collapse";
  if (/auto lock/i.test(lower)) return "Apply auto-lock";
  if (/forbid/i.test(lower)) return "Add a restriction";
  if (/remove/i.test(lower)) return "Remove";
  if (/resize/i.test(lower)) return "Adjust the size";
  if (/redirect/i.test(lower)) return "Redirect";
  if (/close modal/i.test(lower)) return "Close the modal";
  if (/edit/i.test(lower) && /delete/i.test(lower)) return "Add Edit & Delete functionality";
  if (/add/i.test(lower)) return "Add";
  if (/implement/i.test(lower)) return "Implement";
  if (/update/i.test(lower)) return "Update";

  return source;
}

function formatItem(title: string) {
  return humanizePhrase(title);
}

function summarizeCategory(category: CategoryKey, titles: Array<{ title: string }>) {
  const phrases = titles.map((item) => formatItem(item.title));
  const body = joinNatural(phrases);

  switch (category) {
    case "visual":
      return `Visual & UI Improvements: ${body} to keep the layout balanced.`;
    case "access":
      return `Access Security: ${body} so unauthenticated users cannot access it.`;
    case "interaction":
      return `Interaction Optimization: ${body}.`;
    case "navigation":
      return `Navigation Flow & New Features: ${body}.`;
    default:
      return `General Updates: ${body}.`;
  }
}

export function generateDeploymentNotes(changelog: string) {
  const raw = String(changelog ?? "").trim();
  if (!raw) return "";

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = (lines.length ? lines : [raw])
    .map(parseLine)
    .filter((item): item is { title: string } => Boolean(item && item.title));

  if (!items.length) return compactText(raw);

  const grouped = new Map<CategoryKey, Array<{ title: string }>>();
  for (const item of items) {
    const category = classify(item.title);
    const bucket = grouped.get(category) ?? [];
    bucket.push(item);
    grouped.set(category, bucket);
  }

  const order: CategoryKey[] = ["visual", "access", "interaction", "navigation", "general"];
  const summaries = order
    .map((category) => {
      const bucket = grouped.get(category);
      if (!bucket?.length) return null;
      return summarizeCategory(category, bucket);
    })
    .filter((value): value is string => Boolean(value));

  return summaries.map((line, index) => `${index + 1}. ${line}`).join("\n");
}
