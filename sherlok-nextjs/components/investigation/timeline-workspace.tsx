"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  FileText,
  FolderOpen,
  GitBranch,
  ListFilter,
  MessageSquare,
  Scale,
  Sparkles,
  Timer,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { SherlokMark } from "@/components/investigation/sherlok-mark";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type Event = {
  id: string;
  time: string;
  statement: string;
  evidence: string[];
  status: "Supported" | "Unknown";
  detail: string;
  ordered: boolean;
};
type Issue = {
  type: "Gap" | "Contradiction";
  statement: string;
  evidence: string[];
};
const events: Event[] = [
  {
    id: "event-1",
    time: "08:10",
    statement: "A supplied record places an individual at a relevant location.",
    evidence: ["E-01", "E-03"],
    status: "Supported",
    detail:
      "The Timeline Reconciler retained this event in the provided chronology because the cited sources place the event in the same general time window.",
    ordered: true,
  },
  {
    id: "event-2",
    time: "08:24",
    statement: "A source reports activity near a second location.",
    evidence: ["E-02", "E-04"],
    status: "Supported",
    detail:
      "The cited participant material supports this event’s position in the reconciler-provided order. It does not resolve every question about the activity.",
    ordered: true,
  },
  {
    id: "event-3",
    time: "08:41",
    statement: "An account reports a departure through another access point.",
    evidence: ["E-06", "E-07"],
    status: "Supported",
    detail:
      "The event is shown in the order supplied by the Timeline Reconciler and remains traceable to its cited evidence items.",
    ordered: true,
  },
  {
    id: "event-4",
    time: "Time not established",
    statement:
      "A source describes an unidentified individual in the same area.",
    evidence: ["E-05", "E-10"],
    status: "Unknown",
    detail:
      "No reliable time or order was supplied for this event. It is kept separate rather than being silently inserted into the chronology.",
    ordered: false,
  },
];
const issues: Issue[] = [
  {
    type: "Gap",
    statement:
      "The supplied material does not establish how activity moved between two reported locations.",
    evidence: ["E-02", "E-06"],
  },
  {
    type: "Contradiction",
    statement:
      "One account conflicts with the observed order reported in another source.",
    evidence: ["E-04", "E-08"],
  },
];
const navigation = [
  ["Overview", FolderOpen, "/case/overview"],
  ["Evidence", FileText, "/case/evidence"],
  ["Timeline", Timer, "/case/timeline"],
  ["Analysis", Waypoints, "#"],
  ["Agent Workspace", Sparkles, "/agent-workspace"],
  ["Proposed verdict", Scale, "#"],
] as const;

