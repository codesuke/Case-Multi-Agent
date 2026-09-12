"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { components } from "@/lib/generated/investigation-api.v1";
import { safeFailureMessage } from "@/lib/investigation-contract";

type Snapshot = components["schemas"]["InvestigationSnapshot"];
type InvestigationEvent = components["schemas"]["PublicInvestigationEvent"];

const EVENT_TYPES = [
  "validation_error", "configuration_validated", "case_material_curation_started",
  "case_material_curation_completed", "evidence_collection_started",
  "evidence_collection_completed", "suspect_analysis_started",
  "suspect_analysis_completed", "timeline_reconciliation_started",
  "timeline_reconciliation_completed", "skeptic_review_started",
  "skeptic_review_approved", "skeptic_review_revision_requested",
  "skeptic_review_exhausted", "specialist_revision_started",
  "specialist_revision_completed", "lead_detective_started",
  "lead_detective_completed", "reinvestigation_requested", "step_failed",
  "investigation_failed", "human_decision_recorded",
] as const;

export function LiveAgentWorkspace({ investigationId }: { investigationId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<InvestigationEvent[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [streamNotice, setStreamNotice] = useState<string | null>(null);
  const latestEventId = useRef(0);
  const streamRetries = useRef(0);
  const loadSnapshot = useCallback(async () => {
    const response = await fetch(`/api/investigations/${encodeURIComponent(investigationId)}`, { cache: "no-store" });
    const body: unknown = await response.json();
    if (!response.ok) throw new Error(messageFrom(body));
    const snapshot = body as Snapshot;
    setSnapshot(snapshot);
    return snapshot;
  }, [investigationId]);

  useEffect(() => {
    let active = true;
    let source: EventSource | null = null;
    latestEventId.current = 0;
    streamRetries.current = 0;
    async function refresh(): Promise<Snapshot | null> {
      try {
        return await loadSnapshot();
      } catch (error) {
        if (active) setFailure(error instanceof Error ? error.message : "The investigation could not be loaded.");
        return null;
      }
    }
    function receive(message: MessageEvent<string>) {
      try {
        const event = JSON.parse(message.data) as InvestigationEvent;
        if (!active || event.event_id <= latestEventId.current) return;
        latestEventId.current = event.event_id;
        streamRetries.current = 0;
        setEvents((current) => [...current, event]);
        if (event.status === "failed") setFailure(event.message ?? "The investigation stopped.");
        if (event.status === "failed" || event.status === "awaiting_review") void refresh();
      } catch {
        setStreamNotice("A live update could not be read. The latest snapshot was requested.");
        void refresh();
      }
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
    async function reconnectAfterStreamError() {
      const refreshed = await refresh();
      if (!active || !refreshed || refreshed.is_complete || streamRetries.current >= 1) return;
      streamRetries.current += 1;
      void connect();
    }
    void connect();
    return () => { active = false; source?.close(); };
  }, [investigationId, loadSnapshot]);

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
      <section className="mx-auto mt-6 max-w-4xl" aria-live="polite">
        <h2 className="font-serif text-2xl">Observable workflow</h2>
        {events.length === 0 ? <p className="mt-3 text-[#e9d8bb]">Waiting for safe investigation events…</p> : <ol className="mt-4 space-y-3">{events.map((event) => <li key={event.event_id} className="rounded border border-[#745022] bg-[#382315] p-4"><b>{readable(event.stage)}</b> — {readable(event.status)}{event.specialist ? ` (${readable(event.specialist)})` : ""}{event.message ? `: ${event.message}` : ""}</li>)}</ol>}
      </section>
    </main>
  );
}

function messageFrom(value: unknown): string { return safeFailureMessage(value, "The investigation could not be loaded."); }
function readable(value: string): string { return value.replaceAll("_", " "); }
