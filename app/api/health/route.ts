export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    service: "novaforge-image-studios",
    status: "ok",
    veo: Boolean(process.env.GEMINI_API_KEY),
    gatewayAuth: Boolean(process.env.NOVAFORGE_API_TOKEN),
  });
}
