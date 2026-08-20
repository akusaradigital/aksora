import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isManagementAdmin } from "@/lib/roles";
import { exportDictionary, validateTranslationDictionary } from "@/lib/i18n/export-import";
import type { Locale } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get("locale") || "en") as Locale;

  if (locale !== "en" && locale !== "id") {
    return NextResponse.json({ error: "Invalid locale: must be 'en' or 'id'" }, { status: 400 });
  }

  try {
    const data = exportDictionary(locale);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("I18n export error:", error);
    return NextResponse.json({ error: "Failed to export dictionary" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { locale = "en", dictionary } = body as { locale?: Locale; dictionary?: unknown };
    const payloadToValidate = dictionary !== undefined ? dictionary : body;

    const validation = validateTranslationDictionary(payloadToValidate, locale === "id" ? "id" : "en");
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Translation dictionary validation failed",
          details: validation,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      data: {
        valid: true,
        summary: {
          extraKeysCount: validation.extraKeys.length,
          missingKeysCount: validation.missingKeys.length,
        },
      },
    });
  } catch (error) {
    console.error("I18n import error:", error);
    return NextResponse.json({ error: "Invalid JSON or request format" }, { status: 400 });
  }
}
