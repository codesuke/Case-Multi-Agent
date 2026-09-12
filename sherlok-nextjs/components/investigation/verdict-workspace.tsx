"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderOpen,
  Gavel,
  RefreshCw,
  Scale,
  Search,
  Timer,
  Waypoints,
  X,
} from "lucide-react";
import Link from "next/link";
import { SherlokMark } from "@/components/investigation/sherlok-mark";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const conclusions = [
  [
    "The available evidence most strongly supports a restricted-access scenario.",
    ["E-01", "E-03"],
  ],
  [
    "Supporting material is consistent with authorized access and activity patterns.",
    ["E-02"],
  ],
  [
    "An alternative access scenario cannot be ruled out on the current evidence.",
    ["E-05"],
  ],
] as const;
const audit = [
  "Case File Curator",
  "Evidence Collector",
  "Suspect Analyst",
  "Timeline Reconciler",
  "Skeptic",
  "Lead Detective",
  "Human Review",
];
const nav = [
  ["Overview", FolderOpen, "/case/overview"],
  ["Evidence", FileText, "/case/evidence"],
  ["Timeline", Timer, "/case/timeline"],
  ["Analysis", Waypoints, "/case/analysis"],
  ["Agent Workspace", ClipboardList, "/case/agents"],
  ["Proposed verdict", Scale, "/case/verdict"],
] as const;

