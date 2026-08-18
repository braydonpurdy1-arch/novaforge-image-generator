import { NextRequest } from "next/server";
import { requireGatewayAuth } from "@/lib/auth";
import { fetchGeneratedVideo } from "@/lib/veo";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = requireGatewayAuth(request);
  if (authError) return authError;

  try {
    const operation = request.nextUrl.searchParams.get("operation") ?? "";
    const upstream = await fetchGeneratedVideo(operation);

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "video/mp4",
        "content-disposition": "attachment; filename=novaforge-veo.mp4",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to download Veo video.";
    return Response.json({ error: message }, { status: 400 });
  }
}
