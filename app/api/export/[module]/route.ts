import { NextRequest, NextResponse } from "next/server";
import { buildWorkbook } from "@/lib/excel";
import { buildPdfBuffer } from "@/lib/pdf-export";
import { getModuleSheetRows } from "@/lib/data";
import { moduleConfigs, moduleOrder, type ModuleKey } from "@/lib/modules";
import { getCurrentUser } from "@/lib/auth";
import { buildDownloadFilename } from "@/lib/download-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertModule(value: string): ModuleKey | null {
  return moduleOrder.includes(value as ModuleKey) ? (value as ModuleKey) : null;
}

export function buildExportFilename(
  moduleKey: ModuleKey,
  template: boolean,
  now = new Date(),
) {
  return buildDownloadFilename(moduleKey, template ? "template" : "export", "xlsx", now);
}

export function buildPdfFilename(
  moduleKey: ModuleKey,
  template: boolean,
  now = new Date(),
) {
  return buildDownloadFilename(moduleKey, template ? "template" : "export", "pdf", now);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { module: rawModule } = await params;
    const moduleKey = assertModule(rawModule);
    const template = request.nextUrl.searchParams.get("template") === "1";

    if (!moduleKey) {
      return NextResponse.json({ error: "Unknown module." }, { status: 404 });
    }

    const format = request.nextUrl.searchParams.get("format");
    const exportRows = template ? [] : await getModuleSheetRows(moduleKey);

    if (format === "pdf") {
      const pdfBuffer = await buildPdfBuffer(
        moduleKey,
        exportRows,
        template,
      );
      const filename = buildPdfFilename(moduleKey, template);

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const workbook = await buildWorkbook(moduleKey, exportRows, template);
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = buildExportFilename(moduleKey, template);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Sheet-Name": moduleConfigs[moduleKey].sheetName,
      },
    });
  } catch (error) {
    console.error("Export route error:", error);
    return NextResponse.json({ error: "Failed to export file." }, { status: 500 });
  }
}
