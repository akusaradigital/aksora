import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(sessionCookieName(), "", cookieOptions);
  response.cookies.set("aksora_session", "", cookieOptions);
  response.cookies.set("qa_token", "", cookieOptions);
  return response;
}
