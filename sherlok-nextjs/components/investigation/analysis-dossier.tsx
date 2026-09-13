"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CaseNavigation } from "@/components/investigation/case-navigation";
import type { components } from "@/lib/generated/investigation-api.v1";

type CaseFile = components["schemas"]["CaseFile"];
type Claim = components["schemas"]["Claim"];
type SkepticFinding = components["schemas"]["SkepticFinding"];

type ClaimGroup = "motive" | "opportunity";

type ClaimLocation = {
  claimIndex: number;
  group: ClaimGroup;
  profileIndex: number;
};

type ClaimTarget = {
  claim: Claim;
  domId: string;
  location: ClaimLocation;
};

type AnalysisDossierProps = {
  caseFile: CaseFile;
  investigationId: string;
  isComplete: boolean;
};

export function AnalysisDossier({ caseFile, investigationId, isComplete }: AnalysisDossierProps) {
  const claims = useMemo(() => collectClaims(caseFile), [caseFile]);
  const [selectedClaimDomId, setSelectedClaimDomId] = useState(claims[0]?.domId ?? null);
  const [activeView, setActiveView] = useState<"profiles" | "skeptic">("profiles");
  const selectedClaim = claims.find((target) => target.domId === selectedClaimDomId) ?? null;
  const revisionIsReported = caseFile.revised_specialists?.includes("suspect_analyst") ?? false;

  function focusClaim(target: ClaimTarget) {
    setActiveView("profiles");
    setSelectedClaimDomId(target.domId);
    window.requestAnimationFrame(() => document.getElementById(target.domId)?.focus());
  }

  return (
    <main className="min-h-screen bg-[#f4e8d0] p-6 text-[#1e2831] sm:p-10">
      <header className="mx-auto max-w-6xl border-b border-[#b89b6e] pb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#745022]">Investigation case file</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold">Analysis</h1>
        <p className="mt-2 text-[#5c5145]">Inspect suspect Claims and Skeptic findings from this Case File.</p>
        <CaseNavigation currentView="analysis" investigationId={investigationId} />
      </header>

      <section className="mx-auto mt-6 max-w-6xl">
        {revisionIsReported ? <p className="rounded border border-[#8b5aa5] bg-[#f2e5f4] p-3 text-[#5a2378]" role="status">Suspect analysis has a reported revision.</p> : null}
        <div className="mt-6 flex gap-3 border-b border-[#b89b6e]" role="tablist" aria-label="Analysis views">
          <ViewTab active={activeView === "profiles"} label="Suspect profiles" panelId="suspect-profiles-panel" tabId="suspect-profiles-tab" onSelect={() => setActiveView("profiles")} />
          <ViewTab active={activeView === "skeptic"} label="Skeptic review" panelId="skeptic-review-panel" tabId="skeptic-review-tab" onSelect={() => setActiveView("skeptic")} />
        </div>

        {activeView === "profiles" ? (
          <Profiles
            caseFile={caseFile}
            claims={claims}
            investigationId={investigationId}
            isComplete={isComplete}
            selectedClaimDomId={selectedClaim?.domId ?? null}
            onSelect={setSelectedClaimDomId}
          />
        ) : (
          <SkepticReviews claims={claims} isComplete={isComplete} reviews={caseFile.skeptic_reviews ?? []} onFocusClaim={focusClaim} />
        )}
      </section>
    </main>
  );
}

