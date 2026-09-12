import { NextResponse } from "next/server";

import { proxyInvestigationRequest } from "@/lib/investigation-server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: RouteContext<"/api/investigations/[investigationId]/events">,
): Promise<NextResponse> {
  const { investigationId } = await context.params;
  const after = new URL(request.url).searchParams.get("after_event_id") ?? "0";
  const response = await proxyInvestigationRequest(investigationId, `/events?after_event_id=${encodeURIComponent(after)}`);
  return new NextResponse(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "text/event-stream", "cache-control": "no-cache, no-transform" },
  });
}
