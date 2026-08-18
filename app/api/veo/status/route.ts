import { NextRequest } from "next/server";
import { requireGatewayAuth } from "@/lib/auth";
import { extractVideoUri, getVeoJob } from "@/lib/veo";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = requireGatewayAuth(request);
  if (authError) return authError;

  try {
    const operation = request.nextUrl.searchParams.get("operation") ?? "";
    const job = await getVeoJob(operation);
    const downloadUrl = job?.done && extractVideoUri(job)
      ? new URL(`/api/veo/download?operation=${encodeURIComponent(operation)}`, request.url).toString()
      : null;

    return Response.json({
      operation,
      done: Boolean(job?.done),
      error: job?.error ?? null,
      downloadUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read Veo status.";
    return Response.json({ error: message }, { status: 400 });
  }
}
