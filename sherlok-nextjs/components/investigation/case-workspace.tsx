"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AnalysisDossier } from "@/components/investigation/analysis-dossier";
import { CaseOverview } from "@/components/investigation/case-overview";
import { CaseNavigation } from "@/components/investigation/case-navigation";
import { TimelineDossier } from "@/components/investigation/timeline-dossier";
import type { components } from "@/lib/generated/investigation-api.v1";
import { asInvestigationSnapshot, asSafeTransportFailure, safeFailureMessage } from "@/lib/investigation-contract";

type Snapshot = components["schemas"]["InvestigationSnapshot"];
type CaseFile = components["schemas"]["CaseFile"];
type View = "overview" | "evidence" | "timeline" | "analysis" | "verdict";
type WorkspaceFailure = { title: string; message: string };

export function CaseWorkspace({ investigationId, view }: { investigationId: string; view: View }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [failure, setFailure] = useState<WorkspaceFailure | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/investigations/${encodeURIComponent(investigationId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok) {
          if (!cancelled) setFailure(workspaceFailure(response.status, body));
          return;
        }
        const snapshot = asInvestigationSnapshot(body);
        if (!snapshot) throw new Error("The case file data was incompatible. Refresh and try again.");
        if (!cancelled) setSnapshot(snapshot);
      })
      .catch((error: unknown) => !cancelled && setFailure({ title: "Case file unavailable", message: error instanceof Error ? error.message : "The case file could not be loaded." }));
    return () => { cancelled = true; };
  }, [investigationId]);

  if (failure) return <Notice title={failure.title} message={failure.message} />;
  if (!snapshot) return <Notice title="Loading case file" message="Retrieving the current investigation snapshot…" />;
  if (!snapshot.case_file) return <Notice title="No displayable case file" message="The investigation has not produced a displayable snapshot yet." />;

  return <WorkspaceBody caseFile={snapshot.case_file} investigationId={investigationId} isComplete={snapshot.is_complete} view={view} onSnapshot={setSnapshot} />;
}

function WorkspaceBody({ caseFile, investigationId, isComplete, view, onSnapshot }: { caseFile: CaseFile; investigationId: string; isComplete: boolean; view: View; onSnapshot: (snapshot: Snapshot) => void }) { if (view === "overview") return <CaseOverview caseFile={caseFile} investigationId={investigationId} isComplete={isComplete} />; if (view === "timeline") return <TimelineDossier caseFile={caseFile} investigationId={investigationId} isComplete={isComplete} />; if (view === "analysis") return <AnalysisDossier caseFile={caseFile} investigationId={investigationId} isComplete={isComplete} />;
  return <main className="min-h-screen bg-[#f4e8d0] p-6 text-[#1e2831] sm:p-10"><header className="mx-auto max-w-5xl border-b border-[#b89b6e] pb-5"><p className="text-sm font-semibold uppercase tracking-wide text-[#745022]">Investigation case file</p><h1 className="mt-1 font-serif text-4xl font-semibold">{titleFor(view)}</h1><CaseNavigation currentView={view} investigationId={investigationId} /></header><section className="mx-auto mt-6 max-w-5xl">{view === "overview" && <Overview caseFile={caseFile} />}{view === "evidence" && <Evidence caseFile={caseFile} />}{view === "timeline" && <Timeline caseFile={caseFile} investigationId={investigationId} />}{view === "verdict" && <Verdict caseFile={caseFile} investigationId={investigationId} isComplete={isComplete} onSnapshot={onSnapshot} />}</section></main>;
}

