import { NextResponse } from "next/server";
import { getDashboardProjects } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ projects: [] }, { status: 401 });
  const projects = await getDashboardProjects();
  return NextResponse.json({ projects }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}
