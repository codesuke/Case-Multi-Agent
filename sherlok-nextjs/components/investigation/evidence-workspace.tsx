"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FileSearch,
  FileText,
  FolderOpen,
  ListFilter,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  Waypoints,
  X,
} from "lucide-react";
import Link from "next/link";
import { SherlokMark } from "@/components/investigation/sherlok-mark";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Classification = "Observed fact" | "Inference";
type Evidence = {
  id: string;
  statement: string;
  classification: Classification;
  source: string;
  location: string;
  detail: string;
};

const evidence: Evidence[] = [
  {
    id: "E-01",
    statement:
      "A supplied record describes access outside the expected time window.",
    classification: "Observed fact",
    source: "Case record",
    location: "Section 3",
    detail:
      "The supplied record identifies an access event outside the stated schedule. It is retained as an observed item because the source directly reports the event.",
  },
  {
    id: "E-02",
    statement:
      "The available account suggests a system may not have been operating at the relevant time.",
    classification: "Inference",
    source: "Technical note",
    location: "Lines 45–52",
    detail:
      "The source does not directly establish system state. This item preserves the collector’s inference so it can be challenged in the next workflow stage.",
  },
  {
    id: "E-03",
    statement:
      "A source describes an impression consistent with material recovered at the scene.",
    classification: "Observed fact",
    source: "Forensic summary",
    location: "Figure 2",
    detail:
      "This item records a source-reported observation. Its meaning and relationship to people or events remain open for analysis.",
  },
  {
    id: "E-04",
    statement:
      "A communication record may indicate prior coordination between relevant individuals.",
    classification: "Inference",
    source: "Communications record",
    location: "Lines 101–118",
    detail:
      "The collector marked this as an inference because the significance of the communication requires specialist assessment.",
  },
];

const nav = [
  ["Overview", FolderOpen, "/case/overview"],
  ["Evidence", FileText, "/case/evidence"],
  ["Timeline", Timer, "#"],
  ["Analysis", Waypoints, "#"],
  ["Agent Workspace", Sparkles, "/agent-workspace"],
] as const;

