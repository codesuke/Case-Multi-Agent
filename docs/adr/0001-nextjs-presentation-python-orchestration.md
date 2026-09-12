# Next.js Presentation with Python Orchestration

Sherlok needs a richer workspace that helps a user follow agent collaboration,
inspect evidence, and review a proposed verdict. Use Next.js for the
presentation layer and retain Python for case processing and agent
orchestration. Connect them through a typed HTTP and event-stream seam.

## Status

accepted — 2026-09-12

## Considered Options

- Continue with one Python/Gradio process. This keeps deployment simple but
  limits the intended multi-view investigation experience.
- Move the full application to TypeScript. This unifies the runtime but would
  rewrite a tested Python pipeline and weaken locality around the existing AI
  and document-processing modules.
- Use Next.js for presentation and Python for orchestration. This preserves the
  tested domain implementation and gives the UI a suitable application shell,
  navigation model, and interaction system.

## Decision

- `sherlok-nextjs/` owns browser interaction and rendering.
- Python owns case state, case-material processing, workflow control, agent
  execution, validation, and LLM provider access.
- A small Python application interface sits behind a transport adapter. Its
  operations start an investigation, read a snapshot, stream observable
  events, record a human decision, and request re-investigation.
- REST carries commands and snapshots. Server-sent events carry live one-way
  progress. The event stream contains status, safe summaries, failures, and
  evidence references. It never contains hidden model reasoning.
- The Next.js server is the browser-facing adapter and proxies Python requests.
  Browser code never receives provider credentials or an internal Python URL.
- Gradio remains a temporary reference adapter until the Next.js critical
  journey has behavior parity. It is then removed in a separate, reversible
  cleanup slice.

## Consequences

- The project has two runtimes and needs local commands for both.
- Shared transport schemas must be versioned and tested at the seam.
- Live visualization can evolve without moving orchestration into UI code.
- Python tests remain focused on domain behavior. Frontend tests focus on what
  the user can see and do.
- The first version may keep investigation state in one Python process. Durable
  persistence and multi-instance recovery remain outside the demonstration
  scope.
