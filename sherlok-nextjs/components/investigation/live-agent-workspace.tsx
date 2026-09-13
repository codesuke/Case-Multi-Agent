"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { components } from "@/lib/generated/investigation-api.v1";
import {
  asInvestigationSnapshot,
  asPublicInvestigationEvent,
  asSafeTransportFailure,
  safeFailureMessage,
} from "@/lib/investigation-contract";

type Snapshot = components["schemas"]["InvestigationSnapshot"];
type InvestigationEvent = components["schemas"]["PublicInvestigationEvent"];
type WorkflowStatus =
  | "queued"
  | "working"
  | "completed"
  | "revising"
  | "failed"
  | "awaiting_review";
type WorkflowStep = { label: string; stages: string[]; specialist?: string };
type Recommendation = {
  id: string;
  rank: number;
  question: string;
  expected_value: string;
  evidence_ids: string[];
};
type ContinuationCommand =
  | { recommendation_id: string }
  | { guidance_note: string };

const MAX_STREAM_RECONNECTS = 1;
const MAX_FOLLOW_UP_RECOMMENDATIONS = 5;
const MIN_FOLLOW_UP_RECOMMENDATIONS = 2;
const TERMINAL_EVENT_TYPES = new Set([
  "human_decision_recorded",
  "investigation_failed",
  "material_requested",
  "validation_error",
  "step_failed",
]);

const EVENT_TYPES = [
  "validation_error", "configuration_validated", "case_material_curation_started",
  "case_material_curation_completed", "case_structuring_started", "case_structuring_completed",
  "evidence_collection_started", "evidence_collection_completed", "suspect_analysis_started",
  "suspect_analysis_completed", "timeline_reconciliation_started", "timeline_reconciliation_completed",
  "skeptic_review_started", "skeptic_review_approved", "skeptic_review_revision_requested",
  "skeptic_review_exhausted", "specialist_revision_started", "specialist_revision_completed",
  "lead_detective_started", "lead_detective_completed", "follow_up_planning_started",
  "follow_up_planning_completed", "continuation_requested", "material_requested",
  "reinvestigation_requested", "step_failed", "investigation_failed", "human_decision_recorded",
] as const;

const WORKFLOW_STEPS: WorkflowStep[] = [
  { label: "Case File Curator", stages: ["case_material_curation"] },
  { label: "Case Structurer", stages: ["case_structuring"] },
  { label: "Evidence Collector", stages: ["evidence_collection"] },
  { label: "Suspect Analyst", stages: ["suspect_analysis", "specialist_revision"], specialist: "suspect_analyst" },
  { label: "Timeline Reconciler", stages: ["timeline_reconciliation", "specialist_revision"], specialist: "timeline_reconciler" },
  { label: "Skeptic", stages: ["skeptic_review"] },
  { label: "Lead Detective", stages: ["lead_detective"] },
  { label: "Follow-up Planner", stages: ["follow_up_planning"] },
  { label: "Human review", stages: ["human_review", "lead_detective"] },
];

export function LiveAgentWorkspace({ investigationId }: { investigationId: string }) {
  return <LiveWorkspaceForInvestigation key={investigationId} investigationId={investigationId} />;
}