export function EvidenceWorkspace() {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState("source");
  const [selected, setSelected] = useState<Evidence | null>(evidence[0]);
  const filtered = useMemo(
    () =>
      evidence
        .filter(
          (item) =>
            (classification === "all" ||
              item.classification === classification) &&
            (source === "all" || item.source === source) &&
            `${item.id} ${item.statement}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "id"
            ? a.id.localeCompare(b.id)
            : sort === "classification"
              ? a.classification.localeCompare(b.classification)
              : a.source.localeCompare(b.source),
        ),
    [classification, query, sort, source],
  );
  function clearFilters() {
    setQuery("");
    setClassification("all");
    setSource("all");
  }
  return (
    <main className="min-h-[100dvh] bg-[#24160e] text-[#f8ebd2]">
      <div className="paper-noise pointer-events-none fixed inset-0" />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[225px_minmax(0,1fr)]">
        <EvidenceNav />
        <div className="min-w-0">
          <EvidenceTopbar query={query} setQuery={setQuery} />
          <section className="bg-[#24160e] px-4 py-7 sm:px-7 lg:min-h-[calc(100dvh-76px)] lg:px-6 lg:py-5">
            <div className="mx-auto grid max-w-[1400px] gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
              <div className="min-w-0">
                <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow text-[#f4b941]">Evidence collector</p>
                    <h1 className="mt-1 font-serif text-4xl font-semibold text-[#f8ebd2]">
                      Evidence
                    </h1>
                    <p className="mt-1 text-[15px] text-[#d8c4a0]">
                      Trace every item to its participant source.
                    </p>
                  </div>
                  <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
                    <Filter
                      value={classification}
                      onChange={setClassification}
                      label="All classifications"
                    >
                      <SelectItem value="all">All classifications</SelectItem>
                      <SelectItem value="Observed fact">
                        Observed facts
                      </SelectItem>
                      <SelectItem value="Inference">Inferences</SelectItem>
                    </Filter>
                    <Filter
                      value={source}
                      onChange={setSource}
                      label="All sources"
                    >
                      <SelectItem value="all">All sources</SelectItem>
                      {[...new Set(evidence.map((item) => item.source))].map(
                        (name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ),
                      )}
                    </Filter>
                    <Filter
                      value={sort}
                      onChange={setSort}
                      label="Source order"
                    >
                      <SelectItem value="source">Source order</SelectItem>
                      <SelectItem value="id">Evidence ID</SelectItem>
                      <SelectItem value="classification">
                        Classification
                      </SelectItem>
                    </Filter>
                  </div>
                </header>
                <SourcePanel />
                <EvidenceList
                  items={filtered}
                  selected={selected}
                  select={setSelected}
                  clear={clearFilters}
                />
                <AnimatePresence>
                  {selected && (
                    <EvidenceDetail
                      item={selected}
                      close={() => setSelected(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
              <EvidenceRail />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function EvidenceNav() {
  return (
    <aside className="hidden border-r border-[#745022]/65 bg-[#24160e]/95 p-5 lg:flex lg:flex-col">
      <Link
        href="/"
        className="flex items-center gap-3 font-serif text-[28px] font-semibold tracking-wide"
      >
        <SherlokMark />
        Sherlok
      </Link>
      <nav className="mt-10 space-y-1" aria-label="Case navigation">
        {nav.map(([label, Icon, href]) => (
          <Link
            key={label}
            href={href}
            aria-current={label === "Evidence" ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${label === "Evidence" ? "border-l-2 border-[#f4b941] bg-[#5a3b18]/70 font-semibold text-[#f4b941]" : "text-[#f8ebd2] hover:bg-[#f8ebd2]/10"}`}
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
function EvidenceTopbar({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <header className="flex min-h-[76px] items-center gap-4 border-b border-[#745022] bg-[#24160e]/95 px-4 sm:px-7 lg:px-6">
      <label className="flex flex-1 items-center gap-3 rounded-lg border border-[#745022] bg-[#382315] px-4 py-3 text-[#d8c4a0]">
        <Search className="size-5 shrink-0 text-[#f4b941]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search evidence…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#f8ebd2] outline-none placeholder:text-[#d8c4a0]/70"
          aria-label="Search case evidence"
        />
      </label>
      <div className="hidden items-center gap-2 text-sm font-semibold text-[#18afa3] sm:flex">
        <span className="size-2.5 rounded-full bg-[#18afa3]" />
        Collection complete
      </div>
      <div className="hidden rounded-lg border border-[#745022] bg-[#382315] px-4 py-2.5 text-sm font-semibold md:block">
        Case file
      </div>
    </header>
  );
}
function Filter({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-[#382315]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
function SourcePanel() {
  return (
    <section className="mb-3 rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5 text-[#1e2831]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-4">
          <span className="grid size-14 place-items-center rounded-lg border border-[#d8c4a0] bg-[#f4e8d0] text-[#745022]">
            <FileText className="size-7" />
          </span>
          <div>
            <h2 className="font-serif text-xl font-semibold">
              Source material
            </h2>
            <p className="mt-1 text-sm text-[#5c5145]">
              Participant material · Source locations available
            </p>
            <p className="mt-2 max-w-xl text-sm leading-5 text-[#5c5145]">
              The collection is limited to supplied participant material. Open a
              source to inspect its canonical location.
            </p>
          </div>
        </div>
        <Button variant="secondary" className="min-h-10">
          Open material <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}
function EvidenceList({
  items,
  selected,
  select,
  clear,
}: {
  items: Evidence[];
  selected: Evidence | null;
  select: (item: Evidence) => void;
  clear: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#745022] bg-[#1c120c]">
      <div className="hidden grid-cols-[92px_minmax(250px,1fr)_190px_200px_36px] gap-3 border-b border-[#745022] px-5 py-3 text-xs font-semibold uppercase tracking-[.08em] text-[#d8c4a0] md:grid">
        <span>ID</span>
        <span>Statement</span>
        <span>Classification</span>
        <span>Source reference</span>
        <span />
      </div>
      {items.length ? (
        <div>
          {items.map((item, index) => (
            <motion.button
              layout
              key={item.id}
              onClick={() => select(item)}
              className={`grid w-full gap-3 border-b border-[#745022]/70 px-5 py-4 text-left transition last:border-0 md:grid-cols-[92px_minmax(250px,1fr)_190px_200px_36px] ${selected?.id === item.id ? "bg-[#18afa3]/15 ring-1 ring-inset ring-[#18afa3]" : "hover:bg-[#382315]"}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <span className="font-mono text-sm font-bold text-[#f8ebd2]">
                {item.id}
              </span>
              <span className="text-sm leading-5 text-[#f8ebd2]">
                {item.statement}
              </span>
              <ClassificationBadge type={item.classification} />
              <span className="flex gap-2 text-sm text-[#d8c4a0]">
                <FileText className="mt-0.5 size-4 shrink-0 text-[#f4b941]" />
                <span>
                  <b className="block font-medium text-[#f8ebd2]">
                    {item.source}
                  </b>
                  <small>{item.location}</small>
                </span>
              </span>
              <ChevronRight className="hidden size-5 self-center text-[#d8c4a0] md:block" />
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="grid min-h-56 place-items-center p-6 text-center">
          <div>
            <FileSearch className="mx-auto size-8 text-[#f4b941]" />
            <h2 className="mt-3 font-serif text-2xl">No matching evidence</h2>
            <p className="mt-1 max-w-sm text-sm leading-5 text-[#d8c4a0]">
              The active filters do not match any currently loaded evidence.
            </p>
            <Button variant="secondary" className="mt-4" onClick={clear}>
              Clear filters
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
function ClassificationBadge({ type }: { type: Classification }) {
  const observed = type === "Observed fact";
  return (
    <span
      className={`flex h-fit w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${observed ? "border-[#18afa3] bg-[#18afa3]/15 text-[#56e1d4]" : "border-[#f4b941] bg-[#f4b941]/10 text-[#f6cc6c]"}`}
    >
      <span
        className={`size-2 rounded-full ${observed ? "bg-[#18afa3]" : "bg-[#f4b941]"}`}
      />
      {type}
    </span>
  );
}
function EvidenceDetail({
  item,
  close,
}: {
  item: Evidence;
  close: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mt-3 rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5 text-[#1e2831] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#d8c4a0] pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-2xl font-semibold">{item.id}</h2>
          <ClassificationBadge type={item.classification} />
        </div>
        <button
          onClick={close}
          className="rounded p-1 text-[#5c5145] hover:bg-[#eedfc2]"
          aria-label="Close evidence detail"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="grid gap-6 pt-5 lg:grid-cols-[1.45fr_1fr_1fr]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[.08em] text-[#745022]">
            Statement
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6">
            {item.statement}
          </p>
          <h3 className="mt-5 text-xs font-bold uppercase tracking-[.08em] text-[#745022]">
            Details
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#5c5145]">{item.detail}</p>
        </div>
        <div className="border-[#d8c4a0] lg:border-l lg:pl-6">
          <h3 className="text-xs font-bold uppercase tracking-[.08em] text-[#745022]">
            Source reference
          </h3>
          <div className="mt-3 flex gap-3">
            <FileText className="size-5 shrink-0 text-[#745022]" />
            <p className="text-sm">
              <b className="block">{item.source}</b>
              <span className="text-[#5c5145]">{item.location}</span>
            </p>
          </div>
          <Button variant="secondary" className="mt-4 min-h-9 px-3 text-xs">
            Open source location
          </Button>
        </div>
        <div className="border-[#d8c4a0] lg:border-l lg:pl-6">
          <h3 className="text-xs font-bold uppercase tracking-[.08em] text-[#745022]">
            Traceability path
          </h3>
          <ol className="mt-3 space-y-3">
            {["Supplied source", "Canonical block", "Evidence item"].map(
              (step, index) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#18afa3] text-white">
                    <Check className="size-3" />
                  </span>
                  <span>
                    <b className="block">{step}</b>
                    <small className="text-[#5c5145]">
                      {index === 2 ? item.id : item.source}
                    </small>
                  </span>
                </li>
              ),
            )}
          </ol>
        </div>
      </div>
    </motion.section>
  );
}
function EvidenceRail() {
  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-[#745022] bg-[#382315] p-5">
        <div className="flex items-center gap-3 border-b border-[#745022] pb-4">
          <Sparkles className="size-5 text-[#18afa3]" />
          <h2 className="font-serif text-xl font-semibold">
            Evidence Collector
          </h2>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full border-2 border-[#18afa3] text-[#18afa3]">
            <Check className="size-6" />
          </span>
          <span>
            <b className="text-[#56e1d4]">Completed</b>
            <p className="mt-1 text-sm leading-5 text-[#d8c4a0]">
              Available sources processed and classified.
            </p>
          </span>
        </div>
        <ol className="mt-5 space-y-3">
          {[
            "Sources ingested",
            "Evidence extracted",
            "Classifications applied",
            "Source references checked",
            "Ready for analysis",
          ].map((item) => (
            <li className="flex gap-3 text-sm text-[#f8ebd2]" key={item}>
              <CheckCircle2 className="size-5 shrink-0 text-[#18afa3]" />
              {item}
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-lg border border-[#b3261e]/55 bg-[#382315] p-5">
        <div className="flex gap-3 text-[#ff9a91]">
          <AlertTriangle className="size-6 shrink-0" />
          <h2 className="font-serif text-xl font-semibold">Material warning</h2>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#d8c4a0]">
          Some supplied material may be incomplete. This can affect coverage of
          the evidence set.
        </p>
      </section>
      <section className="rounded-lg border border-[#745022] bg-[#382315] p-5">
        <div className="flex gap-3">
          <ListFilter className="size-5 text-[#f4b941]" />
          <div>
            <h2 className="font-serif text-xl font-semibold">Next step</h2>
            <div className="my-4 border-t border-[#745022]" />
            <Link
              href="#"
              className="flex items-center gap-3 text-sm font-bold text-[#f4b941]"
            >
              Review specialist analysis <ArrowRight className="size-4" />
            </Link>
            <p className="mt-2 text-xs leading-5 text-[#d8c4a0]">
              Examine how evidence supports or conflicts with key claims.
            </p>
          </div>
        </div>
      </section>
    </aside>
  );
}
