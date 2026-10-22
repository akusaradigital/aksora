import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loginSicmundus, getSicmundusTasks, getPresetTasks } from "@/lib/sicmundus";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") || undefined;
  const password = searchParams.get("password") || undefined;

  try {
    const auth = await loginSicmundus(username, password);
    const tasks = await getSicmundusTasks(auth.token, auth.user.id);
    return NextResponse.json({
      data: {
        tasks,
        user: auth.user,
      },
    });
  } catch (err) {
    console.warn("Sicmundus tasks route warning:", err);
    // Return fallback preset tasks so UI remains functional even without live connection
    return NextResponse.json({
      data: {
        tasks: getPresetTasks(),
        warning: err instanceof Error ? err.message : "Using preset Sicmundus tasks",
      },
    });
  }
}
