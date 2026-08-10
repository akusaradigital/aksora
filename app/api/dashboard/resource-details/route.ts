import { NextResponse } from "next/server";
import { getResourceDetails } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const data = await getResourceDetails(name);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Resource Details API error:", error);
    return NextResponse.json({ error: "Failed to load resource details" }, { status: 500 });
  }
}
