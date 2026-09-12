# README Claims Ledger

Verification record for the public README, created 2026-09-11.

| Claim | Verdict | Source | Fix / note | Flags to |
| --- | --- | --- | --- | --- |
| The project is a beginner-friendly multi-agent system for fictional mysteries. | VERIFIED | `docs/project-brief/PS.md`; deterministic acceptance tests | The README describes the delivered pipeline and target workspace. | — |
| The Python pipeline and Gradio reference UI are runnable after installing declared dependencies. | VERIFIED | `app.py`; `requirements.txt`; deterministic interface-construction test | The README labels Gradio as the current migration reference. | — |
| The named agent roles, bounded Skeptic revision, citations, confidence, and human review are delivered behavior. | VERIFIED | GitHub master issue #1; deterministic acceptance tests | Verdict language remains a human-review proposal. | — |
| Python orchestration, provider-agnostic LLM access, deterministic tests, and a Gradio reference UI are delivered. | VERIFIED | `requirements.txt`; `llm_client.py`; full pytest suite | Live providers remain an optional credential-backed manual check. | — |
| Next.js is the target presentation layer. | VERIFIED | `docs/project-brief/PS.md`; ADR 0001; `sherlok-nextjs/package.json` | The README does not claim that frontend/backend integration is delivered. | — |
| The Next.js workspace is scaffolded and designed but not connected to Python. | VERIFIED | `sherlok-nextjs/app/page.tsx`; `sherlok-nextjs/design.md`; `sherlok-nextjs/public/Mock-Up/` | Keep this status current as migration slices ship. | — |
| No license exists yet. | VERIFIED | Workspace file inventory | README cautions against assuming reuse permission. | — |
