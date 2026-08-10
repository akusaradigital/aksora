import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { formatIndonesiaTimestamp } from "@/lib/download-name";
import { resolveExportCellValue } from "@/lib/excel";
import { moduleConfigs, type ModuleKey } from "@/lib/modules";

type PdfRow = Record<string, string | number>;

type ColumnSpec = {
  label: string;
  fieldName: string;
  width: number;
};

const PAGE_MARGIN = 24;
const TITLE_FONT = 18;
const SUBTITLE_FONT = 9;
const HEADER_FONT = 8;
const CELL_FONT = 7.5;
const LINE_GAP = 1.2;
const PDF_SAFE_CHARACTERS = /[^\x09\x0A\x0D\x20-\xFF]/g;
const PDF_FONT_REGULAR = "QA-Arial";
const PDF_FONT_BOLD = "QA-Arial-Bold";
const PDF_FONT_REGULAR_PATH = path.join(process.cwd(), "public", "fonts", "Arial-Regular.ttf");
const PDF_FONT_BOLD_PATH = path.join(process.cwd(), "public", "fonts", "Arial-Bold.ttf");

const PDF_TEXT_REPLACEMENTS: Record<string, string> = {
  "\u00A0": " ",
  "\u2013": "-",
  "\u2014": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u2022": "-",
  "\u2026": "...",
};

export async function buildPdfBuffer(
  module: ModuleKey,
  rows: PdfRow[],
  template = false,
) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: PAGE_MARGIN,
    bufferPages: true,
    info: {
      Title: `${moduleConfigs[module].title} Export`,
      Author: "Aksora",
      Subject: `${moduleConfigs[module].title} PDF export`,
    },
  });

  const chunks: Buffer[] = [];
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    registerPdfFonts(doc);
    renderPdf(doc, module, rows, template);
    doc.end();
  });

  return buffer;
}

function renderPdf(doc: PDFKit.PDFDocument, module: ModuleKey, rows: PdfRow[], template: boolean) {
  const fields = moduleConfigs[module].fields;
  const exportRows = template ? createTemplateRows(fields, 5) : rows;
  const specs = buildColumnSpecs(doc, fields, exportRows);

  drawPageHeader(doc, module, template);
  let tableTop = doc.y + 12;
  let rowTop = drawTableHeader(doc, specs, tableTop);

  exportRows.forEach((row, index) => {
    const values = fields.map((field) => resolveExportCellValue(field, row));
    const rowHeight = measureRowHeight(doc, specs, values);
    const bottomLimit = doc.page.height - PAGE_MARGIN;

    if (rowTop + rowHeight > bottomLimit) {
      doc.addPage();
      drawPageHeader(doc, module, template);
      tableTop = doc.y + 12;
      rowTop = drawTableHeader(doc, specs, tableTop);
    }

    drawDataRow(doc, specs, rowTop, values, index % 2 === 1);
    rowTop += rowHeight;
  });
}

function createTemplateRows(fields: (typeof moduleConfigs)[ModuleKey]["fields"], count: number) {
  return Array.from({ length: count }, () =>
    Object.fromEntries(fields.map((field) => [field.name, ""])),
  ) as PdfRow[];
}

function drawPageHeader(doc: PDFKit.PDFDocument, module: ModuleKey, template: boolean) {
  const title = sanitizePdfText(moduleConfigs[module].title);
  const stamp = formatIndonesiaTimestamp();

  doc.font(PDF_FONT_BOLD).fontSize(TITLE_FONT).fillColor("#0f172a");
  doc.text(title, PAGE_MARGIN, PAGE_MARGIN, { align: "left" });

  doc.font(PDF_FONT_REGULAR).fontSize(SUBTITLE_FONT).fillColor("#475569");
  doc.text(
    sanitizePdfText(
      template
        ? `Template export PDF · ${stamp}`
        : `Generated PDF export · ${stamp}`,
    ),
    PAGE_MARGIN,
    PAGE_MARGIN + 24,
    { align: "left" },
  );

  const y = PAGE_MARGIN + 42;
  doc
    .moveTo(PAGE_MARGIN, y)
    .lineTo(doc.page.width - PAGE_MARGIN, y)
    .lineWidth(1)
    .strokeColor("#cbd5e1")
    .stroke();

  doc.y = y + 10;
}

function drawTableHeader(doc: PDFKit.PDFDocument, specs: ColumnSpec[], top: number) {
  let x = PAGE_MARGIN;
  const height = 26;

  specs.forEach((spec) => {
    doc
      .save()
      .rect(x, top, spec.width, height)
      .fillAndStroke("#0f172a", "#0f172a");

    doc
      .font(PDF_FONT_BOLD)
      .fontSize(HEADER_FONT)
      .fillColor("#f8fafc")
      .text(sanitizePdfText(spec.label), x + 5, top + 8, {
        width: spec.width - 10,
        align: "left",
        lineBreak: false,
        ellipsis: true,
      });

    doc.restore();
    x += spec.width;
  });

  return top + height;
}