function LiveWorkspaceForInvestigation({ investigationId }: { investigationId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<InvestigationEvent[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [streamNotice, setStreamNotice] = useState<string | null>(null);
  const [streamGeneration, setStreamGeneration] = useState(0);
  const latestEventId = useRef(0);
  const streamRetries = useRef(0);

  const loadSnapshot = useCallback(async () => {
    const response = await fetch(`/api/investigations/${encodeURIComponent(investigationId)}`, { cache: "no-store" });
    const body = await readJson(response);
    const nextSnapshot = asInvestigationSnapshot(body);
    if (!response.ok || !nextSnapshot) throw new Error(messageFrom(body));
    setSnapshot(nextSnapshot);
    return nextSnapshot;
  }, [investigationId]);

  useEffect(() => {
    let active = true;
    let source: EventSource | null = null;
    async function refresh() {
      try {
        return await loadSnapshot();
      } catch (error) {
        if (active) setFailure(error instanceof Error ? error.message : "The investigation could not be loaded.");
        return null;
      }
    }
    function receive(message: MessageEvent<string>) {
      try {
        const event = asPublicInvestigationEvent(JSON.parse(message.data));
        if (!event) throw new Error("Invalid investigation event");
        if (!active || event.event_id <= latestEventId.current) return;
        const missedEvent = event.event_id > latestEventId.current + 1;
        latestEventId.current = event.event_id;
        setEvents((current) => [...current, event]);
        if (event.status === "failed") setFailure(failureFromEvent(event));
        if (missedEvent) setStreamNotice("Some live updates were missed. The latest snapshot was requested.");
        if (missedEvent || isTerminalEvent(event)) void refresh();
      } catch {
        setStreamNotice("A live update could not be read. The latest snapshot was requested.");
        void refresh();
      }
    }
    async function reconnectAfterStreamError() {
      const refreshed = await refresh();
      if (!active || !refreshed || refreshed.is_complete || streamRetries.current >= MAX_STREAM_RECONNECTS) return;
      streamRetries.current += 1;
      void connect();
    }
    async function connect() {
      try {
        await loadSnapshot();
        if (!active) return;
        source = new EventSource(`/api/investigations/${encodeURIComponent(investigationId)}/events?after_event_id=${latestEventId.current}`);
        for (const type of EVENT_TYPES) source.addEventListener(type, receive);
        source.onerror = () => {
          source?.close();
          if (!active) return;
          setStreamNotice("The live event stream closed. The current snapshot was refreshed.");
          void reconnectAfterStreamError();
        };
      } catch (error) {
        if (active) setFailure(error instanceof Error ? error.message : "The investigation could not be loaded.");
      }
    }
    void connect();
    return () => { active = false; source?.close(); };
  }, [investigationId, loadSnapshot, streamGeneration]);

  if (!snapshot) {
    return failure
      ? <WorkspaceNotice message={failure} title="Investigation unavailable" tone="error" />
      : <WorkspaceNotice message="Retrieving the current Investigation Snapshot…" title="Loading Agent Workspace" tone="status" />;
  }

  async function requestContinuation(body: ContinuationCommand) {
    const response = await fetch(`/api/investigations/${encodeURIComponent(investigationId)}/continuation`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const responseBody = await readJson(response);
    const nextSnapshot = asInvestigationSnapshot(responseBody);
    if (!response.ok || !nextSnapshot) return safeFailureMessage(responseBody, "The continuation could not be requested.");
    setSnapshot(nextSnapshot);
    setFailure(null);
    setStreamGeneration((generation) => generation + 1);
    return "Continuation requested. The workspace will show progress shortly.";
  }

  const currentStatus = failure ?? (snapshot?.is_complete ? "Investigation completed" : "Investigation in progress");
  return (
    <main className="min-h-screen bg-[#24160e] p-6 text-[#f8ebd2] sm:p-10">
      <header className="mx-auto max-w-4xl border-b border-[#745022] pb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#f4b941]">Live investigation</p>
        <h1 className="mt-1 font-serif text-4xl">Agent Workspace</h1>
        <p className="mt-3" role="status">{currentStatus}</p>
        {snapshot?.case_file && <Link className="mt-4 inline-block font-semibold text-[#9ce3d4] underline" href={`/case/overview?investigation_id=${encodeURIComponent(investigationId)}`}>Open Case File</Link>}
      </header>
      {failure && <p className="mx-auto mt-6 max-w-4xl rounded border border-red-300 bg-red-950/40 p-4" role="alert">{failure}</p>}
      {streamNotice && <p className="mx-auto mt-6 max-w-4xl rounded border border-[#f4b941] bg-[#382315] p-4" role="status">{streamNotice}</p>}
      <Workflow events={events} />
      <ActivityFeed events={events} />
      {snapshot?.case_file && <ContinuationChoices caseFile={snapshot.case_file as unknown} onContinue={requestContinuation} />}
    </main>
  );
}

function WorkspaceNotice({ message, title, tone }: { message: string; title: string; tone: "error" | "status" }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#24160e] p-6 text-center text-[#f8ebd2]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#f4b941]">Live investigation</p>
        <h1 className="mt-2 font-serif text-4xl">{title}</h1>
        <p className="mt-3" role={tone === "error" ? "alert" : "status"}>{message}</p>
      </div>
    </main>
  );
}

function ActivityFeed({ events }: { events: InvestigationEvent[] }) {
  return (
    <section className="mx-auto mt-8 max-w-4xl" aria-live="polite">
      <h2 className="font-serif text-2xl">Observable workflow</h2>
      {events.length === 0 ? <p className="mt-3 text-[#e9d8bb]">Waiting for safe investigation events…</p> : (
        <ol className="mt-4 space-y-3">
          {events.map((event) => (
            <li key={event.event_id} className="rounded border border-[#745022] bg-[#382315] p-4">
              <b>{readable(event.stage)}</b> — {readable(event.status)}
              {event.specialist ? ` (${readable(event.specialist)})` : ""}
              {event.message ? `: ${event.message}` : ""}
              <p className="mt-2 text-sm text-[#e9d8bb]">{formatTimestamp(event.timestamp)}</p>
              {event.evidence_ids.length > 0 ? <p className="mt-2 text-sm text-[#e9d8bb]">Evidence: {event.evidence_ids.join(", ")}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ContinuationChoices({ caseFile, onContinue }: { caseFile: unknown; onContinue: (body: ContinuationCommand) => Promise<string> }) {
  const [guidance, setGuidance] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const validRecommendations = isRecord(caseFile) && Array.isArray(caseFile.follow_up_recommendations)
    ? caseFile.follow_up_recommendations.filter(isRecommendation).slice(0, MAX_FOLLOW_UP_RECOMMENDATIONS)
    : [];
  const recommendations = hasSufficientRecommendations(validRecommendations) ? validRecommendations : [];
  async function continueWith(body: ContinuationCommand) { setNotice(await onContinue(body)); }
  return <section className="mx-auto mt-8 max-w-4xl rounded border border-[#745022] bg-[#382315] p-4"><h2 className="font-serif text-2xl">Suggested follow-up</h2>{recommendations.length > 0 ? <ol className="mt-3 space-y-3">{recommendations.map((item) => <li key={item.id}><p><b>{item.rank}. {item.question}</b></p><p className="text-sm text-[#e9d8bb]">Expected value: {item.expected_value} · Evidence: {item.evidence_ids.join(", ")}</p><button className="mt-2 underline" onClick={() => void continueWith({ recommendation_id: item.id })}>Choose this option</button></li>)}</ol> : <p className="mt-3 text-[#e9d8bb]">No justified follow-up recommendation is available.</p>}<label className="mt-5 block">Other Guidance note<textarea className="mt-2 block w-full text-[#24160e]" value={guidance} onChange={(event) => setGuidance(event.target.value)} /></label><button className="mt-2 underline" disabled={!guidance.trim()} onClick={() => void continueWith({ guidance_note: guidance })}>Continue with guidance</button>{notice && <p className="mt-3" role="status">{notice}</p>}</section>;
}

function Workflow({ events }: { events: InvestigationEvent[] }) {
  return (
    <section className="mx-auto mt-6 max-w-4xl" aria-labelledby="workflow-heading">
      <h2 id="workflow-heading" className="font-serif text-2xl">Workflow stages</h2>
      <p className="mt-2 text-sm text-[#e9d8bb]">The two specialist paths run independently before Skeptic review.</p>
      <ol className="mt-4 grid gap-3 md:grid-cols-2">
        {WORKFLOW_STEPS.map((step) => <WorkflowStepCard key={step.label} step={step} status={statusFor(step, events)} />)}
      </ol>
    </section>
  );
}

function WorkflowStepCard({ step, status }: { step: WorkflowStep; status: WorkflowStatus }) {
  return (
    <li className="rounded border border-[#745022] bg-[#382315] p-4">
      <p className="font-semibold">{step.label}</p>
      <p className="mt-1 text-sm text-[#e9d8bb]">{readable(status)}</p>
    </li>
  );
}

function statusFor(step: WorkflowStep, events: InvestigationEvent[]): WorkflowStatus {
  const matchingEvents = events.filter((event) => matchesWorkflowStep(event, step));
  const latest = matchingEvents.at(-1);
  if (!latest) return "queued";
  if (isHumanReviewAwaiting(step, latest)) return "awaiting_review";
  return latest.status as WorkflowStatus;
}

async function readJson(response: Response): Promise<unknown> { try { return await response.json(); } catch { return null; } }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isRecommendation(value: unknown): value is Recommendation { return isRecord(value) && typeof value.id === "string" && typeof value.rank === "number" && typeof value.question === "string" && typeof value.expected_value === "string" && Array.isArray(value.evidence_ids) && value.evidence_ids.every((id) => typeof id === "string"); }
function messageFrom(value: unknown): string { const failure = asSafeTransportFailure(value); return failure ? `${failure.detail.message} ${failure.detail.recovery_action}` : "The investigation could not be loaded."; }
function readable(value: string): string { return value.replaceAll("_", " "); }
function hasSufficientRecommendations(items: Recommendation[]): boolean { return items.length >= MIN_FOLLOW_UP_RECOMMENDATIONS; }
function matchesWorkflowStep(event: InvestigationEvent, step: WorkflowStep): boolean { return step.stages.includes(event.stage) && (!step.specialist || !event.specialist || event.specialist === step.specialist); }
function isHumanReviewAwaiting(step: WorkflowStep, event: InvestigationEvent): boolean { return step.label === "Human review" && event.stage === "lead_detective" && event.status === "awaiting_review"; }
function isTerminalEvent(event: InvestigationEvent): boolean { return event.status === "awaiting_review" || event.status === "failed" || TERMINAL_EVENT_TYPES.has(event.event_type); }
function failureFromEvent(event: InvestigationEvent): string { return `The ${readable(event.stage)} stage failed. ${event.message ?? "The investigation stopped."} Review the case material and start a new investigation if the problem remains.`; }
function formatTimestamp(timestamp: string): string { const date = new Date(timestamp); return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString(); }
