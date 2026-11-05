import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loginSicmundus } from "@/lib/sicmundus";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      username?: string;
      password?: string;
    };

    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required for validation" },
        { status: 400 },
      );
    }

    // Authenticate ephemerally with Sicmundus without saving to DB
    const auth = await loginSicmundus(username, password);

    return NextResponse.json({
      success: true,
      message: "Sicmundus credentials validated successfully",
      user: {
        id: auth.user.id,
        name: auth.user.full_name || auth.user.username,
        email: auth.user.email,
      },
    });
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to authenticate with Sicmundus";
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 401 },
    );
  }
}
