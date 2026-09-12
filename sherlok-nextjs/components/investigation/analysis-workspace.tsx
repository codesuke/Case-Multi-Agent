"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  FileText,
  FolderOpen,
  MessageSquare,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  Target,
  Timer,
  UserRound,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { SherlokMark } from "@/components/investigation/sherlok-mark";
import { useState } from "react";

type Status = "Supported" | "Unknown";
type Claim = {
  id: string;
  category: "Motive" | "Opportunity";
  statement: string;
  status: Status;
  evidence: string[];
  missing?: string;
};
type Profile = { name: string; claims: Claim[] };
const profiles: Profile[] = [
  {
    name: "Subject A",
    claims: [
      {
        id: "a-motive",
        category: "Motive",
        statement:
          "A supplied account describes a possible personal reason related to the incident.",
        status: "Supported",
        evidence: ["E-01", "E-04"],
      },
      {
        id: "a-opportunity",
        category: "Opportunity",
        statement:
          "Available material does not establish presence at the relevant location and time.",
        status: "Unknown",
        evidence: [],
        missing: "Location and time support was not established.",
      },
    ],
  },
  {
    name: "Subject B",
    claims: [
      {
        id: "b-motive",
        category: "Motive",
        statement:
          "Available records may indicate a potential financial incentive.",
        status: "Supported",
        evidence: ["E-02", "E-03"],
      },
      {
        id: "b-opportunity",
        category: "Opportunity",
        statement: "Presence near the scene remains inconclusive.",
        status: "Unknown",
        evidence: [],
        missing: "Support was not established.",
      },
    ],
  },
  {
    name: "Subject C",
    claims: [
      {
        id: "c-motive",
        category: "Motive",
        statement:
          "No clear personal motive has been identified in supplied material.",
        status: "Unknown",
        evidence: [],
        missing: "No supporting material is available.",
      },
      {
        id: "c-opportunity",
        category: "Opportunity",
        statement:
          "Known movements may support an opportunity at a relevant time.",
        status: "Supported",
        evidence: ["E-05", "E-07"],
      },
    ],
  },
];
const findings = [
  {
    kind: "Unsupported reasoning",
    target: "b-motive",
    specialist: "Suspect Analyst",
    explanation:
      "The cited material describes financial activity but does not establish a direct connection to the incident. Alternative explanations remain possible.",
  },
  {
    kind: "Missing citation",
    target: "event-4",
    specialist: "Timeline Reconciler",
    explanation:
      "The uncertain event needs a source reference before it can support later synthesis.",
  },
];
const nav = [
  ["Overview", FolderOpen, "/case/overview"],
  ["Evidence", FileText, "/case/evidence"],
  ["Timeline", Timer, "/case/timeline"],
  ["Analysis", Waypoints, "/case/analysis"],
  ["Agent Workspace", Sparkles, "/agent-workspace"],
  ["Proposed verdict", Scale, "#"],
] as const;