function ViewTab({ active, label, panelId, tabId, onSelect }: { active: boolean; label: string; panelId: string; tabId: string; onSelect: () => void }) {
  return (
    <button
      aria-selected={active}
      aria-controls={panelId}
      className={`border-b-4 px-3 py-2 font-semibold ${active ? "border-[#006b54]" : "border-transparent"}`}
      onClick={onSelect}
      id={tabId}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
}

function Profiles({ caseFile, claims, investigationId, isComplete, selectedClaimDomId, onSelect }: {
  caseFile: CaseFile;
  claims: ClaimTarget[];
  investigationId: string;
  isComplete: boolean;
  selectedClaimDomId: string | null;
  onSelect: (id: string) => void;
}) {
  const profiles = caseFile.suspect_profiles ?? [];

  if (profiles.length === 0) {
    return <EmptyAnalysis hasSkepticReviews={(caseFile.skeptic_reviews?.length ?? 0) > 0} isComplete={isComplete} />;
  }

  return (
    <div aria-labelledby="suspect-profiles-tab" className="mt-6 grid gap-5 lg:grid-cols-2" id="suspect-profiles-panel" role="tabpanel">
      {profiles.map((profile, profileIndex) => (
        <article className="rounded border border-[#d8c4a0] bg-[#fbf2de] p-5" key={`${profile.suspect}-${profileIndex}`}>
          <h2 className="font-serif text-2xl font-semibold">{profile.suspect}</h2>
          <ClaimGroup claims={claims} investigationId={investigationId} group="motive" profileIndex={profileIndex} selectedClaimDomId={selectedClaimDomId} onSelect={onSelect} />
          <ClaimGroup claims={claims} investigationId={investigationId} group="opportunity" profileIndex={profileIndex} selectedClaimDomId={selectedClaimDomId} onSelect={onSelect} />
        </article>
      ))}
    </div>
  );
}

function EmptyAnalysis({ hasSkepticReviews, isComplete }: { hasSkepticReviews: boolean; isComplete: boolean }) {
  const message = hasSkepticReviews
    ? "No suspect profiles are available. Skeptic findings are available in the Skeptic review tab."
    : isComplete
      ? "No suspect profiles or Skeptic findings are available for this Case File."
      : "Suspect profiles and Skeptic review are still being prepared.";

  return <p aria-labelledby="suspect-profiles-tab" className="mt-6 rounded border border-[#d8c4a0] bg-[#fbf2de] p-5" id="suspect-profiles-panel" role="tabpanel">{message}</p>;
}

function ClaimGroup({ claims, investigationId, group, profileIndex, selectedClaimDomId, onSelect }: {
  claims: ClaimTarget[];
  investigationId: string;
  group: ClaimGroup;
  profileIndex: number;
  selectedClaimDomId: string | null;
  onSelect: (id: string) => void;
}) {
  const groupClaims = claims.filter((target) => target.location.group === group && target.location.profileIndex === profileIndex);

  return (
    <section className="mt-5">
      <h3 className="font-serif text-xl font-semibold">{readableValue(group)}</h3>
      {groupClaims.length ? (
        <ul className="mt-3 space-y-3">
          {groupClaims.map((target) => (
            <li className={`rounded border p-4 ${target.domId === selectedClaimDomId ? "border-[#006b54] bg-[#d5f0e8]" : "border-[#d8c4a0]"}`} key={target.domId}>
              <button
                aria-label={`Inspect claim: ${target.claim.statement}`}
                className="w-full text-left font-semibold focus:outline-none focus:ring-2 focus:ring-[#006b54]"
                id={target.domId}
                onClick={() => onSelect(target.domId)}
                type="button"
              >
                {target.claim.statement}
              </button>
              <p className="mt-2 text-sm"><strong>Status:</strong> {claimStatus(target.claim)}</p>
              <EvidenceLinks evidenceIds={target.claim.evidence_ids} investigationId={investigationId} />
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-[#5c5145]">No {group} Claims were reported.</p>}
    </section>
  );
}

function SkepticReviews({ claims, isComplete, reviews, onFocusClaim }: {
  claims: ClaimTarget[];
  isComplete: boolean;
  reviews: components["schemas"]["SkepticReview"][];
  onFocusClaim: (target: ClaimTarget) => void;
}) {
  if (reviews.length === 0) {
    const message = isComplete
      ? "No Skeptic reviews were reported for this Case File."
      : "Skeptic review has not started yet.";
    return <p className="mt-6 rounded border border-[#d8c4a0] bg-[#fbf2de] p-5" role="status">{message}</p>;
  }

  return (
    <div aria-labelledby="skeptic-review-tab" className="mt-6 space-y-4" id="skeptic-review-panel" role="tabpanel">
      {reviews.map((review, reviewIndex) => (
        <section className="rounded border border-[#d8c4a0] bg-[#fbf2de] p-5" key={reviewIndex}>
          <h2 className="font-serif text-2xl font-semibold">Review outcome: {readableValue(review.outcome)}</h2>
          {review.findings.length ? review.findings.map((finding, findingIndex) => (
            <SkepticFindingCard finding={finding} key={`${finding.specialist}-${finding.claim}-${findingIndex}`} target={findExactClaimTarget(claims, finding)} onFocusClaim={onFocusClaim} />
          )) : <p className="mt-3">No findings were reported for this review.</p>}
        </section>
      ))}
    </div>
  );
}

function SkepticFindingCard({ finding, target, onFocusClaim }: {
  finding: SkepticFinding;
  target: ClaimTarget | null;
  onFocusClaim: (target: ClaimTarget) => void;
}) {
  return (
    <article className="mt-4 rounded border border-[#b89b6e] p-4">
      <h3 className="font-semibold">{readableValue(finding.specialist)} · {readableValue(finding.kind)}</h3>
      <p className="mt-2"><strong>Claim:</strong> {finding.claim}</p>
      <p className="mt-2">{finding.explanation}</p>
      {target ? <button className="mt-3 rounded border border-[#006b54] px-3 py-2 font-semibold text-[#006b54] hover:bg-[#d5f0e8]" onClick={() => onFocusClaim(target)} type="button">Focus matching claim: {finding.claim}</button> : null}
    </article>
  );
}

function EvidenceLinks({ evidenceIds, investigationId }: { evidenceIds: string[]; investigationId: string }) {
  if (evidenceIds.length === 0) {
    return <p className="mt-3 text-sm text-[#5c5145]">No cited Evidence is available.</p>;
  }

  return (
    <p className="mt-3 flex flex-wrap gap-2 text-sm">
      {evidenceIds.map((evidenceId) => (
        <Link className="rounded bg-[#e7dfce] px-2 py-1 font-mono hover:underline" href={`/case/evidence?investigation_id=${encodeURIComponent(investigationId)}#evidence-${encodeURIComponent(evidenceId)}`} key={evidenceId}>{evidenceId}</Link>
      ))}
    </p>
  );
}

function collectClaims(caseFile: CaseFile): ClaimTarget[] {
  return (caseFile.suspect_profiles ?? []).flatMap((profile, profileIndex) => [
    ...profile.motive.map((claim, claimIndex) => createClaimTarget(claim, { claimIndex, group: "motive", profileIndex })),
    ...profile.opportunity.map((claim, claimIndex) => createClaimTarget(claim, { claimIndex, group: "opportunity", profileIndex })),
  ]);
}

function createClaimTarget(claim: Claim, location: ClaimLocation): ClaimTarget {
  return { claim, domId: `claim-${location.profileIndex}-${location.group}-${location.claimIndex}`, location };
}

function findExactClaimTarget(claims: ClaimTarget[], finding: SkepticFinding) {
  const matchingClaims = claims.filter((target) => target.claim.statement === finding.claim);
  return matchingClaims.length === 1 ? matchingClaims[0] : null;
}

function claimStatus(claim: Claim) {
  return claim.status === "supported" ? "Supported" : "Unresolved";
}

function readableValue(value: string) {
  return value.replaceAll("_", " ");
}
