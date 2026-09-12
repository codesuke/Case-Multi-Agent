import { NextResponse } from "next/server";

import { proxyInvestigationRequest } from "@/lib/investigation-server";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/investigations/[investigationId]/decision">): Promise<NextResponse> {
  const { investigationId } = await context.params;
  const response = await proxyInvestigationRequest(investigationId, "/decision", {
    method: "POST", body: await request.text(), headers: { "content-type": "application/json" },
  });
  return new NextResponse(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
}
