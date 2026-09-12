import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ investigationId: string }> },
): Promise<NextResponse> {
  const { investigationId } = await context.params;
  const after = new URL(request.url).searchParams.get("after_event_id") ?? "0";
  try {
    const baseUrl = process.env.SHERLOK_PYTHON_API_URL?.replace(/\/$/, "");
    if (!baseUrl) throw new Error("Python API is not configured.");
    const response = await fetch(
      `${baseUrl}/v1/investigations/${encodeURIComponent(investigationId)}/events?after_event_id=${encodeURIComponent(after)}`,
      { cache: "no-store" },
    );
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "text/event-stream", "cache-control": "no-cache" },
    });
  } catch {
    return NextResponse.json(
      { detail: { stage: "investigation_service", message: "The investigation service is unavailable.", recovery_action: "Wait a moment and try again." } },
      { status: 503 },
    );
  }
}
