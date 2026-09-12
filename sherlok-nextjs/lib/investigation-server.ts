import "server-only";

import {
  asSafeTransportFailure,
  asStartedInvestigation,
  transportFailure,
  type SafeTransportFailure,
  type StartInvestigationResult,
} from "@/lib/investigation-contract";

export type InvestigationCommandResult = {
  body: StartInvestigationResult | SafeTransportFailure;
  status: number;
};

const PYTHON_API_URL_ENV = "SHERLOK_PYTHON_API_URL";
const SERVICE_FAILURE = transportFailure(
  "investigation_service",
  "The investigation service is unavailable.",
  "Wait a moment and try again.",
);

export async function startInvestigation(
  material: FormData,
): Promise<InvestigationCommandResult> {
  const response = await fetch(`${pythonApiUrl()}/v1/investigations`, {
    method: "POST",
    body: material,
    cache: "no-store",
  });
  const body = await safeJson(response);

  const started = asStartedInvestigation(body);
  if (response.ok && started) {
    return { body: started, status: response.status };
  }
  const failure = asSafeTransportFailure(body);
  if (failure) {
    return { body: failure, status: response.status };
  }
  return { body: SERVICE_FAILURE, status: 502 };
}

export async function proxyInvestigationRequest(
  investigationId: string,
  suffix = "",
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(
      `${pythonApiUrl()}/v1/investigations/${encodeURIComponent(investigationId)}${suffix}`,
      { cache: "no-store", ...init },
    );
  } catch {
    return Response.json(SERVICE_FAILURE, { status: 503 });
  }
}

export async function proxyJsonCommand(
  investigationId: string,
  suffix: "/decision" | "/reinvestigation",
  body: string,
): Promise<Response> {
  return proxyInvestigationRequest(investigationId, suffix, {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

function pythonApiUrl(): string {
  const apiUrl = process.env[PYTHON_API_URL_ENV];
  if (!apiUrl) {
    throw new Error(`${PYTHON_API_URL_ENV} is not configured.`);
  }
  return apiUrl.replace(/\/$/, "");
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
