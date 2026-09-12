import { NextResponse } from "next/server";

import "server-only";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ investigationId: string }> },
): Promise<NextResponse> {
  const { investigationId } = await context.params;
  try {
    const response = await fetch(
      `${pythonApiUrl()}/v1/investigations/${encodeURIComponent(investigationId)}`,
      { cache: "no-store" },
    );
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json(
      { detail: { stage: "investigation_service", message: "The investigation service is unavailable.", recovery_action: "Wait a moment and try again." } },
      { status: 503 },
    );
  }
}

function pythonApiUrl(): string {
  const url = process.env.SHERLOK_PYTHON_API_URL;
  if (!url) throw new Error("SHERLOK_PYTHON_API_URL is not configured.");
  return url.replace(/\/$/, "");
}
