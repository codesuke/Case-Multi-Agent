import type { components } from "@/lib/generated/investigation-api.v1";

export type StartInvestigationResult =
  components["schemas"]["StartedInvestigation"];
export type SafeTransportFailure = components["schemas"]["TransportFailure"];

export function asStartedInvestigation(
  value: unknown,
): StartInvestigationResult | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "investigation_id" in value &&
    typeof value.investigation_id === "string" &&
    value.investigation_id.length > 0
  ) {
    return value as StartInvestigationResult;
  }
  return null;
}

export function asSafeTransportFailure(
  value: unknown,
): SafeTransportFailure | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "detail" in value &&
    typeof value.detail === "object" &&
    value.detail !== null &&
    "stage" in value.detail &&
    "message" in value.detail &&
    "recovery_action" in value.detail &&
    typeof value.detail.stage === "string" &&
    typeof value.detail.message === "string" &&
    typeof value.detail.recovery_action === "string"
  ) {
    return value as SafeTransportFailure;
  }
  return null;
}

export function transportFailure(
  stage: string,
  message: string,
  recoveryAction: string,
): SafeTransportFailure {
  return { detail: { stage, message, recovery_action: recoveryAction } };
}

export function safeFailureMessage(value: unknown, fallback: string): string {
  const failure = asSafeTransportFailure(value);
  return failure?.detail.message ?? fallback;
}
