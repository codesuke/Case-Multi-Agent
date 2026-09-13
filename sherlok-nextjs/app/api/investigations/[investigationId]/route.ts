import { NextResponse } from "next/server";

import { proxyValidatedSnapshot } from "@/lib/investigation-server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/investigations/[investigationId]">,
): Promise<NextResponse> {
  const { investigationId } = await context.params;
  const response = await proxyValidatedSnapshot(investigationId);
  return new NextResponse(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}
