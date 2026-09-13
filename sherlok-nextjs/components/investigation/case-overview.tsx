"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderOpen,
  Lightbulb,
  Scale,
  ShieldAlert,
  Timer,
  UsersRound,
  Waypoints,
} from "lucide-react";
import Link from "next/link";

import { CanonicalMaterial } from "@/components/investigation/canonical-material";
import { SherlokMark } from "@/components/investigation/sherlok-mark";
import type { components } from "@/lib/generated/investigation-api.v1";

type CaseFile = components["schemas"]["CaseFile"];
type VerdictReviewStatus = components["schemas"]["VerdictReviewStatus"];
type OverviewData = ReturnType<typeof overviewData>;
type CaseOverviewProps = {
  caseFile: CaseFile;
  investigationId: string;
  isComplete: boolean;
};
type SummaryProps = {
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
  value: string;
};

const navigationItems: { label: string; icon: LucideIcon; route: string }[] = [
  { label: "Overview", icon: FolderOpen, route: "overview" },
  { label: "Evidence", icon: FileText, route: "evidence" },
  { label: "Timeline", icon: Timer, route: "timeline" },
  { label: "Analysis", icon: Waypoints, route: "analysis" },
  { label: "Agent Workspace", icon: Bot, route: "agents" },
  { label: "Proposed Verdict", icon: Scale, route: "verdict" },
];

