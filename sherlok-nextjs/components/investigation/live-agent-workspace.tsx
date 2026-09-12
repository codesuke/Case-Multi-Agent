"use client";

import { useEffect, useState } from "react";

type Event = { event_id: number; event_type: string; stage: string; status: string; message?: string | null; specialist?: string | null };
type Snapshot = { investigation_id: string; is_complete: boolean; case_file: unknown | null };

export function LiveAgentWorkspace({ investigationId }: { investigationId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch(`/api/investigations/${encodeURIComponent(investigationId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) { setFailure(data.detail?.message ?? "The investigation could not be loaded."); return; }
      if (active) setSnapshot(data);
    }
    void load().catch(() => setFailure("The investigation could not be loaded."));
    const source = new EventSource(`/api/investigations/${encodeURIComponent(investigationId)}/events`);
    const receive = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as Event;
      setEvents((current) => current.some((item) => item.event_id === event.event_id) ? current : [...current, event]);
      if (event.status === "failed") setFailure(event.message ?? "The investigation stopped.");
    };
    ["validation_error", "configuration_validated", "case_material_curation_started", "case_material_curation_completed", "evidence_collection_started", "evidence_collection_completed", "suspect_analysis_started", "suspect_analysis_completed", "timeline_reconciliation_started", "timeline_reconciliation_completed", "skeptic_review_started", "skeptic_review_approved", "skeptic_review_revision_requested", "skeptic_review_exhausted", "specialist_revision_started", "specialist_revision_completed", "lead_detective_started", "lead_detective_completed", "reinvestigation_requested", "step_failed", "investigation_failed", "human_decision_recorded"].forEach((type) => source.addEventListener(type, receive));
    source.onerror = () => source.close();
    return () => { active = false; source.close(); };
  }, [investigationId]);

  return <main className="min-h-screen bg-[#24160e] p-6 text-[#f8ebd2]"><h1 className="font-serif text-4xl">Agent Workspace</h1><p className="mt-2" role="status">{failure ?? (snapshot?.is_complete ? "Investigation completed" : "Investigation in progress")}</p>{failure && <p className="mt-4 rounded border border-red-300 bg-red-950/40 p-3" role="alert">{failure}</p>}<ol className="mt-6 space-y-3" aria-live="polite">{events.map((event) => <li key={event.event_id} className="rounded border border-[#745022] p-4"><b>{event.stage}</b> — {event.status}{event.specialist ? ` (${event.specialist})` : ""}{event.message ? `: ${event.message}` : ""}</li>)}</ol></main>;
}
