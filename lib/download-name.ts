export function formatIndonesiaTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes[number]) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return [
    get("day"),
    get("month"),
    get("year"),
    [get("hour"), get("minute"), get("second")].filter(Boolean).join("-"),
  ]
    .filter(Boolean)
    .join("-");
}

export function buildDownloadFilename(
  moduleKey: string,
  kind: "export" | "template",
  extension: "xlsx" | "pdf",
  date = new Date(),
) {
  return `${moduleKey}-${kind}-${formatIndonesiaTimestamp(date)}.${extension}`;
}