function Overview({ caseFile }: { caseFile: CaseFile }) { return <section><h2 className="font-serif text-2xl">Canonical case material</h2><p className="mt-2 whitespace-pre-wrap leading-6">{caseFile.canonical_material || "Case material is still being prepared."}</p><h2 className="mt-8 font-serif text-2xl">Source references</h2><ul className="mt-3 space-y-2">{(caseFile.material_blocks ?? []).map((block) => <li className="rounded border border-[#d8c4a0] bg-[#fbf2de] p-3" key={block.id}><b>{block.source_reference.source_name}</b> · {referenceLabel(block.source_reference)}<p className="mt-1 text-sm">{block.text}</p></li>)}</ul>{warnings(caseFile)}</section>; }
function Evidence({ caseFile }: { caseFile: CaseFile }) { const evidence = caseFile.evidence ?? []; return <section><h2 className="font-serif text-2xl">Collected evidence</h2>{evidence.length === 0 ? <p className="mt-3">Evidence collection is still in progress.</p> : <ul className="mt-4 space-y-3">{evidence.map((item) => <li className="rounded border border-[#d8c4a0] bg-[#fbf2de] p-4" id={`evidence-${item.id}`} key={item.id}><b className="font-mono">{item.id}</b><span className="ml-3 text-sm">{item.classification === "observed_fact" ? "Observed fact" : "Inference"}</span><p className="mt-2">{item.statement}</p><p className="mt-2 text-sm text-[#5c5145]">{item.source_references.map(referenceLabel).join("; ")}</p></li>)}</ul>}</section>; }
function Timeline({ caseFile, investigationId }: { caseFile: CaseFile; investigationId: string }) { const timeline = caseFile.timeline; return <section><h2 className="font-serif text-2xl">Reconciled timeline</h2><ol className="mt-4 space-y-3">{(timeline?.events ?? []).map((event) => <li className="rounded border border-[#d8c4a0] bg-[#fbf2de] p-4" key={`${event.order}-${event.statement}`}><b>{event.time ?? "Time not established"}</b><p>{event.statement}</p><EvidenceLinks ids={event.evidence_ids} investigationId={investigationId} /></li>)}</ol><h2 className="mt-8 font-serif text-2xl">Open timeline issues</h2><ul className="mt-3 space-y-3">{(timeline?.issues ?? []).map((issue) => <li className="rounded border border-[#b3261e] bg-[#fce5db] p-4" key={issue.statement}><b>{issue.kind}</b><p>{issue.statement}</p><EvidenceLinks ids={issue.evidence_ids} investigationId={investigationId} /></li>)}</ul></section>; }
function Verdict({ caseFile, investigationId, isComplete, onSnapshot }: { caseFile: CaseFile; investigationId: string; isComplete: boolean; onSnapshot: (snapshot: Snapshot) => void }) { const router = useRouter(); const verdict = caseFile.verdict; const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null); if (!verdict) return isComplete ? <Notice title="No proposed Verdict" message="The investigation completed without a proposed Verdict." /> : <Notice title="Verdict pending" message="The Lead Detective has not submitted a proposed Verdict yet." />; async function command(path: "decision" | "reinvestigation", body: object) { setBusy(true); setMessage(null); try { const response = await fetch(`/api/investigations/${encodeURIComponent(investigationId)}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const result: unknown = await response.json(); if (!response.ok) throw new Error(messageFrom(result)); const snapshot = asInvestigationSnapshot(result); if (!snapshot) throw new Error("The returned case file was incompatible. Refresh and try again."); onSnapshot(snapshot); if (path === "reinvestigation") { router.push(`/agent-workspace?investigation_id=${encodeURIComponent(investigationId)}`); return; } setMessage("Human decision recorded."); } catch (error) { setMessage(error instanceof Error ? error.message : "The command could not be recorded."); } finally { setBusy(false); } } return <section><p className="text-sm font-semibold uppercase tracking-wide text-[#745022]">Proposed verdict · {verdict.review_status.replaceAll("_", " ")}</p><h2 className="mt-2 font-serif text-3xl">Confidence: {verdict.confidence}</h2><ol className="mt-5 space-y-4">{verdict.conclusions.map((conclusion) => <li className="rounded border border-[#d8c4a0] bg-[#fbf2de] p-4" key={conclusion.rank}><b>#{conclusion.rank}: {conclusion.suspect}</b><p className="mt-2">{conclusion.explanation}</p><EvidenceLinks ids={conclusion.evidence_ids} investigationId={investigationId} /></li>)}</ol><h3 className="mt-8 font-serif text-2xl">What remains uncertain</h3><ul className="mt-2 list-disc pl-5">{verdict.limitations.map((item) => <li key={item}>{item}</li>)}</ul>{verdict.review_status === "awaiting_review" && <div className="mt-8 flex flex-wrap gap-3"><button className="rounded bg-[#006b54] px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void command("decision", { action: "accept" })}>Accept proposal</button><button className="rounded border border-[#745022] px-4 py-2 font-semibold disabled:opacity-50" disabled={busy} onClick={() => void command("decision", { action: "reject" })}>Reject proposal</button><label className="flex flex-1 gap-2"><span className="sr-only">Guidance note</span><input className="min-w-56 flex-1 rounded border border-[#745022] px-3" onChange={(event) => setNote(event.target.value)} placeholder="Required guidance note" value={note} /><button className="rounded bg-[#7b4696] px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy || !note.trim()} onClick={() => void command("reinvestigation", { note: note.trim() })}>Request re-investigation</button></label></div>}{message && <p className="mt-4" role="status">{message}</p>}</section>; }
function EvidenceLinks({ ids, investigationId }: { ids: string[]; investigationId: string }) { return <p className="mt-2 flex flex-wrap gap-2">{ids.map((id) => <Link className="rounded bg-[#d8d3ca] px-2 py-1 font-mono text-xs hover:underline" href={`/case/evidence?investigation_id=${encodeURIComponent(investigationId)}#evidence-${encodeURIComponent(id)}`} key={id}>{id}</Link>)}</p>; }
function Notice({ title, message }: { title: string; message: string }) { return <main className="grid min-h-screen place-items-center bg-[#f4e8d0] p-6 text-center text-[#1e2831]"><div><h1 className="font-serif text-3xl">{title}</h1><p className="mt-3">{message}</p></div></main>; }
function warnings(caseFile: CaseFile) { return caseFile.material_warnings?.length ? <aside className="mt-6 rounded border border-[#b3261e] bg-[#fce5db] p-4"><b>Material warnings</b><ul className="mt-2 list-disc pl-5">{caseFile.material_warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></aside> : null; }
function referenceLabel(reference: components["schemas"]["SourceReference"]) { return [reference.heading, reference.page && `page ${reference.page}`, reference.paragraph && `paragraph ${reference.paragraph}`, reference.list_position].filter(Boolean).join(" · ") || "Source location available"; }
function titleFor(view: View) { return ({ overview: "Case overview", evidence: "Evidence", timeline: "Timeline", analysis: "Analysis", verdict: "Proposed verdict" })[view]; }
function caseHref(view: View, investigationId: string) { return `/case/${view}?investigation_id=${encodeURIComponent(investigationId)}`; }
function messageFrom(value: unknown) { return safeFailureMessage(value, "The case file could not be loaded."); }

function workspaceFailure(status: number, value: unknown): WorkspaceFailure { const transportFailure = asSafeTransportFailure(value); const message = transportFailure ? `${transportFailure.detail.message} ${transportFailure.detail.recovery_action}` : messageFrom(value); return status === 404 ? { title: "Investigation not found", message } : { title: "Case file unavailable", message }; }
