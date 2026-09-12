import { NextResponse } from "next/server";

export async function POST(request: Request, context: { params: Promise<{ investigationId: string }> }): Promise<NextResponse> {
  const { investigationId } = await context.params;
  try {
    const base = process.env.SHERLOK_PYTHON_API_URL?.replace(/\/$/, "");
    if (!base) throw new Error();
    const response = await fetch(`${base}/v1/investigations/${encodeURIComponent(investigationId)}/reinvestigation`, { method: "POST", headers: { "content-type": "application/json" }, body: await request.text(), cache: "no-store" });
    return new NextResponse(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
  } catch { return NextResponse.json({ detail: { stage: "investigation_service", message: "The investigation service is unavailable.", recovery_action: "Wait a moment and try again." } }, { status: 503 }); }
}
