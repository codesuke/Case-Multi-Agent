import { CaseWorkspace } from "@/components/investigation/case-workspace";

export default async function VerdictPage({ searchParams }: { searchParams: Promise<{ investigation_id?: string }> }) {
  const { investigation_id: investigationId } = await searchParams;
  return investigationId ? <CaseWorkspace investigationId={investigationId} view="verdict" /> : <main className="p-6">Start an investigation before reviewing a verdict.</main>;
}