export function CaseOverview({ caseFile, investigationId, isComplete }: CaseOverviewProps) {
  const data = overviewData(caseFile, isComplete);
  const href = (route: string) => caseHref(route, investigationId);

  return (
    <main className="min-h-[100dvh] bg-[#24160e] text-[#f8ebd2]">
      <div className="paper-noise pointer-events-none fixed inset-0" />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[225px_minmax(0,1fr)]">
        <Sidebar href={href} />
        <div className="min-w-0">
          <StatusBar data={data} />
          <section className="bg-[#f4e8d0] px-6 py-6 text-[#1e2831] lg:min-h-[calc(100dvh-79px)]">
            <div className="mx-auto max-w-[1320px]">
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_376px]">
                <div className="min-w-0">
                  <header className="mb-7">
                    <p className="eyebrow text-[#875e26]">Investigation case file</p>
                    <h1 className="mt-2 font-serif text-[46px] font-semibold leading-[.94] tracking-tight text-[#121b25]">
                      Case overview
                    </h1>
                    <p className="mt-2 font-serif text-xl leading-7 text-[#514e4b]">
                      High-level view of the current Case File and its key materials.
                    </p>
                  </header>
                  <InvestigationStatus data={data} href={href(data.actionRoute)} />
                  <div className="my-8">
                    <SourceMaterial
                      caseFile={caseFile}
                      href={href("overview")}
                      isComplete={isComplete}
                    />
                  </div>
                  <CanonicalMaterial caseFile={caseFile} />
                </div>
                <SummaryRail data={data} href={href} isComplete={isComplete} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Sidebar({ href }: { href: (route: string) => string }) {
  return (
    <aside className="hidden border-r border-[#745022]/65 bg-[#24160e]/95 p-6 lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-3 font-serif text-[29px] font-semibold leading-none tracking-wide">
        <SherlokMark />
        Sherlok
      </Link>
      <p className="mt-2 text-sm text-[#d8c4a0]">AI agents for deeper answers</p>
      <nav className="mt-8 space-y-1" aria-label="Case navigation">
        {navigationItems.map(({ label, icon: Icon, route }) => {
          const isCurrent = route === "overview";
          return (
            <Link
              aria-current={isCurrent ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${isCurrent ? "border-l-2 border-[#f4b941] bg-[#5a3b18]/70 font-semibold text-[#f4b941]" : "text-[#f8ebd2] hover:bg-[#f8ebd2]/10"}`}
              href={href(route)}
              key={route}
            >
              <Icon className="size-5" strokeWidth={1.6} />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-auto border-b-2 border-[#f4b941] pb-6 font-serif text-lg italic leading-6 text-[#e9d8bb]">
        More signal.<br />A fairer truth.
      </p>
    </aside>
  );
}

function StatusBar({ data }: { data: OverviewData }) {
  return (
    <header className="flex h-[79px] items-center border-b-[3px] border-[#d8c4a0] bg-[#24160e]/95 px-6">
      <p className="ml-auto flex items-center gap-3 text-sm font-semibold text-[#f8ebd2]" role="status">
        <span className={`size-3 rounded-full ${data.isReview ? "bg-[#f4b941]" : "bg-[#18afa3]"} shadow-[0_0_0_4px_rgba(24,175,163,.12)]`} />
        <span>{data.statusLabel}</span>
      </p>
    </header>
  );
}

function InvestigationStatus({ data, href }: { data: OverviewData; href: string }) {
  return (
    <section className="flex gap-7 rounded-lg border border-[#e6a522] bg-[#fbf2de] p-6 sm:items-center">
      <span className="grid size-[88px] shrink-0 place-items-center rounded-full bg-[#f6deaa] text-[#121b25]">
        <UsersRound className="size-10" strokeWidth={1.5} />
      </span>
      <div>
        <h2 className="font-serif text-[30px] font-semibold leading-tight text-[#121b25]">
          {data.statusTitle}
        </h2>
        <p className="mt-1 max-w-2xl text-[17px] leading-6 text-[#3e4650]">
          {data.statusDescription}
        </p>
        <Link href={href} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#006b54] hover:underline">
          {data.actionLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function SourceMaterial({ caseFile, href, isComplete }: { caseFile: CaseFile; href: string; isComplete: boolean }) {
  const sources = sourceSummaries(caseFile);
  const emptyMessage = isComplete
    ? "No source material is available in this Case File."
    : "Material is still being prepared.";

  return (
    <section className="rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[27px] font-semibold text-[#121b25]">Source material</h2>
        <Link href={href} className="inline-flex min-h-9 items-center gap-3 rounded-md border border-[#d8c4a0] px-4 text-sm font-semibold hover:bg-[#f4e8d0]">
          View all sources
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="mt-3 divide-y divide-[#d8c4a0] rounded-lg border border-[#d8c4a0] bg-[#fff8e9]">
        {sources.length > 0
          ? sources.map(({ name, blocks }) => (
              <Link href={href} key={name} className="flex items-center gap-5 p-4 hover:bg-[#f4e8d0]">
                <span className="grid size-[62px] shrink-0 place-items-center rounded-lg border border-[#d8c4a0] bg-[#f4e8d0]">
                  <FileText className="size-8" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block font-serif text-lg text-[#121b25]">{name}</b>
                  <span className="mt-1 block text-sm text-[#5c5145]">
                    Participant material · {blocks} canonical {blocks === 1 ? "block" : "blocks"}
                  </span>
                </span>
                <span className="hidden rounded-md border border-[#d8c4a0] px-3 py-2 text-sm font-semibold sm:inline">
                  Open source
                </span>
              </Link>
            ))
          : <p className="p-4 text-sm text-[#5c5145]">{emptyMessage}</p>}
        {caseFile.material_warnings?.map((warning) => (
          <Link href={href} key={warning} className="flex items-center gap-5 bg-[#f6deaa]/45 p-4 hover:bg-[#f6deaa]">
            <span className="grid size-[62px] shrink-0 place-items-center rounded-lg border border-[#f4b941]/50 bg-[#f6deaa] text-[#704a00]">
              <ShieldAlert className="size-8" />
            </span>
            <span className="flex-1">
              <b className="block font-serif text-lg text-[#121b25]">Material needs attention</b>
              <span className="mt-1 block text-sm text-[#5c5145]">{warning}</span>
            </span>
            <ChevronRight className="size-5 text-[#745022]" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SummaryRail({ data, href, isComplete }: { data: OverviewData; href: (route: string) => string; isComplete: boolean }) {
  const sourceSummary = countSummary({
    count: data.sourceCount,
    emptyDescription: "No canonical source blocks are available",
    populatedDescription: "Documents and data sources ingested",
    waitingDescription: "Waiting for material preparation",
    isComplete,
  });
  const evidenceSummary = countSummary({
    count: data.evidenceCount,
    emptyDescription: "No Evidence items were reported",
    populatedDescription: "Evidence items extracted and categorized",
    waitingDescription: "Waiting for collection",
    isComplete,
  });
  const timelineSummary = countSummary({
    count: data.timelineIssues,
    emptyDescription: "No open timeline issues were reported",
    populatedDescription: "Potential inconsistencies identified",
    waitingDescription: "Waiting for timeline reconciliation",
    isComplete,
    zeroValue: "0",
  });

  return (
    <aside className="space-y-3 border-[#d8c4a0] xl:border-l xl:pl-4">
      <Summary {...sourceSummary} href={href("overview")} icon={FileText} title="Sources" />
      <Summary {...evidenceSummary} href={href("evidence")} icon={ClipboardList} title="Evidence" />
      <Summary {...timelineSummary} href={href("timeline")} icon={Timer} title="Timeline issues" />
      <NextStep data={data} href={href(data.actionRoute)} />
    </aside>
  );
}

function Summary({ description, href, icon: Icon, title, value }: SummaryProps) {
  const accessibleName = title === "Evidence"
    ? "Open collected facts"
    : title === "Sources"
      ? "Open source material"
      : "Open timeline issues";

  return (
    <Link href={href} aria-label={accessibleName} className="flex min-h-[130px] items-center gap-5 rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-4 hover:border-[#b89b6e]">
      <span className="grid size-16 shrink-0 place-items-center rounded-full border border-[#d8c4a0] bg-[#f4e8d0]">
        <Icon className="size-8" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block font-serif text-xl text-[#121b25]">{title}</b>
        <strong className="block font-serif text-[30px] leading-8 text-[#121b25]">{value}</strong>
        <span className="block text-sm leading-[18px] text-[#5c5145]">{description}</span>
      </span>
      <ChevronRight className="size-5" />
    </Link>
  );
}

function NextStep({ data, href }: { data: OverviewData; href: string }) {
  return (
    <section className="rounded-lg border border-[#18afa3]/45 bg-[#e5f0e7] p-4">
      <div className="flex gap-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-full border border-[#18afa3]/30 bg-[#d5f0e8] text-[#006b54]">
          <Lightbulb className="size-7" />
        </span>
        <div>
          <h2 className="font-serif text-xl font-semibold text-[#121b25]">Next step</h2>
          <p className="mt-1 text-sm leading-5 text-[#3e4650]">{data.nextStep}</p>
        </div>
      </div>
      <Link href={href} className="mt-3 flex min-h-11 items-center justify-center gap-3 rounded-md bg-[#078c84] text-sm font-bold text-white hover:bg-[#006b64]">
        {data.actionLabel}
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

function overviewData(caseFile: CaseFile, isComplete: boolean) {
  const reviewStatus = caseFile.verdict?.review_status;
  const review = reviewState(reviewStatus, isComplete);

  return {
    ...review,
    evidenceCount: caseFile.evidence?.length ?? 0,
    sourceCount: sourceSummaries(caseFile).length,
    statusLabel: isComplete ? "Investigation complete" : "Investigation in progress",
    timelineIssues: caseFile.timeline?.issues?.length ?? 0,
  };
}

function reviewState(reviewStatus: VerdictReviewStatus | undefined, isComplete: boolean) {
  if (reviewStatus === "awaiting_review") {
    return reviewDetails("A proposed Verdict is ready for review", "Review proposed Verdict");
  }
  if (reviewStatus === "accepted") {
    return reviewDetails("Human Decision: accepted", "Review proposed Verdict");
  }
  if (reviewStatus === "rejected") {
    return reviewDetails("Human Decision: rejected", "Review proposed Verdict");
  }
  if (reviewStatus === "reinvestigation_requested") {
    return investigationDetails("Re-investigation in progress");
  }
  return investigationDetails(isComplete ? "Investigation complete" : "Investigation in progress");
}

function reviewDetails(statusTitle: string, actionLabel: string) {
  return {
    actionLabel,
    actionRoute: "verdict",
    isReview: true,
    nextStep: "Review the proposed Verdict and its cited Evidence before recording a Human Decision.",
    statusDescription: "Review the evidence-cited proposal and its Human Decision status.",
    statusTitle,
  };
}

function investigationDetails(statusTitle: string) {
  return {
    actionLabel: "Open Agent Workspace",
    actionRoute: "agents",
    isReview: false,
    nextStep: "Open the Agent Workspace for current workflow state and Investigation Events.",
    statusDescription: "Open the Agent Workspace to inspect current workflow state and Investigation Events.",
    statusTitle,
  };
}

function countSummary({ count, emptyDescription, populatedDescription, waitingDescription, isComplete, zeroValue = "None" }: {
  count: number;
  emptyDescription: string;
  populatedDescription: string;
  waitingDescription: string;
  isComplete: boolean;
  zeroValue?: string;
}) {
  if (count > 0) return { description: populatedDescription, value: String(count) };
  if (isComplete) return { description: emptyDescription, value: zeroValue };
  return { description: waitingDescription, value: "Waiting" };
}

function sourceSummaries(caseFile: CaseFile) {
  const counts = new Map<string, number>();
  for (const block of caseFile.material_blocks ?? []) {
    const name = block.source_reference.source_name || "Participant material";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (!counts.size && caseFile.canonical_material) counts.set("Participant material", 1);
  return [...counts].map(([name, blocks]) => ({ name, blocks }));
}

function caseHref(route: string, investigationId: string) {
  const encodedId = encodeURIComponent(investigationId);
  return route === "agents"
    ? `/agent-workspace?investigation_id=${encodedId}`
    : `/case/${route}?investigation_id=${encodedId}`;
}
