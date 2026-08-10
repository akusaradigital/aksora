import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { db } from "@/lib/db";
import { normalizeRole, getRoleLabel } from "@/lib/roles";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ options: [] }, { status: 401 });
  }

  const { company, isAdmin } = getAccessScope(user);

  try {
    const rows = await db.query<{ value: string; role: string }>(
      `SELECT DISTINCT COALESCE("name", "email") as value, "role"
       FROM "User"
       WHERE (COALESCE("name", '') != '' OR COALESCE("email", '') != '') AND "deletedAt" IS NULL
       ${isAdmin ? "" : ' AND "company" = ?'}
       ORDER BY COALESCE("name", "email") ASC
       LIMIT 50`,
      isAdmin ? [] : [company],
    );

    const options = rows
      .map((row) => {
        const name = String(row.value ?? "").trim();
        const role = normalizeRole(String(row.role ?? "").trim());
        return {
          value: name,
          label: role ? `${name} (${getRoleLabel(role)})` : name,
        };
      })
      .filter((row) => Boolean(row.value));

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Dashboard members error:", error);
    return NextResponse.json({ options: [] });
  }
}
