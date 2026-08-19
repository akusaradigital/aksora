import { resolveApiKey } from "@/lib/api-keys";

export async function authenticateApiRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  return resolveApiKey(match[1].trim());
}
