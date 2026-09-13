import type { components } from "@/lib/generated/investigation-api.v1";

export type StartInvestigationResult =
  components["schemas"]["StartedInvestigation"];
export type SafeTransportFailure = components["schemas"]["TransportFailure"];
export type InvestigationSnapshot = components["schemas"]["InvestigationSnapshot"];
export type PublicInvestigationEvent = components["schemas"]["PublicInvestigationEvent"];

const TRANSPORT_VERSION = "1.0.0";
const STATUSES = new Set(["queued", "working", "completed", "revising", "failed", "awaiting_review"]);
const SPECIALISTS = new Set(["suspect_analyst", "timeline_reconciler"]);

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

/** Runtime boundary for every snapshot before it enters UI state or rendering. */
export function asInvestigationSnapshot(value: unknown): InvestigationSnapshot | null {
  if (!isRecord(value) || value.transport_version !== TRANSPORT_VERSION || !nonEmptyString(value.investigation_id) || typeof value.is_complete !== "boolean") return null;
  if (value.case_file !== null && !isCaseFile(value.case_file)) return null;
  return value as InvestigationSnapshot;
}

/** Runtime boundary for every SSE record before it changes workflow state. */
export function asPublicInvestigationEvent(value: unknown): PublicInvestigationEvent | null {
  if (!isRecord(value) || value.transport_version !== TRANSPORT_VERSION || !positiveInteger(value.event_id) || !nonEmptyString(value.investigation_id) || !nonEmptyString(value.event_type) || !nonEmptyString(value.stage) || !isString(value.timestamp) || !isOneOf(value.status, STATUSES)) return null;
  if (value.message !== undefined && value.message !== null && !isString(value.message)) return null;
  if (!stringArray(value.evidence_ids ?? [])) return null;
  if (value.specialist !== undefined && value.specialist !== null && !isOneOf(value.specialist, SPECIALISTS)) return null;
  return value as PublicInvestigationEvent;
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

function isCaseFile(value: unknown): boolean {
  if (!isRecord(value) || !isString(value.mystery_text) || (value.canonical_material !== null && value.canonical_material !== undefined && !isString(value.canonical_material)) || !array(value.material_blocks, isMaterialBlock) || !stringArray(value.material_warnings) || !stringArray(value.human_notes) || !isRecord(value.source_text) || !stringArray(value.revised_specialists)) return false;
  if (!every(value.source_text, isString) || !array(value.evidence, isEvidence) || !array(value.suspect_profiles, isProfile) || !isTimeline(value.timeline) || !array(value.skeptic_reviews, isReview)) return false;
  if (value.preparation !== null && value.preparation !== undefined && !isPreparation(value.preparation)) return false;
  if (!array(value.follow_up_recommendations ?? [], isRecommendation) || !array(value.prior_verdicts ?? [], isVerdict)) return false;
  return value.verdict === null || value.verdict === undefined || isVerdict(value.verdict);
}
function isPreparation(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.characterization) && array(value.entities, isEntity) && array(value.event_candidates, isEventCandidate) && array(value.relationships, isRelationship) && array(value.conflicts, isPreparationRecord) && array(value.unanswered_questions, isQuestion); }
function isEntity(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.name) && nonEmptyString(value.kind) && array(value.source_references, isSourceReference); }
function isEventCandidate(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.statement) && (value.time_wording === null || value.time_wording === undefined || isString(value.time_wording)) && stringArray(value.entity_ids) && array(value.source_references, isSourceReference); }
function isRelationship(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.subject_entity_id) && nonEmptyString(value.object_entity_id) && nonEmptyString(value.statement) && typeof value.is_observed === "boolean" && array(value.source_references, isSourceReference); }
function isPreparationRecord(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.statement) && array(value.source_references, isSourceReference); }
function isQuestion(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.question) && array(value.source_references, isSourceReference); }
function isRecommendation(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.id) && positiveInteger(value.rank) && nonEmptyString(value.question) && isOneOf(value.action_type, new Set(["request_material", "compare_supplied_material", "scoped_reinvestigation"])) && nonEmptyString(value.expected_value) && nonEmptyString(value.safe_reason) && stringArray(value.evidence_ids) && stringArray(value.unanswered_question_ids) && stringArray(value.conflict_ids); }
function isMaterialBlock(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.kind) && isString(value.text) && isSourceReference(value.source_reference); }
function isEvidence(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.statement) && isOneOf(value.classification, new Set(["observed_fact", "inference"])) && array(value.source_references, isSourceReference); }
function isSourceReference(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.source_name) && nonEmptyString(value.block_id); }
function isProfile(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.suspect) && array(value.motive, isClaim) && array(value.opportunity, isClaim); }
function isClaim(value: unknown): boolean { return isRecord(value) && nonEmptyString(value.statement) && isOneOf(value.status, new Set(["supported", "unknown"])) && stringArray(value.evidence_ids); }
function isTimeline(value: unknown): boolean { return isRecord(value) && array(value.events, isTimelineEvent) && array(value.issues, isTimelineIssue); }
function isTimelineEvent(value: unknown): boolean { return isRecord(value) && isClaim(value) && (value.time === null || isString(value.time)) && (value.order === null || positiveInteger(value.order)); }
function isTimelineIssue(value: unknown): boolean { return isRecord(value) && isOneOf(value.kind, new Set(["gap", "contradiction"])) && nonEmptyString(value.statement) && stringArray(value.evidence_ids); }
function isReview(value: unknown): boolean { return isRecord(value) && isOneOf(value.outcome, new Set(["approved", "revision_requested", "exhausted"])) && array(value.findings, isFinding); }
function isFinding(value: unknown): boolean { return isRecord(value) && isOneOf(value.specialist, SPECIALISTS) && nonEmptyString(value.claim) && isOneOf(value.kind, new Set(["missing_citation", "nonexistent_evidence_id", "unsupported_reasoning"])) && nonEmptyString(value.explanation); }
function isVerdict(value: unknown): boolean { return isRecord(value) && array(value.conclusions, isConclusion) && isNumber(value.confidence) && Number.isInteger(value.confidence) && value.confidence >= 0 && value.confidence <= 100 && stringArray(value.limitations) && isOneOf(value.review_status, new Set(["awaiting_review", "accepted", "rejected", "reinvestigation_requested"])); }
function isConclusion(value: unknown): boolean { return isRecord(value) && positiveInteger(value.rank) && nonEmptyString(value.suspect) && nonEmptyString(value.explanation) && stringArray(value.evidence_ids); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isString(value: unknown): value is string { return typeof value === "string"; }
function isNumber(value: unknown): value is number { return typeof value === "number"; }
function isOneOf(value: unknown, allowed: Set<string>): boolean { return isString(value) && allowed.has(value); }
function nonEmptyString(value: unknown): boolean { return isString(value) && value.length > 0; }
function positiveInteger(value: unknown): boolean { return typeof value === "number" && Number.isInteger(value) && value >= 1; }
function stringArray(value: unknown): boolean { return array(value, isString); }
function array(value: unknown, predicate: (item: unknown) => boolean): boolean { return Array.isArray(value) && value.every(predicate); }
function every(value: Record<string, unknown>, predicate: (item: unknown) => boolean): boolean { return Object.values(value).every(predicate); }
