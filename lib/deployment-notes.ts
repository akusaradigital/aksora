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
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, dan ${items[items.length - 1]}`;
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

  if (/remove purple line/i.test(lower)) return "Menghapus garis ungu di My Library";
  if (/forbid unlogged-in user/i.test(lower)) return "Menambahkan restriksi pada jalur /vania";
  if (/resize icon/i.test(lower)) return "Menyesuaikan ukuran ikon";
  if (/auto lock project group selection/i.test(lower)) return "Menerapkan auto-lock pada pilihan grup proyek";
  if (/auto collapse option in image and video generator/i.test(lower)) return "Menerapkan auto-collapse pada generator gambar/video";
  if (/close modal when clicked from outside the detail modal/i.test(lower)) return "Menutup modal otomatis saat klik di luar area";
  if (/redirect to prompt section when delete prompt/i.test(lower)) return "Mengarahkan ke bagian Prompt setelah penghapusan";
  if (/edit\s*&\s*delete feature for project/i.test(lower)) return "Menambahkan fitur Edit & Delete proyek";
  if (/prompt title/i.test(lower)) return "Memperbarui prompt title";
  if (/auto collapse/i.test(lower)) return "Menerapkan auto-collapse";
  if (/auto lock/i.test(lower)) return "Menerapkan auto-lock";
  if (/forbid/i.test(lower)) return "Menambahkan restriksi";
  if (/remove/i.test(lower)) return "Menghapus";
  if (/resize/i.test(lower)) return "Menyesuaikan ukuran";
  if (/redirect/i.test(lower)) return "Mengarahkan";
  if (/close modal/i.test(lower)) return "Menutup modal";
  if (/edit/i.test(lower) && /delete/i.test(lower)) return "Menambahkan fitur Edit & Delete";
  if (/add/i.test(lower)) return "Menambahkan";
  if (/implement/i.test(lower)) return "Menerapkan";
  if (/update/i.test(lower)) return "Memperbarui";

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
      return `Penyempurnaan Visual & UI: ${body} agar lebih proporsional.`;
    case "access":
      return `Keamanan Akses: ${body} sehingga pengguna yang belum login tidak dapat mengaksesnya.`;
    case "interaction":
      return `Optimasi Interaksi: ${body}.`;
    case "navigation":
      return `Alur Navigasi & Fitur Baru: ${body}.`;
    default:
      return `Pembaruan Umum: ${body}.`;
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
