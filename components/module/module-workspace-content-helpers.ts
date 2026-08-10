type Row = Record<string, string | number> & { id: string | number };

export function compareVersions(left: string, right: string) {
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

export function getLatestVersion(rows: Row[]) {
  return rows
    .map((row) => String(row.version ?? "").trim())
    .filter(Boolean)
    .reduce((latest, current) => (compareVersions(current, latest) > 0 ? current : latest), "");
}

export function getNextVersion(version: string) {
  const match = String(version ?? "").trim().match(/^(v\.?|)(\d+)\.(\d+)\.(\d+)$/i);
  if (!match) return "";
  const [, prefix, major, minor, patch] = match;
  return `${prefix}${major}.${minor}.${Number(patch) + 1}`;
}
