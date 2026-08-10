import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, createSessionToken, sessionCookieName } from "@/lib/auth";
import { db } from "@/lib/db";

// Max avatar size: 32KB base64 (results in ~24KB actual image)
const MAX_AVATAR_SIZE = 32 * 1024;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { avatar } = body as { avatar?: string };

    if (!avatar) {
      return NextResponse.json({ error: "Avatar data is required" }, { status: 400 });
    }

    // Validate it's a data URL with image type
    if (!avatar.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    // Check size
    if (avatar.length > MAX_AVATAR_SIZE) {
      return NextResponse.json({ error: "Avatar too large. Max 24KB." }, { status: 400 });
    }

    await db.run(
      'UPDATE "User" SET "avatar" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
      [avatar, user.id]
    );

    // Refresh session token with updated data
    const updatedUser = { id: user.id, name: user.name || "", role: user.role || "qa", company: user.company || "" };
    const response = NextResponse.json({ success: true, avatar });
    response.cookies.set(sessionCookieName(), await createSessionToken(user.email, updatedUser), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 6,
    });
    return response;
  } catch (error) {
    console.error("Avatar Upload Error:", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.run(
      'UPDATE "User" SET "avatar" = \'\', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
      [user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete avatar" }, { status: 500 });
  }
}
