import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { getComments, createComment } from "@/lib/data";
import { db } from "@/lib/db";

const MAX_CONTENT_LENGTH = 2000;
const MIN_CONTENT_LENGTH = 1;

const ALLOWED_ENTITY_TYPES = new Set(["Bug", "Task", "TestCase", "TestSuite", "TestPlan", "Sprint"]);

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

function sanitizeEntityType(value: unknown): string | null {
  const str = String(value ?? "").trim();
  return ALLOWED_ENTITY_TYPES.has(str) ? str : null;
}

function sanitizeEntityId(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

/**
 * Verify the entity exists and is visible within the user's company scope.
 * Acts as the "read access" check for GET and the "write access" check for POST.
 */
async function userHasReadAccess(entityType: string, entityId: number, company: string): Promise<boolean> {
  // Most QA tables are company-scoped. We just check existence with same company filter.
  // Sprint and TestPlan are also company-scoped; these are the supported entity types.
  const row = await db.get<{ id: number }>(
    `SELECT "id" FROM "${entityType}" WHERE "id" = CAST(? AS INTEGER) AND "company" = ?`,
    [entityId, company],
  );
  return Boolean(row);
}

/**
 * Write access - for now, mirrors read access (any user with read access in the same
 * company can write a comment). The Comment_Thread spec calls out a read-only mode for
 * users with read but not write access; until per-entity ACLs are introduced we treat
 * read access as the gate. Role-restricted entities (e.g. settings) are not in
 * ALLOWED_ENTITY_TYPES so they cannot be commented on.
 */
async function userHasWriteAccess(entityType: string, entityId: number, company: string): Promise<boolean> {
  return userHasReadAccess(entityType, entityId, company);
}

/**
 * GET /api/dashboard/comments?entityType=Bug&entityId=123
 * Returns: { comments: DashboardCommentRow[], canWrite: boolean }
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Authentication required", "UNAUTHORIZED", 401);

  const { searchParams } = new URL(request.url);
  const entityType = sanitizeEntityType(searchParams.get("entityType"));
  const entityId = sanitizeEntityId(searchParams.get("entityId"));

  if (!entityType) return errorResponse("Invalid or unsupported entityType", "VALIDATION_ERROR", 400);
  if (entityId === null) return errorResponse("entityId must be a positive integer", "VALIDATION_ERROR", 400);

  const { company } = getAccessScope(user);

  try {
    const canRead = await userHasReadAccess(entityType, entityId, company);
    if (!canRead) {
      return errorResponse("Insufficient permissions to read comments for this item", "FORBIDDEN", 403);
    }

    const canWrite = await userHasWriteAccess(entityType, entityId, company);
    const comments = await getComments(company, entityType, entityId);
    return NextResponse.json({ comments, canWrite });
  } catch (error) {
    console.error("Comments GET error:", error);
    return errorResponse("Failed to load comments", "INTERNAL_ERROR", 500);
  }
}

type CreateCommentBody = {
  entityType: string;
  entityId: number;
  content: string;
};

/**
 * POST /api/dashboard/comments
 * Body: { entityType, entityId, content }
 * Returns: { comment: DashboardCommentRow }
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Authentication required", "UNAUTHORIZED", 401);

  let body: CreateCommentBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", "VALIDATION_ERROR", 400);
  }

  const entityType = sanitizeEntityType(body.entityType);
  const entityId = sanitizeEntityId(body.entityId);
  if (!entityType) return errorResponse("Invalid or unsupported entityType", "VALIDATION_ERROR", 400);
  if (entityId === null) return errorResponse("entityId must be a positive integer", "VALIDATION_ERROR", 400);

  const trimmed = String(body.content ?? "").trim();
  if (trimmed.length < MIN_CONTENT_LENGTH) {
    return errorResponse("Comment content must not be empty", "VALIDATION_ERROR", 400);
  }
  if (trimmed.length > MAX_CONTENT_LENGTH) {
    return errorResponse(`Comment content must be ${MAX_CONTENT_LENGTH} characters or fewer`, "VALIDATION_ERROR", 400);
  }

  const { company } = getAccessScope(user);

  try {
    const canWrite = await userHasWriteAccess(entityType, entityId, company);
    if (!canWrite) {
      return errorResponse("Insufficient permissions to comment on this item", "FORBIDDEN", 403);
    }

    const authorName = user.name || user.email || `User ${user.id}`;
    const comment = await createComment(company, entityType, entityId, user.id, authorName, trimmed);
    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Comments POST error:", error);
    return errorResponse("Failed to create comment", "INTERNAL_ERROR", 500);
  }
}
