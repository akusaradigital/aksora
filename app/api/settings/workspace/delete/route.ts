import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformSuperAdmin, isWorkspaceAdmin } from "@/lib/roles";
import { moduleOrder } from "@/lib/modules";
import { getTableName } from "@/lib/data-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const confirmCompanyName = String(body.confirmCompanyName ?? "");

    if (confirmCompanyName !== company) {
      return NextResponse.json(
        { error: "Company name confirmation does not match." },
        { status: 400 }
      );
    }

    await db.transaction(async () => {
      // Audit log insertion BEFORE actual deletions occur
      await db.run(
        `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
        [
          user.name || user.email,
          "company_data_deleted",
          company,
          "All workspace data deleted, status set to deleted",
        ]
      );

      // Delete module data for this company
      for (const moduleKey of moduleOrder) {
        const table = getTableName(moduleKey);
        if (!table) continue;

        if (table === "User") {
          // Delete all users except the active admin performing the action
          await db.run(
            `DELETE FROM "User" WHERE "company" = ? AND "id" != CAST(? AS INTEGER)`,
            [company, user.id]
          );
        } else {
          await db.run(`DELETE FROM "${table}" WHERE "company" = ?`, [company]);
        }
      }

      // Update Company status to 'deleted'
      await db.run(
        `UPDATE "Company" SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = ?`,
        ["deleted", company]
      );
    });

    return NextResponse.json({
      ok: true,
      message: "Company data has been permanently deleted.",
    });
  } catch (error) {
    console.error("Workspace delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete workspace data." },
      { status: 500 }
    );
  }
}