export function AnalysisWorkspace() {
  const [tab, setTab] = useState<"profiles" | "skeptic">("profiles");
  const [selected, setSelected] = useState<Claim>(profiles[1].claims[0]);
  const selectFinding = (target: string) => {
    const matching = profiles
      .flatMap((profile) => profile.claims)
      .find((claim) => claim.id === target);
    if (matching) {
      setSelected(matching);
      setTab("profiles");
    }
  };
  return (
    <main className="min-h-[100dvh] bg-[#f4e8d0] text-[#1e2831]">
      <div className="paper-noise pointer-events-none fixed inset-0" />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[225px_minmax(0,1fr)]">
        <Sidebar />
        <div className="min-w-0">
          <Topbar />
          <section className="px-4 py-7 sm:px-7 lg:min-h-[calc(100dvh-76px)] lg:px-7">
            <div className="mx-auto grid max-w-[1400px] gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div>
                <header>
                  <p className="eyebrow text-[#745022]">Parallel analysis</p>
                  <h1 className="mt-1 font-serif text-4xl font-semibold sm:text-5xl">
                    Analysis
                  </h1>
                  <p className="mt-2 text-[15px] text-[#5c5145]">
                    Compare claims and inspect challenges.
                  </p>
                </header>
                <Tabs tab={tab} setTab={setTab} />
                <AnimatePresence mode="wait">
                  {tab === "profiles" ? (
                    <Profiles
                      key="profiles"
                      selected={selected}
                      select={setSelected}
                    />
                  ) : (
                    <Skeptic key="skeptic" select={selectFinding} />
                  )}
                </AnimatePresence>
              </div>
              <RightRail claim={selected} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
function Sidebar() {
  return (
    <aside className="hidden border-r border-[#745022]/65 bg-[#24160e] p-5 text-[#f8ebd2] lg:flex lg:flex-col">
      <Link
        href="/"
        className="flex items-center gap-3 font-serif text-[28px] font-semibold tracking-wide"
      >
        <SherlokMark />
        Sherlok
      </Link>
      <p className="mt-1 text-sm text-[#d8c4a0]">
        AI agents for deeper answers
      </p>
      <nav className="mt-8 space-y-1" aria-label="Case navigation">
        {nav.map(([label, Icon, href]) => (
          <Link
            key={label}
            href={href}
            aria-current={label === "Analysis" ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${label === "Analysis" ? "border-l-2 border-[#f4b941] bg-[#5a3b18]/70 font-semibold text-[#f4b941]" : "hover:bg-[#f8ebd2]/10"}`}
          >
            <Icon className="size-5" strokeWidth={1.6} />
            {label}
          </Link>
        ))}
      </nav>
      <p className="mt-auto border-t border-[#745022] pt-6 font-serif text-lg italic text-[#e9d8bb]">
        A clearer picture,
        <br />
        together.
      </p>
    </aside>
  );
}
function Topbar() {
  return (
    <header className="flex min-h-[76px] items-center gap-4 border-b border-[#b89b6e] bg-[#24160e] px-4 text-[#f8ebd2] sm:px-7 lg:px-6">
      <label className="hidden max-w-[680px] flex-1 items-center gap-3 rounded-lg border border-[#745022] bg-[#382315] px-4 py-3 text-[#d8c4a0] md:flex">
        <Search className="size-5 text-[#f4b941]" />
        <span className="text-sm">Search this case…</span>
      </label>
      <div className="ml-auto flex items-center gap-2 text-sm font-semibold text-[#7b4696]">
        <span className="size-2.5 rounded-full bg-[#7b4696]" />
        Revision in progress
      </div>
      <div className="hidden rounded-lg border border-[#745022] bg-[#382315] px-4 py-2.5 text-sm font-semibold sm:block">
        Gemini
      </div>
    </header>
  );
}
function Tabs({
  tab,
  setTab,
}: {
  tab: "profiles" | "skeptic";
  setTab: (tab: "profiles" | "skeptic") => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Analysis views"
      className="mt-7 flex gap-5 border-b border-[#d8c4a0]"
    >
      <button
        role="tab"
        aria-selected={tab === "profiles"}
        onClick={() => setTab("profiles")}
        className={`border-b-2 px-2 pb-3 font-serif text-xl font-semibold ${tab === "profiles" ? "border-[#745022] text-[#24160e]" : "border-transparent text-[#5c5145]"}`}
      >
        Suspect profiles
      </button>
      <button
        role="tab"
        aria-selected={tab === "skeptic"}
        onClick={() => setTab("skeptic")}
        className={`flex items-center gap-2 border-b-2 px-2 pb-3 font-serif text-xl font-semibold ${tab === "skeptic" ? "border-[#745022] text-[#24160e]" : "border-transparent text-[#5c5145]"}`}
      >
        Skeptic review{" "}
        <span className="rounded-full bg-[#d8c4a0] px-2 py-0.5 font-sans text-xs">
          {findings.length}
        </span>
      </button>
    </div>
  );
}
function Profiles({
  selected,
  select,
}: {
  selected: Claim;
  select: (claim: Claim) => void;
}) {
  return (
    <motion.section
      role="tabpanel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
    >
      {profiles.map((profile, index) => (
        <motion.article
          key={profile.name}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          className={`rounded-lg border bg-[#fbf2de] p-4 ${profile.name === "Subject B" ? "border-[#7b4696] ring-1 ring-[#7b4696]/45" : "border-[#d8c4a0]"}`}
        >
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-[#f4e8d0] text-[#24160e]">
              <UserRound className="size-6" />
            </span>
            <h2 className="font-serif text-2xl font-semibold">
              {profile.name}
            </h2>
            {profile.name === "Subject B" && (
              <span className="ml-auto rounded-full bg-[#e9d5ea] px-2 py-1 text-xs font-bold text-[#7b4696]">
                Revision 1 of 1
              </span>
            )}
          </div>
          <div className="mt-5 space-y-4">
            {profile.claims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                selected={selected.id === claim.id}
                select={select}
              />
            ))}
          </div>
        </motion.article>
      ))}
    </motion.section>
  );
}
function ClaimCard({
  claim,
  selected,
  select,
}: {
  claim: Claim;
  selected: boolean;
  select: (claim: Claim) => void;
}) {
  const supported = claim.status === "Supported";
  return (
    <button
      onClick={() => select(claim)}
      className={`w-full rounded-lg border p-4 text-left transition ${selected ? "border-[#18afa3] ring-1 ring-[#18afa3]" : "border-[#d8c4a0] hover:border-[#b89b6e]"}`}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-[#f6deaa] text-[#745022]">
          {claim.category === "Motive" ? (
            <Target className="size-5" />
          ) : (
            <Timer className="size-5" />
          )}
        </span>
        <h3 className="font-serif text-xl font-semibold">{claim.category}</h3>
      </div>
      <p className="mt-3 text-sm leading-5">{claim.statement}</p>
      <div
        className={`mt-3 rounded-md p-3 ${supported ? "bg-[#d5f0e8] text-[#006b54]" : "bg-[#e8e3d9] text-[#5c5145]"}`}
      >
        <span className="flex items-center gap-2 font-serif text-lg font-semibold">
          {supported ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <CircleHelp className="size-5" />
          )}
          {claim.status}
        </span>
        {supported ? (
          <Evidence ids={claim.evidence} />
        ) : (
          <p className="mt-2 text-xs leading-5">{claim.missing}</p>
        )}
      </div>
    </button>
  );
}
function Evidence({ ids }: { ids: string[] }) {
  return (
    <span className="mt-3 flex flex-wrap gap-2">
      {ids.map((id) => (
        <Link
          href="/case/evidence"
          key={id}
          className="rounded-md bg-white/45 px-2 py-1 font-mono text-xs text-[#1e2831] hover:bg-white/75"
        >
          <FileText className="mr-1 inline size-3" />
          {id}
        </Link>
      ))}
    </span>
  );
}
function Skeptic({ select }: { select: (target: string) => void }) {
  return (
    <motion.section
      role="tabpanel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mt-5 space-y-4"
    >
      <section className="rounded-lg border border-[#7b4696]/50 bg-[#e9d5ea]/65 p-5">
        <div className="flex gap-3">
          <RefreshCw className="size-6 text-[#7b4696]" />
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#5f2f77]">
              Revision requested
            </h2>
            <p className="mt-1 text-sm leading-5 text-[#5c5145]">
              One specialist is addressing targeted concerns. This is the only
              available revision round.
            </p>
          </div>
        </div>
      </section>
      {findings.map((finding) => (
        <button
          onClick={() => select(finding.target)}
          key={finding.target}
          className="w-full rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5 text-left transition hover:border-[#7b4696]"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#e9d5ea] px-3 py-1 text-xs font-bold text-[#7b4696]">
              {finding.kind}
            </span>
            <span className="text-sm font-semibold text-[#5c5145]">
              Target: {finding.specialist}
            </span>
            <ChevronRight className="ml-auto size-5 text-[#745022]" />
          </div>
          <p className="mt-3 text-sm leading-6">{finding.explanation}</p>
          <p className="mt-3 border-t border-[#d8c4a0] pt-3 text-xs font-bold uppercase tracking-[.08em] text-[#745022]">
            Open exact target claim
          </p>
        </button>
      ))}
    </motion.section>
  );
}
function RightRail({ claim }: { claim: Claim }) {
  const finding = findings.find((item) => item.target === claim.id);
  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5">
        <div className="flex gap-3">
          <FileText className="size-6 text-[#745022]" />
          <h2 className="font-serif text-2xl font-semibold">Selected claim</h2>
        </div>
        <div className="mt-4 rounded-lg border border-[#d8c4a0] bg-[#fff8e9] p-4 font-serif text-xl leading-7">
          {claim.statement}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-[#5c5145]">Category</dt>
          <dd>{claim.category}</dd>
          <dt className="text-[#5c5145]">Status</dt>
          <dd
            className={
              claim.status === "Supported" ? "text-[#008777]" : "text-[#5c5145]"
            }
          >
            {claim.status}
          </dd>
          <dt className="text-[#5c5145]">Linked evidence</dt>
          <dd>
            {claim.evidence.length ? (
              <Evidence ids={claim.evidence} />
            ) : (
              "None established"
            )}
          </dd>
        </dl>
        <div className="mt-5 border-t border-[#d8c4a0] pt-4">
          <h3 className="font-serif text-xl font-semibold">Source summary</h3>
          <p className="mt-2 text-sm leading-6 text-[#5c5145]">
            The available source-backed evidence supports only the statement
            shown here; it does not establish a conclusion beyond that claim.
          </p>
        </div>
      </section>
      {finding && (
        <section className="rounded-lg border border-[#7b4696]/50 bg-[#e9d5ea]/65 p-5">
          <div className="flex gap-3">
            <MessageSquare className="size-6 text-[#7b4696]" />
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#5f2f77]">
                Skeptic challenge
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#5c5145]">
                {finding.explanation}
              </p>
              <p className="mt-4 rounded border border-[#7b4696]/30 bg-white/30 p-3 text-xs text-[#5f2f77]">
                Targets this exact claim.
              </p>
            </div>
          </div>
        </section>
      )}
      <section className="rounded-lg border border-[#7b4696]/35 bg-[#e9d5ea]/40 p-5">
        <div className="flex gap-3">
          <RefreshCw className="size-6 text-[#7b4696]" />
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#5f2f77]">
              Specialist revision underway
            </h2>
            <p className="mt-2 text-sm leading-5 text-[#5c5145]">
              A specialist is reviewing targeted claims and addressing open
              challenges.
            </p>
          </div>
        </div>
      </section>
    </aside>
  );
}
