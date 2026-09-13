import Link from "next/link";

type CaseView = "overview" | "evidence" | "timeline" | "analysis" | "verdict";

const caseViews: { label: string; view: CaseView }[] = [
  { label: "Case overview", view: "overview" },
  { label: "Evidence", view: "evidence" },
  { label: "Timeline", view: "timeline" },
  { label: "Analysis", view: "analysis" },
  { label: "Proposed verdict", view: "verdict" },
];

export function CaseNavigation({ currentView, investigationId }: { currentView: CaseView; investigationId: string }) {
  return (
    <nav className="mt-4 flex flex-wrap gap-3 text-sm font-semibold" aria-label="Case navigation">
      <Link className="text-[#006b54] hover:underline" href={`/agent-workspace?investigation_id=${encodeURIComponent(investigationId)}`}>Agent Workspace</Link>
      {caseViews.map(({ label, view }) => (
        <Link aria-current={view === currentView ? "page" : undefined} className={view === currentView ? "underline" : "text-[#006b54] hover:underline"} href={`/case/${view}?investigation_id=${encodeURIComponent(investigationId)}`} key={view}>{label}</Link>
      ))}
    </nav>
  );
}
