import Link from "next/link";

export default function AgentWorkspace() {
  return <main className="grid min-h-[100dvh] place-items-center bg-[#24160e] p-6 text-[#f8ebd2]"><section className="max-w-lg rounded-xl border border-[#745022] bg-[#382315] p-8 shadow-[0_20px_50px_rgba(14,7,3,.35)]"><p className="eyebrow text-[#f4b941]">Case file prepared</p><h1 className="mt-3 font-serif text-4xl font-semibold">Agent Workspace</h1><p className="mt-4 leading-6 text-[#d8c4a0]">The participant material is ready for collection and analysis. The live investigation workspace is the next UI slice.</p><Link href="/" className="mt-7 inline-flex rounded-[8px] bg-[#18afa3] px-4 py-3 text-sm font-semibold text-[#24160e]">Return to start</Link></section></main>;
}
