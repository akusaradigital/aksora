// Token-overlap (Jaccard) similarity between test case titles, 0..1.
// shortcut: bag-of-words only, ignores synonyms/word order; upgrade to embeddings if matches feel off.
const STOP_WORDS = new Set(["a", "an", "the", "and", "or", "of", "to", "in", "on", "with", "for", "is", "be", "when", "should", "verify", "user"]);

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

export function titleSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

export function findClosestCase<T extends { caseName: string }>(title: string, existing: T[]): { match: T; score: number } | null {
  let best: { match: T; score: number } | null = null;
  for (const item of existing) {
    const score = titleSimilarity(title, item.caseName);
    if (!best || score > best.score) best = { match: item, score };
  }
  return best && best.score > 0 ? best : null;
}

/** Above this score a candidate defaults to Skip. */
export const NEAR_DUPLICATE_SCORE = 0.8;
