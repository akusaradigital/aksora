import { NextRequest, NextResponse } from "next/server";
import { generateOpenApiSpec } from "@/lib/openapi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  return NextResponse.json(generateOpenApiSpec(baseUrl));
}
