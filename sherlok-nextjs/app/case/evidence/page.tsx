import { CaseWorkspace } from "@/components/investigation/case-workspace";

export default async function EvidencePage({ searchParams }: { searchParams: Promise<{ investigation_id?: string }> }) {
  const { investigation_id: investigationId } = await searchParams;
  return investigationId ? <CaseWorkspace investigationId={investigationId} view="evidence" /> : <main className="p-6">Start an investigation before opening evidence.</main>;
}
