import { NextResponse } from "next/server";

import { proxyJsonCommand } from "@/lib/investigation-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/investigations/[investigationId]/continuation">,
): Promise<NextResponse> {
  const { investigationId } = await context.params;
  const response = await proxyJsonCommand(
    investigationId,
    "/continuation",
    await request.text(),
  );
  return new NextResponse(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}
