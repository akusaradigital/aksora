import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformSuperAdmin, isWorkspaceAdmin } from "@/lib/roles";
import { moduleOrder, moduleConfigs } from "@/lib/modules";
import { getModuleSheetRows } from "@/lib/data";
import { buildGenericWorkbook, type GenericSheetConfig, resolveExportCellValue } from "@/lib/excel";
import { formatIndonesiaTimestamp } from "@/lib/download-name";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = String(user.company ?? "").trim();
    if (!company) {
      return NextResponse.json({ error: "No company context" }, { status: 400 });
    }

    const isAdmin = isWorkspaceAdmin(user.role) || isPlatformSuperAdmin(user.role, company);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sheets: GenericSheetConfig[] = [];

    for (const moduleKey of moduleOrder) {
      const rows = await getModuleSheetRows(moduleKey);
      const fields = moduleConfigs[moduleKey].fields;

      const columns = fields.map((field) => ({
        header: field.label,
        key: field.name,
        width: Math.max(16, field.label.length + 6),
      }));

      const excelRows = rows.map((row) => {
        const excelData: Record<string, string | number> = {};
        fields.forEach((field) => {
          excelData[field.name] = resolveExportCellValue(field, row as Record<string, string | number>);
        });
        return excelData;
      });

      sheets.push({
        sheetName: moduleConfigs[moduleKey].sheetName,
        columns,
        rows: excelRows,
      });
    }

    const workbook = await buildGenericWorkbook(sheets);
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `workspace-data-${formatIndonesiaTimestamp()}.xlsx`;

    await db.run(
      `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
      [user.name || user.email, "data_export", company, `Exported ${moduleOrder.length} modules`]
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Workspace export error:", error);
    return NextResponse.json({ error: "Failed to export workspace data." }, { status: 500 });
  }
}
