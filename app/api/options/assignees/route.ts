import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAssigneeOptions } from "@/lib/data";

/**
 * Returns up to 50 workspace members eligible for assignment.
 * Used by dashboard quick-action assignment dropdown.
 * Company-scoped via getAssigneeOptions().
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const options = await getAssigneeOptions();
    const trimmed = options.slice(0, 50).map((option) => ({
      value: option.value,
      label: option.label,
    }));
    return NextResponse.json({ options: trimmed });
  } catch (error) {
    console.error("Assignee options error:", error);
    return NextResponse.json({ options: [] }, { status: 200 });
  }
}