export function TimelineWorkspace() {
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Event>(events[1]);
  const visibleEvents = useMemo(
    () => (filter === "All" || filter === "Events" ? events : []),
    [filter],
  );
  const visibleIssues = useMemo(
    () =>
      filter === "All" || filter === "Gaps" || filter === "Contradictions"
        ? issues.filter(
            (issue) => filter === "All" || `${issue.type}s` === filter,
          )
        : [],
    [filter],
  );
  return (
    <main className="min-h-[100dvh] bg-[#24160e] text-[#f8ebd2]">
      <div className="paper-noise pointer-events-none fixed inset-0" />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[225px_minmax(0,1fr)]">
        <Sidebar />
        <div className="min-w-0">
          <section className="border-b border-[#745022] bg-[#24160e] px-4 py-6 sm:px-7 lg:px-7">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-5">
              <div>
                <p className="eyebrow text-[#f4b941]">Timeline reconciler</p>
                <h1 className="mt-1 font-serif text-4xl font-semibold">
                  Timeline
                </h1>
                <p className="mt-1 text-[#d8c4a0]">
                  Events, gaps, and contradictions
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {["All", "Events", "Gaps", "Contradictions"].map((item) => (
                  <Button
                    key={item}
                    variant={filter === item ? "primary" : "secondary"}
                    className={`min-h-9 px-3 text-xs ${filter !== item ? "border-[#745022] bg-[#382315] text-[#f8ebd2] hover:bg-[#5a3b18]" : ""}`}
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>
          </section>
          <section className="bg-[#f4e8d0] px-4 py-5 text-[#1e2831] sm:px-7 lg:min-h-[calc(100dvh-124px)] lg:px-7">
            <div className="mx-auto grid max-w-[1400px] gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(310px,.9fr)]">
              <div>
                <Status />
                <AnimatePresence mode="wait">
                  {visibleEvents.length > 0 && (
                    <motion.section
                      key="events"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5 sm:p-6"
                    >
                      <h2 className="font-serif text-2xl font-semibold">
                        Chronological events
                      </h2>
                      <p className="mt-1 text-sm text-[#5c5145]">
                        Order shown as supplied by the Timeline Reconciler.
                      </p>
                      <ol className="mt-5 space-y-3 border-l-2 border-[#b89b6e] pl-5">
                        {visibleEvents
                          .filter((event) => event.ordered)
                          .map((event, index) => (
                            <EventCard
                              key={event.id}
                              event={event}
                              selected={selected.id === event.id}
                              select={setSelected}
                              index={index}
                            />
                          ))}
                      </ol>
                      {visibleEvents.some((event) => !event.ordered) && (
                        <div className="mt-6 border-t border-[#d8c4a0] pt-5">
                          <h2 className="font-serif text-2xl font-semibold">
                            Unordered or uncertain events
                          </h2>
                          <p className="mt-1 text-sm text-[#5c5145]">
                            These items are not silently placed on the
                            chronological rail.
                          </p>
                          <ol className="mt-5 space-y-3 border-l-2 border-dashed border-[#b89b6e] pl-5">
                            {visibleEvents
                              .filter((event) => !event.ordered)
                              .map((event, index) => (
                                <EventCard
                                  key={event.id}
                                  event={event}
                                  selected={selected.id === event.id}
                                  select={setSelected}
                                  index={index}
                                />
                              ))}
                          </ol>
                        </div>
                      )}
                    </motion.section>
                  )}
                </AnimatePresence>
                {filter !== "All" &&
                  !visibleEvents.length &&
                  !visibleIssues.length && <Empty filter={filter} />}
              </div>
              <aside className="space-y-4">
                <Issues issues={visibleIssues} selectEvent={setSelected} />
                <SelectedEvent event={selected} />
                <section className="rounded-lg border border-[#745022] bg-[#382315] p-5 text-[#f8ebd2]">
                  <div className="flex gap-3">
                    <MessageSquare className="size-5 text-[#f4b941]" />
                    <div>
                      <h2 className="font-serif text-xl font-semibold">
                        Skeptic feedback
                      </h2>
                      <p className="mt-2 text-sm leading-5 text-[#d8c4a0]">
                        No revision round has been requested for this timeline.
                      </p>
                    </div>
                  </div>
                </section>
              </aside>
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
        {navigation.map(([label, Icon, href]) => (
          <Link
            key={label}
            href={href}
            aria-current={label === "Timeline" ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${label === "Timeline" ? "border-l-2 border-[#f4b941] bg-[#5a3b18]/70 font-semibold text-[#f4b941]" : "text-[#f8ebd2] hover:bg-[#f8ebd2]/10"}`}
          >
            <Icon className="size-5" strokeWidth={1.6} />
            {label}
          </Link>
        ))}
      </nav>
      <p className="mt-auto border-t border-[#745022] pt-6 font-serif text-lg italic leading-6 text-[#e9d8bb]">
        A clearer picture,
        <br />
        together.
      </p>
    </aside>
  );
}
function Status() {
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-4">
      <span className="grid size-12 place-items-center rounded-full bg-[#f6deaa] text-[#745022]">
        <GitBranch className="size-6" />
      </span>
      <div className="min-w-[170px] flex-1">
        <h2 className="font-serif text-xl font-semibold">
          Timeline Reconciler
        </h2>
        <p className="mt-1 text-sm text-[#5c5145]">
          A timestamp can be unknown without making the event invalid.
        </p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-[#18afa3] bg-[#d5f0e8] px-3 py-1 text-sm font-semibold text-[#006b54]">
        <CheckCircle2 className="size-4" />
        Completed
      </span>
    </section>
  );
}
function EventCard({
  event,
  selected,
  select,
  index,
}: {
  event: Event;
  selected: boolean;
  select: (event: Event) => void;
  index: number;
}) {
  const supported = event.status === "Supported";
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      <span
        className={`absolute -left-[31px] top-6 grid size-5 place-items-center rounded-full border-2 ${supported ? "border-[#006b54] bg-[#18afa3]" : "border-[#5c5145] bg-[#d8c4a0]"}`}
      />
      <button
        onClick={() => select(event)}
        className={`grid w-full gap-4 rounded-lg border p-4 text-left transition sm:grid-cols-[125px_minmax(0,1fr)_160px] ${selected ? "border-[#18afa3] bg-[#d5f0e8]/45 ring-1 ring-[#18afa3]" : "border-[#d8c4a0] bg-[#fff8e9] hover:border-[#b89b6e]"}`}
      >
        <span className="font-serif text-xl font-semibold">{event.time}</span>
        <span>
          <b className="block text-sm leading-5">{event.statement}</b>
          <span
            className={`mt-2 inline-flex items-center gap-2 text-xs font-semibold ${supported ? "text-[#008777]" : "text-[#5c5145]"}`}
          >
            {supported ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <CircleHelp className="size-4" />
            )}
            {event.status}
          </span>
        </span>
        <EvidenceChips ids={event.evidence} />
      </button>
    </motion.li>
  );
}
function EvidenceChips({ ids }: { ids: string[] }) {
  return (
    <span className="flex flex-wrap content-start gap-2">
      <span className="w-full text-xs text-[#5c5145]">Evidence</span>
      {ids.map((id) => (
        <Link
          onClick={(event) => event.stopPropagation()}
          href="/case/evidence"
          key={id}
          className="rounded-md border border-[#b89b6e] bg-[#f4e8d0] px-2 py-1 font-mono text-xs hover:bg-[#f6deaa]"
        >
          {id}
        </Link>
      ))}
    </span>
  );
}
function Issues({
  issues,
  selectEvent,
}: {
  issues: Issue[];
  selectEvent: (event: Event) => void;
}) {
  return (
    <section className="rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5">
      <h2 className="font-serif text-2xl font-semibold">
        Gaps and contradictions
      </h2>
      <div className="mt-4 space-y-3">
        {issues.length ? (
          issues.map((issue) => (
            <button
              key={issue.statement}
              onClick={() => selectEvent(events[1])}
              className="w-full rounded-lg border border-[#d8c4a0] bg-[#fff8e9] p-4 text-left transition hover:border-[#b89b6e]"
            >
              <span
                className={`flex gap-3 ${issue.type === "Gap" ? "text-[#704a00]" : "text-[#b3261e]"}`}
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                <span>
                  <b className="font-serif text-xl">{issue.type}</b>
                  <span className="mt-1 block text-sm leading-5 text-[#1e2831]">
                    {issue.statement}
                  </span>
                </span>
              </span>
              <span className="mt-3 block">
                <EvidenceChips ids={issue.evidence} />
              </span>
              <span className="mt-3 flex items-center gap-2 border-t border-[#d8c4a0] pt-3 text-xs font-semibold text-[#5c5145]">
                <MessageSquare className="size-4" />
                View Skeptic feedback{" "}
                <ChevronRight className="ml-auto size-4" />
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-lg bg-[#f4e8d0] p-4 text-sm text-[#5c5145]">
            No {""}matching issues in this view.
          </p>
        )}
      </div>
    </section>
  );
}
function SelectedEvent({ event }: { event: Event }) {
  return (
    <section className="rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5">
      <h2 className="font-serif text-2xl font-semibold">
        Selected event details
      </h2>
      <div className="mt-4 rounded-lg border border-[#d8c4a0] bg-[#fff8e9] p-4">
        <div className="flex gap-4 border-b border-[#d8c4a0] pb-3">
          <span className="font-serif text-xl font-semibold">{event.time}</span>
          <p className="text-sm leading-5">{event.statement}</p>
        </div>
        <div className="py-4">
          <p className="text-xs font-bold uppercase tracking-[.08em] text-[#745022]">
            Evidence sources
          </p>
          <div className="mt-2">
            <EvidenceChips ids={event.evidence} />
          </div>
        </div>
        <p className="border-t border-[#d8c4a0] pt-4 text-sm leading-6 text-[#5c5145]">
          {event.detail}
        </p>
      </div>
    </section>
  );
}
function Empty({ filter }: { filter: string }) {
  return (
    <section className="mt-4 grid min-h-48 place-items-center rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-6 text-center">
      <div>
        <ListFilter className="mx-auto size-7 text-[#745022]" />
        <h2 className="mt-3 font-serif text-2xl">
          No {filter.toLowerCase()} in this view
        </h2>
        <p className="mt-1 text-sm text-[#5c5145]">
          The timeline remains read-only; switching filters does not change its
          supplied order.
        </p>
      </div>
    </section>
  );
}
