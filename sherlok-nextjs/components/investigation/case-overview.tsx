"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderOpen,
  Lightbulb,
  ListFilter,
  Scale,
  Search,
  ShieldAlert,
  Timer,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { SherlokMark } from "@/components/investigation/sherlok-mark";

import { Button } from "@/components/ui/button";

const navigation = [
  ["Overview", FolderOpen],
  ["Evidence", FileText],
  ["Timeline", Timer],
  ["Analysis", Waypoints],
  ["Agent Workspace", Bot],
  ["Proposed verdict", Scale],
] as const;
const phases = [
  ["Prepare", "Material accepted", "complete"],
  ["Collect", "Sources normalized", "complete"],
  ["Analyze", "Specialists working", "current"],
  ["Challenge", "Cross-check findings", "queued"],
  ["Synthesize", "Consolidate findings", "queued"],
  ["Review", "Human decision", "queued"],
] as const;
const sources = [
  ["Case brief", "Participant material", "Accepted and prepared"],
  ["Witness account", "Participant material", "Accepted and prepared"],
] as const;

export function CaseOverview() {
  return (
    <main className="min-h-[100dvh] bg-[#24160e] text-[#f8ebd2]">
      <div className="paper-noise pointer-events-none fixed inset-0" />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[225px_minmax(0,1fr)]">
        <Sidebar />
        <div className="min-w-0">
          <Topbar />
          <section className="bg-[#f4e8d0] px-4 py-7 text-[#1e2831] sm:px-7 lg:min-h-[calc(100dvh-76px)] lg:px-10 lg:py-8">
            <div className="mx-auto max-w-[1350px]">
              <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
                <div>
                  <Header />
                  <CurrentStage />
                  <Workflow />
                  <SourceMaterial />
                </div>
                <RightRail />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Sidebar() {
  return (
    <aside className="hidden border-r border-[#745022]/65 bg-[#24160e]/95 p-5 lg:flex lg:flex-col">
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
        {navigation.map(([label, Icon], index) => (
          <a
            key={label}
            href={index === 0 ? "/case/overview" : "#"}
            aria-current={index === 0 ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${index === 0 ? "border-l-2 border-[#f4b941] bg-[#5a3b18]/70 font-semibold text-[#f4b941]" : "text-[#f8ebd2] hover:bg-[#f8ebd2]/10"}`}
          >
            <Icon className="size-5" strokeWidth={1.6} />
            {label}
          </a>
        ))}
      </nav>
      <div className="mt-auto border-t border-[#745022] pt-6 font-serif text-lg italic leading-6 text-[#e9d8bb]">
        More signal.
        <br />A fairer truth.
        <span className="mt-5 block h-0.5 w-12 bg-[#f4b941]" />
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="flex min-h-[76px] items-center gap-4 border-b border-[#745022] bg-[#24160e]/95 px-4 sm:px-7 lg:px-6">
      <label className="hidden max-w-[680px] flex-1 items-center gap-3 rounded-lg border border-[#745022] bg-[#382315] px-4 py-3 text-[#d8c4a0] md:flex">
        <Search className="size-5 text-[#f4b941]" />
        <span className="text-sm">Search this case…</span>
      </label>
      <div className="ml-auto flex items-center gap-3 text-sm font-semibold text-[#f8ebd2]">
        <span className="size-2.5 rounded-full bg-[#18afa3] shadow-[0_0_0_4px_rgba(24,175,163,.12)]" />
        <span className="hidden sm:inline">Investigation in progress</span>
      </div>
      <div className="rounded-lg border border-[#745022] bg-[#382315] px-4 py-2.5 text-sm font-semibold">
        Gemini
      </div>
    </header>
  );
}

function Header() {
  return (
    <div className="mb-7">
      <p className="eyebrow text-[#745022]">Active investigation</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-[#24160e] sm:text-5xl">
        Current case
      </h1>
      <p className="mt-2 text-[15px] leading-6 text-[#5c5145]">
        High-level view of the investigation, its current progress, and the
        participant materials in scope.
      </p>
    </div>
  );
}

function CurrentStage() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex gap-5 rounded-lg border border-[#f4b941] bg-[#fbf2de] p-5 sm:items-center sm:p-6"
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#f6deaa] text-[#24160e]">
        <Bot className="size-7" strokeWidth={1.5} />
      </span>
      <div>
        <p className="font-serif text-2xl font-semibold text-[#24160e]">
          Specialists are analyzing the case
        </p>
        <p className="mt-1 max-w-2xl leading-6 text-[#5c5145]">
          Independent roles are examining the available participant material and
          organizing findings for scrutiny.
        </p>
        <Link
          href="/agent-workspace"
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#006b54] hover:underline"
        >
          Watch investigation <ArrowRight className="size-4" />
        </Link>
      </div>
    </motion.section>
  );
}

function Workflow() {
  return (
    <section className="my-8">
      <h2 className="sr-only">Workflow progress</h2>
      <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {phases.map(([title, description, state], index) => (
          <motion.li
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="relative min-w-0 xl:before:absolute xl:before:left-1/2 xl:before:top-4 xl:before:h-0.5 xl:before:w-[calc(100%+1rem)] xl:before:bg-[#b89b6e] xl:last:before:hidden"
          >
            <div className="relative z-10 flex gap-3 xl:block">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full border-2 ${state === "complete" ? "border-[#18afa3] bg-[#18afa3] text-white" : state === "current" ? "border-[#f4b941] bg-[#f6deaa] text-[#24160e] ring-2 ring-[#745022] ring-offset-2 ring-offset-[#f4e8d0]" : "border-[#b89b6e] bg-[#f4e8d0] text-transparent"}`}
              >
                {state === "complete" ? <Check className="size-4" /> : "•"}
              </span>
              <div className="xl:mt-3">
                <p className="font-serif text-lg font-semibold text-[#24160e]">
                  {title}
                </p>
                <p className="text-sm leading-5 text-[#5c5145]">
                  {description}
                </p>
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function SourceMaterial() {
  return (
    <section className="rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-serif text-2xl font-semibold text-[#24160e]">
            Source material
          </p>
          <p className="mt-1 text-sm text-[#5c5145]">
            Only participant-facing material is included in this case file.
          </p>
        </div>
        <Button variant="secondary" className="h-10 min-h-0">
          View all sources <ArrowRight className="size-4" />
        </Button>
      </div>
      <div className="mt-5 divide-y divide-[#d8c4a0] rounded-lg border border-[#d8c4a0] bg-[#fff8e9]">
        {sources.map(([name, type, status]) => (
          <a
            href="#"
            key={name}
            className="flex items-center gap-4 p-4 transition hover:bg-[#f4e8d0]"
            aria-label={`Open material: ${name}`}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#d8c4a0] bg-[#f4e8d0] text-[#745022]">
              <FileText className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-sm text-[#24160e]">{name}</b>
              <span className="mt-1 block text-xs text-[#5c5145]">
                {type} ·{" "}
                <span className="font-semibold text-[#006b54]">{status}</span>
              </span>
            </span>
            <ChevronRight className="size-5 text-[#745022]" />
          </a>
        ))}
        <a
          href="#"
          className="flex items-center gap-4 bg-[#f6deaa]/45 p-4 transition hover:bg-[#f6deaa]"
          aria-label="View material warning"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#f4b941]/50 bg-[#f6deaa] text-[#704a00]">
            <ShieldAlert className="size-5" />
          </span>
          <span className="flex-1">
            <b className="block text-sm text-[#24160e]">
              Material needs attention
            </b>
            <span className="mt-1 block text-xs text-[#5c5145]">
              One source may be incomplete. Review details before relying on it.
            </span>
          </span>
          <ChevronRight className="size-5 text-[#745022]" />
        </a>
      </div>
    </section>
  );
}

function RightRail() {
  const activity = [
    ["Analysis in progress", "Specialists are organizing findings"],
    ["Sources processed", "Available material is ready"],
    ["Investigation started", "Roles have been assigned"],
  ];
  return (
    <aside className="space-y-4 border-[#d8c4a0] xl:border-l xl:pl-7">
      <Snapshot
        icon={ClipboardList}
        title="Sources"
        description="Participant materials in scope"
      />
      <Snapshot
        icon={ListFilter}
        title="Evidence"
        description="Waiting for collection to finish"
        waiting
      />
      <Snapshot
        icon={Waypoints}
        title="Timeline issues"
        description="Waiting for timeline reconciliation"
        waiting
      />
      <section className="rounded-lg border border-[#18afa3]/45 bg-[#d5f0e8]/50 p-5">
        <span className="grid size-12 place-items-center rounded-full border border-[#18afa3]/30 bg-[#d5f0e8] text-[#006b54]">
          <Lightbulb className="size-6" />
        </span>
        <h2 className="mt-3 font-serif text-xl font-semibold text-[#24160e]">
          Next step
        </h2>
        <p className="mt-1 text-sm leading-5 text-[#5c5145]">
          Continue monitoring agent progress and review new findings as they
          become available.
        </p>
        <Link
          href="/agent-workspace"
          className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#18afa3] px-4 text-sm font-bold text-[#24160e] transition hover:bg-[#34c2b7] active:translate-y-px"
        >
          Watch investigation <ArrowRight className="size-4" />
        </Link>
      </section>
      <section className="rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5">
        <div className="flex items-center gap-3">
          <ListFilter className="size-5 text-[#745022]" />
          <h2 className="font-serif text-xl font-semibold text-[#24160e]">
            Recent activity
          </h2>
        </div>
        <ol className="mt-4 space-y-4">
          {activity.map(([title, description], index) => (
            <li key={title} className="flex gap-3">
              <span
                className={`mt-1.5 size-3 shrink-0 rounded-full ${index === 0 ? "bg-[#18afa3]" : "bg-[#8b847c]"}`}
              />
              <span>
                <b className="block text-sm text-[#24160e]">{title}</b>
                <span className="block text-xs leading-5 text-[#5c5145]">
                  {description}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function Snapshot({
  icon: Icon,
  title,
  description,
  waiting = false,
}: {
  icon: typeof ClipboardList;
  title: string;
  description: string;
  waiting?: boolean;
}) {
  return (
    <a
      href="#"
      className="flex items-center gap-4 rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-4 transition hover:-translate-y-0.5 hover:border-[#b89b6e]"
      aria-label={`View ${title.toLowerCase()}`}
    >
      <span
        className={`grid size-12 place-items-center rounded-full border ${waiting ? "border-[#d8c4a0] bg-[#f4e8d0] text-[#745022]" : "border-[#d8c4a0] bg-[#f4e8d0] text-[#24160e]"}`}
      >
        <Icon className="size-6" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="font-serif text-xl text-[#24160e]">{title}</b>
        <span className="mt-1 block text-sm leading-5 text-[#5c5145]">
          {description}
        </span>
      </span>
      <ChevronRight className="size-5 text-[#745022]" />
    </a>
  );
}
