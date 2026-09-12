import { LiveAgentWorkspace } from "@/components/investigation/live-agent-workspace";

export default async function AgentWorkspacePage({ searchParams }: { searchParams: Promise<{ investigation_id?: string }> }) {
  const { investigation_id: investigationId } = await searchParams;
  if (!investigationId) return <main className="min-h-screen bg-[#24160e] p-6 text-[#f8ebd2]"><h1 className="font-serif text-4xl">Agent Workspace</h1><p className="mt-3">Start an investigation to view its live progress.</p></main>;
  return <LiveAgentWorkspace investigationId={investigationId} />;
}
