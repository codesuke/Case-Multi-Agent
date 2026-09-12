import { NextResponse } from "next/server";

import {
  startInvestigation,
} from "@/lib/investigation-server";
import {
  transportFailure,
  type SafeTransportFailure,
} from "@/lib/investigation-contract";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let material: FormData;
  try {
    material = await request.formData();
  } catch {
    return safeFailure(
      transportFailure(
        "request_validation",
        "The submitted case material could not be read.",
        "Choose the material again and try starting the investigation.",
      ),
      400,
    );
  }

  try {
    const result = await startInvestigation(forwardedMaterial(material));
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return safeFailure(
      transportFailure(
        "investigation_service",
        "The investigation service is unavailable.",
        "Wait a moment and try starting the investigation again.",
      ),
      503,
    );
  }
}

function forwardedMaterial(material: FormData): FormData {
  const forwarded = new FormData();
  copyTextField(material, forwarded, "pasted_material");
  copyTextField(material, forwarded, "provider");
  for (const file of material.getAll("files")) {
    if (file instanceof File) {
      forwarded.append("files", file, file.name);
    }
  }
  return forwarded;
}

function copyTextField(source: FormData, destination: FormData, field: string): void {
  const value = source.get(field);
  if (typeof value === "string") {
    destination.set(field, value);
  }
}

function safeFailure(
  failure: SafeTransportFailure,
  status: number,
): NextResponse<SafeTransportFailure> {
  return NextResponse.json(failure, { status });
}
