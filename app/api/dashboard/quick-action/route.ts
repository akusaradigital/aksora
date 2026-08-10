import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { db } from "@/lib/db";

type QuickActionBody = {
  entityType: string;
  entityId: number;
  action: string;
  value: string;
};

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Authentication required", "FORBIDDEN", 403);
    }

    // Role check: only admin or superadmin can use quick actions
    if (user.role !== "admin" && user.role !== "superadmin") {
      return errorResponse("Insufficient permissions. Admin or superadmin role required.", "FORBIDDEN", 403);
    }

    let body: QuickActionBody;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request body", "VALIDATION_ERROR", 400);
    }

    const { entityType, entityId, action, value } = body;

    // Validate required fields
    if (!entityType || !entityId || !action || !value) {
      return errorResponse("Missing required fields: entityType, entityId, action, value", "VALIDATION_ERROR", 400);
    }

    // Validate entityType
    if (entityType !== "Bug" && entityType !== "Task") {
      return errorResponse("entityType must be 'Bug' or 'Task'", "VALIDATION_ERROR", 400);
    }

    // Validate action
    if (action !== "assign" && action !== "status") {
      return errorResponse("action must be 'assign' or 'status'", "VALIDATION_ERROR", 400);
    }

    // Validate entityId is a positive integer
    if (typeof entityId !== "number" || !Number.isInteger(entityId) || entityId <= 0) {
      return errorResponse("entityId must be a positive integer", "VALIDATION_ERROR", 400);
    }

    const { company } = getAccessScope(user);

    // Verify entity exists within company scope
    const entity = await db.get<{ id: number }>(
      `SELECT "id" FROM "${entityType}" WHERE "id" = CAST(? AS INTEGER) AND "company" = ?`,
      [entityId, company]
    );

    if (!entity) {
      return errorResponse(`${entityType} not found`, "NOT_FOUND", 404);
    }

    // Perform the update based on action type
    if (action === "assign") {
      // Task uses "assignee"; only Bug has "suggestedDev"
      const assignColumn = entityType === "Task" ? "assignee" : "suggestedDev";
      await db.run(
        `UPDATE "${entityType}" SET "${assignColumn}" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER) AND "company" = ?`,
        [value, entityId, company]
      );
      await logActivity(company, entityType, String(entityId), "Updated", `Assigned ${entityType} to ${value}`, user.name || user.email || "");
    } else {
      // action === "status"
      await db.run(
        `UPDATE "${entityType}" SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER) AND "company" = ?`,
        [value, entityId, company]
      );
      await logActivity(company, entityType, String(entityId), "Updated", `Changed ${entityType} status to ${value}`, user.name || user.email || "");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Quick action error:", error);
    return errorResponse("An unexpected error occurred", "INTERNAL_ERROR", 500);
  }
}
