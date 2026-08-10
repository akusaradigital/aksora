import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createModuleRecord, deleteModuleRecord, deleteModuleRecords } from "@/lib/data";
import { db } from "@/lib/db";
import {
  formDataToEntry,
  moduleConfigs,
  moduleOrder,
  normalizeModuleEntry,
  type ModuleKey,
} from "@/lib/modules";
import { getCurrentUser } from "@/lib/auth";
import { isManagementAdmin } from "@/lib/roles";

function assertModule(value: string): ModuleKey | null {
  return moduleOrder.includes(value as ModuleKey) ? (value as ModuleKey) : null;
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
let lastCleanup = Date.now();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const limit = 60;
  const window = 60 * 1000;

  if (now - lastCleanup > 5 * 60 * 1000) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetTime) rateLimitMap.delete(key);
    }
    lastCleanup = now;
  }

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + window });
    return true;
  }

  if (record.count >= limit) return false;

  record.count++;
  return true;
}

import { friendlyErrorMessage, logError } from "@/lib/logger";

function getValidationMessage(module: ModuleKey, error: z.ZodError) {
  const issue = error.issues[0];
  return issue?.message ?? "Invalid data provided.";
}

function enforceSelfAssignment(
  _moduleKey: ModuleKey,
  _data: Record<string, string>,
  _user: Awaited<ReturnType<typeof getCurrentUser>>,
) {
  // All roles can assign to anyone
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> },
) {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { module: rawModule } = await params;
  const moduleKey = assertModule(rawModule);

  if (!moduleKey) {
    return NextResponse.json({ error: "Unknown module." }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (moduleKey === "users" && !isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const entry = formDataToEntry(formData);
    const schema = moduleConfigs[moduleKey].schema;
    const parsed = schema.safeParse(entry);

    if (!parsed.success) {
      return NextResponse.json(
        { error: getValidationMessage(moduleKey, parsed.error) },
        { status: 400 },
      );
    }

    const selfAssignmentError = enforceSelfAssignment(moduleKey, parsed.data as Record<string, string>, user);
    if (selfAssignmentError) {
      return NextResponse.json({ error: selfAssignmentError }, { status: 403 });
    }

    const data = moduleConfigs[moduleKey].coerce(parsed.data as Record<string, string>);

    await createModuleRecord(moduleKey, data);
    revalidatePath("/");
    revalidatePath(`/${moduleKey}`);

    return NextResponse.json({
      message: `${moduleConfigs[moduleKey].shortTitle} added successfully.`,
    });
  } catch (error) {
    logError(error, `POST /api/items/${moduleKey}`);
    const message = friendlyErrorMessage(error, "Failed to save data.");
    const status = error instanceof Error && error.message === message ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> },
) {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { module: rawModule } = await params;
  const moduleKey = assertModule(rawModule);
  const id = request.nextUrl.searchParams.get("id");
  const ids = request.nextUrl.searchParams.get("ids");

  if (!moduleKey) {
    return NextResponse.json({ error: "Unknown module." }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (moduleKey === "users" && !isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    if (ids) {
      const idList = ids.split(",").filter(Boolean);
      await deleteModuleRecords(moduleKey, idList);
      revalidatePath("/");
      revalidatePath(`/${moduleKey}`);
      return NextResponse.json({
        message: `${idList.length} items deleted successfully.`,
      });
    }

    if (!id) {
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    }

    await deleteModuleRecord(moduleKey, id as string);
    revalidatePath("/");
    revalidatePath(`/${moduleKey}`);

    return NextResponse.json({
      message: `${moduleConfigs[moduleKey].shortTitle} deleted successfully.`,
    });
  } catch (error) {
    logError(error, `DELETE /api/items/${moduleKey}`);
    const message = friendlyErrorMessage(error, "Failed to delete data.");
    const status = error instanceof Error && error.message === message ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> },
) {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { module: rawModule } = await params;
  const moduleKey = assertModule(rawModule);
  
  if (!moduleKey) {
    return NextResponse.json({ error: "Unknown module." }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (moduleKey === "users" && !isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, status, sortOrder, entry, ids, reorder } = body;

    // Batch reorder: [{ id, sortOrder, status? }, ...]
    if (Array.isArray(reorder) && reorder.length > 0) {
      const validItems = reorder.filter(
        (item: unknown) =>
          item && typeof item === "object" &&
          "id" in (item as Record<string, unknown>) &&
          "sortOrder" in (item as Record<string, unknown>) &&
          typeof (item as Record<string, unknown>).sortOrder === "number"
      ) as { id: string | number; sortOrder: number; status?: string }[];

      if (validItems.length === 0) {
        return NextResponse.json({ error: "Invalid reorder payload." }, { status: 400 });
      }

      const { batchUpdateSortOrder } = await import("@/lib/data");
      await batchUpdateSortOrder(moduleKey, validItems);

      revalidatePath("/");
      revalidatePath(`/${moduleKey}`);

      return NextResponse.json({
        message: `${validItems.length} items reordered successfully.`,
      });
    }

    if (Array.isArray(ids) && ids.length > 0 && status) {
      const { updateModuleStatus } = await import("@/lib/data");
      for (const itemId of ids) {
        await updateModuleStatus(moduleKey, itemId, status, sortOrder);
      }

      revalidatePath("/");
      revalidatePath(`/${moduleKey}`);

      return NextResponse.json({
        message: `${ids.length} items updated successfully.`,
      });
    }

    if (!id) {
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    }

    if (entry && typeof entry === "object") {
      const sanitizedEntry = Object.fromEntries(
        Object.entries(entry as Record<string, unknown>).map(([key, value]) => {
          const str = String(value ?? "");
          return [key, str === "undefined" || str === "null" ? "" : str];
        }),
      );
      const normalized = normalizeModuleEntry(moduleKey, sanitizedEntry);
      const schema = moduleConfigs[moduleKey].schema;
      const parsed = schema.safeParse(normalized);

      if (!parsed.success) {
        return NextResponse.json(
          { error: getValidationMessage(moduleKey, parsed.error) },
          { status: 400 },
        );
      }

      const selfAssignmentError = enforceSelfAssignment(moduleKey, parsed.data as Record<string, string>, user);
      if (selfAssignmentError) {
        return NextResponse.json({ error: selfAssignmentError }, { status: 403 });
      }

      const { updateModuleRecord } = await import("@/lib/data");
      const data = moduleConfigs[moduleKey].coerce(parsed.data as Record<string, string>);
      await updateModuleRecord(moduleKey, id, data);

      revalidatePath("/");
      revalidatePath(`/${moduleKey}`);

      return NextResponse.json({
        message: `${moduleConfigs[moduleKey].shortTitle} updated successfully.`,
      });
    }

    if (status) {
      const { updateModuleStatus } = await import("@/lib/data");
      await updateModuleStatus(moduleKey, id, status, sortOrder);
      
      revalidatePath("/");
      revalidatePath(`/${moduleKey}`);

      return NextResponse.json({
        message: `Status updated successfully.`,
      });
    }

    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  } catch (error) {
    logError(error, `PATCH /api/items/${moduleKey}`);
    const message = friendlyErrorMessage(error, "Failed to update data.");
    const status = error instanceof Error && error.message === message ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