export function VerdictWorkspace() {
  const [status, setStatus] = useState<
    | "awaiting"
    | "confirm-accept"
    | "confirm-reject"
    | "reinvestigate"
    | "accepted"
    | "rejected"
  >("awaiting");
  const [guidance, setGuidance] = useState("");
  const recorded = status === "accepted" || status === "rejected";
  const confirm = (decision: "accepted" | "rejected") => setStatus(decision);
  return (
    <main className="min-h-[100dvh] bg-[#f4e8d0] text-[#1e2831]">
      <div className="paper-noise pointer-events-none fixed inset-0" />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[215px_minmax(0,1fr)]">
        <Sidebar />
        <div className="min-w-0">
          <Topbar status={status} />
          <section className="pb-44 pt-7 sm:px-7 lg:px-7">
            <div className="mx-auto grid max-w-[1400px] gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.85fr)]">
              <Proposal status={status} />
              <RightRail />
            </div>
          </section>
          <DecisionBar
            status={status}
            setStatus={setStatus}
            guidance={guidance}
            setGuidance={setGuidance}
            confirm={confirm}
            recorded={recorded}
          />
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
        className="flex items-center gap-3 font-serif text-[28px] font-semibold"
      >
        <SherlokMark />
        Sherlok
      </Link>
      <nav className="mt-10 space-y-1">
        {nav.map(([label, Icon, href]) => (
          <Link
            key={label}
            href={href}
            aria-current={label === "Proposed verdict" ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${label === "Proposed verdict" ? "border-l-2 border-[#f4b941] bg-[#5a3b18]/70 font-semibold text-[#f4b941]" : "hover:bg-[#f8ebd2]/10"}`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
      <p className="mt-auto border-t border-[#745022] pt-6 font-serif text-lg italic text-[#e9d8bb]">
        Building clearer truths,
        <br />
        together.
      </p>
    </aside>
  );
}
function Topbar({ status }: { status: string }) {
  const label =
    status === "accepted"
      ? "Decision recorded: accepted"
      : status === "rejected"
        ? "Decision recorded: rejected"
        : status === "reinvestigate"
          ? "Re-investigation requested"
          : "Awaiting human review";
  return (
    <header className="flex min-h-[68px] items-center gap-4 border-b border-[#b89b6e] bg-[#24160e] px-4 text-[#f8ebd2] sm:px-7">
      <label className="hidden flex-1 items-center gap-3 rounded-lg border border-[#745022] bg-[#382315] px-4 py-3 md:flex">
        <Search className="size-5 text-[#f4b941]" />
        <span className="text-sm text-[#d8c4a0]">
          Search evidence, claims, or questions…
        </span>
      </label>
      <span className="ml-auto flex items-center gap-2 text-sm font-semibold text-[#f4b941]">
        <span className="size-2.5 rounded-full bg-[#f4b941]" />
        {label}
      </span>
    </header>
  );
}
function Proposal({ status }: { status: string }) {
  return (
    <main>
      <p className="eyebrow text-[#745022]">Proposed verdict</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl font-semibold sm:text-5xl">
          Proposed verdict
        </h1>
        <span className="rounded-full bg-[#e9d5ea] px-3 py-1 text-sm font-bold text-[#7b4696]">
          {status === "accepted"
            ? "Accepted"
            : status === "rejected"
              ? "Rejected"
              : "Awaiting review"}
        </span>
        <span className="rounded-full border border-[#f4b941] bg-[#f6deaa] px-3 py-1 text-sm font-bold text-[#704a00]">
          Moderate confidence
        </span>
      </div>
      <p className="mt-5 text-[15px] leading-6 text-[#5c5145]">
        This evidence-cited proposal is not a final answer. Confidence is an
        estimate, not certainty.
      </p>
      <section className="mt-5 rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-6">
        <p className="font-serif text-2xl font-semibold leading-8">
          The available evidence most strongly supports a restricted-access
          scenario.
        </p>
      </section>
      <section className="mt-6">
        <h2 className="font-serif text-3xl font-semibold">
          Ranked conclusions
        </h2>
        <ol className="mt-3 divide-y divide-[#d8c4a0]">
          {conclusions.map(([statement, ids], index) => (
            <li key={statement} className="flex gap-4 py-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#8b847c] font-serif text-xl text-white">
                {index + 1}
              </span>
              <p className="flex-1 text-[15px] leading-6">{statement}</p>
              <Evidence ids={ids} />
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-5 rounded-lg border border-[#b3261e]/35 bg-[#fce5db] p-5">
        <div className="flex gap-3 text-[#8e241d]">
          <AlertTriangle className="size-7 shrink-0" />
          <div>
            <h2 className="font-serif text-2xl font-semibold">
              What remains uncertain
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#5c5145]">
              <li>
                There is no direct confirmation of who performed the activity.
              </li>
              <li>Identity and intent remain uncertain.</li>
              <li>An alternative access scenario remains plausible.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
function Evidence({ ids }: { ids: readonly string[] }) {
  return (
    <span className="flex flex-wrap justify-end gap-2">
      {ids.map((id) => (
        <Link
          key={id}
          href="/case/evidence"
          className="rounded-md bg-[#d8d3ca] px-3 py-1 font-mono text-xs hover:bg-[#f6deaa]"
        >
          {id}
        </Link>
      ))}
    </span>
  );
}
function RightRail() {
  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5">
        <div className="flex gap-3">
          <FileText className="size-7 text-[#745022]" />
          <h2 className="font-serif text-2xl font-semibold">
            Investigation audit trail
          </h2>
        </div>
        <ol className="mt-5 border-l-2 border-[#18afa3] pl-5">
          {audit.map((stage, index) => (
            <li key={stage} className="relative pb-5 last:pb-0">
              <span
                className={`absolute -left-[30px] top-1 grid size-4 place-items-center rounded-full border-2 ${index === audit.length - 1 ? "border-[#7b4696] bg-[#f4e8d0]" : "border-[#18afa3] bg-[#18afa3]"}`}
              />{" "}
              <b className="block text-sm">{stage}</b>
              <span
                className={`text-xs ${index === audit.length - 1 ? "text-[#7b4696]" : "text-[#006b54]"}`}
              >
                {index === audit.length - 1
                  ? "Awaiting your decision"
                  : "Completed"}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5">
        <h2 className="flex items-center gap-3 font-serif text-2xl font-semibold">
          <Gavel className="size-7 text-[#745022]" />
          Key evidence cited
        </h2>
        <div className="mt-4 divide-y divide-[#d8c4a0]">
          {[
            ["E-01", "Source-backed access record"],
            ["E-03", "Participant activity timeline"],
            ["E-05", "Connection record"],
          ].map(([id, text]) => (
            <Link
              href="/case/evidence"
              key={id}
              className="flex items-center gap-3 py-3 text-sm hover:text-[#006b54]"
            >
              <span className="rounded bg-[#d8d3ca] px-2 py-1 font-mono text-xs">
                {id}
              </span>
              <span className="flex-1">{text}</span>
              <span className="text-xs underline">View source</span>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}
function DecisionBar({
  status,
  setStatus,
  guidance,
  setGuidance,
  confirm,
  recorded,
}: {
  status: string;
  setStatus: (
    value: "awaiting" | "confirm-accept" | "confirm-reject" | "reinvestigate",
  ) => void;
  guidance: string;
  setGuidance: (value: string) => void;
  confirm: (value: "accepted" | "rejected") => void;
  recorded: boolean;
}) {
  const confirmState =
    status === "confirm-accept" || status === "confirm-reject";
  const reInvestigation = status === "reinvestigate";
  return (
    <section className="fixed inset-x-0 bottom-0 z-20 border-t border-[#b89b6e] bg-[#fbf2de]/95 p-4 shadow-[0_-10px_30px_rgba(20,11,5,.12)] backdrop-blur sm:left-[215px]">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3">
        <h2 className="mr-2 font-serif text-2xl font-semibold">
          Your decision
        </h2>
        {recorded ? (
          <p className="text-sm font-semibold text-[#006b54]">
            This decision is recorded and cannot be changed on this verdict.
          </p>
        ) : (
          <>
            <Button onClick={() => setStatus("confirm-accept")}>
              {" "}
              <CheckCircle2 className="size-4" />
              Accept proposal
            </Button>
            <Button
              variant="secondary"
              onClick={() => setStatus("confirm-reject")}
            >
              {" "}
              <X className="size-4" />
              Reject proposal
            </Button>
            <Button
              className="bg-[#e9d5ea] text-[#5f2f77] hover:bg-[#dec4e1]"
              onClick={() => setStatus("reinvestigate")}
            >
              <RefreshCw className="size-4" />
              Request re-investigation
            </Button>
          </>
        )}
        <AnimatePresence>
          {(confirmState || reInvestigation) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-[#d8c4a0] bg-[#fff8e9] p-3"
            >
              <p className="text-sm font-semibold">
                {confirmState
                  ? `Confirm: this ${status === "confirm-accept" ? "acceptance" : "rejection"} cannot be changed on this verdict.`
                  : "Provide direction for the parallel specialists. Existing evidence will be reused."}
              </p>
              {reInvestigation && (
                <>
                  <label className="sr-only" htmlFor="guidance">
                    Guidance note
                  </label>
                  <input
                    id="guidance"
                    value={guidance}
                    onChange={(event) => setGuidance(event.target.value)}
                    placeholder="Required guidance note"
                    className="min-w-56 flex-1 rounded border border-[#b89b6e] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7b4696]"
                  />
                  <Link
                    href="/case/agents"
                    onClick={(event) => {
                      if (!guidance.trim()) event.preventDefault();
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-bold ${guidance.trim() ? "bg-[#7b4696] text-white" : "bg-[#d8c4a0] text-[#5c5145]"}`}
                  >
                    Start re-investigation
                  </Link>
                  {!guidance.trim() && (
                    <span className="text-xs text-[#b3261e]">
                      Guidance is required.
                    </span>
                  )}
                </>
              )}
              {confirmState && (
                <>
                  <Button
                    onClick={() =>
                      confirm(
                        status === "confirm-accept" ? "accepted" : "rejected",
                      )
                    }
                  >
                    Confirm decision
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setStatus("awaiting")}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
