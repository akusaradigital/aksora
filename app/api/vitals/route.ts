import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Log vitals for monitoring (can be extended to send to external service)
    logger.info("[WebVital]", {
      meta: {
        name: data.name,
        value: data.value,
        rating: data.rating,
        id: data.id,
        navigationType: data.navigationType,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Always succeed, don't block client
  }
}
