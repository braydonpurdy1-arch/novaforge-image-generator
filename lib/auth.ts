import { NextRequest } from "next/server";

export function requireGatewayAuth(request: NextRequest): Response | null {
  const expected = process.env.NOVAFORGE_API_TOKEN;
  if (!expected) {
    return Response.json({ error: "NovaForge gateway token is not configured." }, { status: 503 });
  }

  const header = request.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : "";

  if (!provided || provided !== expected) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}
