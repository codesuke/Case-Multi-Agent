import { CaseWorkspace } from "@/components/investigation/case-workspace";

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<{ investigation_id?: string }> }) {
  const { investigation_id: investigationId } = await searchParams;
  return investigationId ? <CaseWorkspace investigationId={investigationId} view="analysis" /> : <main className="p-6">Start an investigation before opening analysis.</main>;
}