function drawDataRow(
  doc: PDFKit.PDFDocument,
  specs: ColumnSpec[],
  top: number,
  values: string[],
  alternate: boolean,
) {
  let x = PAGE_MARGIN;
  const rowHeight = measureRowHeight(doc, specs, values);

  specs.forEach((spec, index) => {
    const value = values[index] ?? "";
    const fill = alternate ? "#f8fafc" : "#ffffff";

    doc
      .save()
      .rect(x, top, spec.width, rowHeight)
      .fillAndStroke(fill, "#111827");

    doc
      .font(PDF_FONT_REGULAR)
      .fontSize(CELL_FONT)
      .fillColor("#0f172a")
      .text(sanitizePdfText(value || "-"), x + 5, top + 5, {
        width: spec.width - 10,
        height: rowHeight - 10,
        align: "left",
        lineBreak: true,
      });

    doc.restore();
    x += spec.width;
  });
}

function buildColumnSpecs(
  doc: PDFKit.PDFDocument,
  fields: (typeof moduleConfigs)[ModuleKey]["fields"],
  rows: PdfRow[],
) {
  const availableWidth = doc.page.width - PAGE_MARGIN * 2;

  const specs = fields.map((field) => {
    const header = sanitizePdfText(field.label);
    const samples = rows.slice(0, 24).map((row) => sanitizePdfText(resolveExportCellValue(field, row)));
    const longestLine = Math.max(
      header.length,
      ...samples.flatMap((value) => value.split(/\r?\n/).map((line) => line.length)),
      0,
    );
    const base = field.kind === "textarea" ? 112 : field.kind === "select" ? 72 : 58;
    const width = Math.min(180, Math.max(base, Math.round(longestLine * 3.2 + 18)));
    return { label: header, fieldName: field.name, width };
  });

  const totalWidth = specs.reduce((sum, spec) => sum + spec.width, 0);
  if (totalWidth <= availableWidth) return distributeExtraWidth(specs, availableWidth - totalWidth);

  const scaled = specs.map((spec) => ({
    ...spec,
    width: Math.max(48, Math.floor((spec.width / totalWidth) * availableWidth)),
  }));

  return shrinkToFit(scaled, availableWidth);
}

function distributeExtraWidth(specs: ColumnSpec[], extraWidth: number) {
  if (extraWidth <= 0) return specs;
  const flexible = specs.filter((spec) => spec.width >= 90);
  if (!flexible.length) return specs;

  const share = Math.floor(extraWidth / flexible.length);
  return specs.map((spec) => (spec.width >= 90 ? { ...spec, width: spec.width + share } : spec));
}

function shrinkToFit(specs: ColumnSpec[], availableWidth: number) {
  let total = specs.reduce((sum, spec) => sum + spec.width, 0);
  const result = specs.map((spec) => ({ ...spec }));

  while (total > availableWidth) {
    const widest = result.reduce((current, spec, index) => {
      if (spec.width <= 48) return current;
      if (!current || spec.width > current.spec.width) return { spec, index };
      return current;
    }, null as null | { spec: ColumnSpec; index: number });

    if (!widest) break;
    widest.spec.width -= 1;
    total -= 1;
  }

  return result;
}

function measureRowHeight(
  doc: PDFKit.PDFDocument,
  specs: ColumnSpec[],
  values: string[],
) {
  doc.font(PDF_FONT_REGULAR).fontSize(CELL_FONT);
  const heights = specs.map((spec, index) => {
    const text = sanitizePdfText(values[index] || "-");
    return doc.heightOfString(text, {
      width: spec.width - 10,
      align: "left",
      lineGap: LINE_GAP,
    });
  });

  return Math.max(22, Math.ceil(Math.max(...heights) + 10));
}

function registerPdfFonts(doc: PDFKit.PDFDocument) {
  if (!fs.existsSync(PDF_FONT_REGULAR_PATH)) {
    throw new Error(`Missing PDF font file: ${PDF_FONT_REGULAR_PATH}`);
  }

  doc.registerFont(PDF_FONT_REGULAR, PDF_FONT_REGULAR_PATH);
  doc.registerFont(
    PDF_FONT_BOLD,
    fs.existsSync(PDF_FONT_BOLD_PATH) ? PDF_FONT_BOLD_PATH : PDF_FONT_REGULAR_PATH,
  );
}

function sanitizePdfText(value: unknown) {
  const text = String(value ?? "");
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, (char) => PDF_TEXT_REPLACEMENTS[char] ?? "?")
    .replace(PDF_SAFE_CHARACTERS, "?");
}
