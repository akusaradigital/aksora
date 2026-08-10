import ExcelJS from "exceljs";
import { formatModuleFieldValue, moduleConfigs, type ModuleKey } from "@/lib/modules";

const fills = {
  P0: "FFE45E5E",
  P1: "FFF97316",
  P2: "FFFACC15",
  P3: "FF38BDF8",
  critical: "FFB91C1C",
  high: "FFEF4444",
  medium: "FFFACC15",
  low: "FF86EFAC",
  open: "FFFDA4AF",
  in_progress: "FF7DD3FC",
  ready_to_retest: "FFFDBA74",
  closed: "FF86EFAC",
  rejected: "FFD4D4D8",
  todo: "FFE4E4E7",
  doing: "FF7DD3FC",
  done: "FF86EFAC",
  deferred: "FFF5D0FE",
  draft: "FFE4E4E7",
  active: "FF86EFAC",
  obsolete: "FFD4D4D8",
} as const;

function headerLabel(fieldName: string) {
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase())
    .trim();
}

export function resolveExportCellValue(
  field: (typeof moduleConfigs)[ModuleKey]["fields"][number],
  row: Record<string, string | number>,
) {
  const candidates = [
    row[field.label],
    row[field.name],
    row[headerLabel(field.name)],
    row[headerLabel(field.label)],
  ];

  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (text) return formatModuleFieldValue(field, candidate);
  }

  return "";
}

export async function buildWorkbook(
  module: ModuleKey,
  rows: Record<string, string | number>[],
  template = false,
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(moduleConfigs[module].sheetName);
  
  // Use labels from field config for headers
  const columns = moduleConfigs[module].fields.map((field) => ({
    header: field.label,
    key: field.name,
    width: Math.max(16, field.label.length + 6),
  }));

  worksheet.columns = columns;
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Style Header Row
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFF8FAFC" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" }, // Darker slate
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = border();
  });

  if (!template) {
    for (const row of rows) {
      const excelData: Record<string, string | number> = {};
      moduleConfigs[module].fields.forEach((field) => {
        excelData[field.name] = resolveExportCellValue(field, row);
      });
      
      const excelRow = worksheet.addRow(excelData);
      styleDataRow(excelRow);
      applyRowColoring(module, excelRow, worksheet);
    }
  } else {
    // Add 5 empty rows for template with validation
    for (let i = 0; i < 5; i++) {
      const emptyData = Object.fromEntries(moduleConfigs[module].fields.map(f => [f.name, ""]));
      const placeholderRow = worksheet.addRow(emptyData);
      styleDataRow(placeholderRow);
    }
  }

  addDataValidation(module, worksheet);
  autoFitColumns(worksheet);
  autoFitRowHeights(worksheet);
  applyAutoBorders(worksheet, template ? 5 : rows.length);

  return workbook;
}

function addDataValidation(module: ModuleKey, worksheet: ExcelJS.Worksheet) {
  moduleConfigs[module].fields.forEach((field, index) => {
    if (field.kind !== "select") return;

    const options = field.options.map((option) => option.label).join(",");
    const formula = `"${options}"`;
    
    // Apply to first 500 rows
    for (let row = 2; row <= 500; row += 1) {
      worksheet.getCell(row, index + 1).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorTitle: "Invalid Selection",
        error: `Please select a value from the list for ${field.label}.`,
      };
    }
  });
}

function styleDataRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
    cell.border = border();
    cell.font = { size: 10, name: "Segoe UI" };
  });
}

function applyRowColoring(
  module: ModuleKey,
  row: ExcelJS.Row,
  worksheet: ExcelJS.Worksheet,
) {
  moduleConfigs[module].fields.forEach((field, index) => {
    const cell = worksheet.getCell(row.number, index + 1);
    const value = String(cell.value ?? "").toLowerCase().replace(/\s+/g, "_");
    
    // Check both raw value and normalized value for coloring
    const fill = fills[cell.value as keyof typeof fills] || fills[value as keyof typeof fills];

    if (fill) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fill },
      };
      // For dark backgrounds like P0, use white text
      if (value === "p0" || value === "critical") {
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
      }
    }

    if (field.kind === "url" && cell.value) {
      const url = String(cell.value);
      cell.value = { text: url, hyperlink: url };
      cell.font = { color: { argb: "FF2563EB" }, underline: true, size: 10 };
    }
  });
}

function autoFitColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns?.forEach((column) => {
    let maxLength = 18;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellText = String(cell.value ?? "");
      maxLength = Math.min(42, Math.max(maxLength, cellText.split("\n")[0].length + 2));
    });
    column.width = maxLength;
  });
}

function autoFitRowHeights(worksheet: ExcelJS.Worksheet) {
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    let maxLines = 1;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const text = String(cell.value ?? "");
      if (!text) return;
      const columnWidth = Number(worksheet.getColumn(colNumber).width ?? 18);
      const width = Math.max(10, Math.floor(columnWidth * 0.9));
      const lines = text.split(/\r?\n/).reduce((count, line) => {
        const wrapped = Math.max(1, Math.ceil(line.length / width));
        return count + wrapped;
      }, 0);
      maxLines = Math.max(maxLines, lines);
    });

    row.height = Math.min(240, Math.max(24, maxLines * 18));
  });
}

function applyAutoBorders(worksheet: ExcelJS.Worksheet, dataRowCount: number) {
  const rowCount = Math.max(1, dataRowCount + 1);
  const columnCount = worksheet.columnCount;

  for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
      worksheet.getCell(rowIndex, columnIndex).border = border();
    }
  }
}

function border() {
  return {
    top: { style: "thin", color: { argb: "FF111827" } },
    left: { style: "thin", color: { argb: "FF111827" } },
    bottom: { style: "thin", color: { argb: "FF111827" } },
    right: { style: "thin", color: { argb: "FF111827" } },
  } as ExcelJS.Borders;
}

export async function parseWorkbook(file: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file as never);
  return workbook.worksheets[0];
}
