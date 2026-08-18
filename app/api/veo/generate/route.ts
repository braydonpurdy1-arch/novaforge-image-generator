import { NextRequest } from "next/server";
import { requireGatewayAuth } from "@/lib/auth";
import { startVeoJob } from "@/lib/veo";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = requireGatewayAuth(request);
  if (authError) return authError;

  try {
    const input = await request.json();
    const result = await startVeoJob(input);
    const statusUrl = new URL("/api/veo/status", request.url);
    statusUrl.searchParams.set("operation", result.operation);

    return Response.json({
      ...result,
      statusUrl: statusUrl.toString(),
    }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start Veo generation.";
    return Response.json({ error: message }, { status: 400 });
  }
}
