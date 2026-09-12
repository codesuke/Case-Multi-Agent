import { CaseWorkspace } from "@/components/investigation/case-workspace";

export default async function CaseOverviewPage({ searchParams }: { searchParams: Promise<{ investigation_id?: string }> }) {
  const { investigation_id: investigationId } = await searchParams;
  return investigationId ? <CaseWorkspace investigationId={investigationId} view="overview" /> : <MissingInvestigation />;
}

function MissingInvestigation() { return <main className="p-6">Start an investigation before opening its case file.</main>; }
