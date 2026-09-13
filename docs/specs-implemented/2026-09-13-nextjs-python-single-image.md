# Sherlok Next.js and Agent-Orchestration Delivery

## Status

Delivered — 2026-09-13

## Outcome

Sherlok is delivered as one self-contained application under
`sherlok-nextjs/`. The presentation module uses Next.js. The
`agent-orchestration/` module uses Python for Case File curation, investigation
workflow control, validation, and LLM access.

## Runtime contract

- Browser requests use same-origin Next.js routes only.
- Next.js proxies commands, snapshots, and server-sent events to FastAPI.
- FastAPI binds to `127.0.0.1:8000`; Next.js exposes the public `PORT`, which
  defaults to `3000`.
- The Docker entrypoint exits the container if either runtime process exits.
- One workspace `.env` template documents local configuration. Deployment
  variables are configured once and inherited by both processes.

## Product contract

- The Case File Curator accepts pasted material and supported uploads while
  retaining safe source references.
- Evidence Collection precedes parallel Suspect Analysis and Timeline
  Reconciliation.
- The Skeptic may request at most one revision round.
- The Lead Detective produces an evidence-cited verdict proposal that awaits a
  Human Decision.
- Public events expose workflow state and safe summaries, never hidden model
  reasoning or credentials.

## Verification

- Python application and transport behavior are tested against mocked LLM
  transports.
- The generated OpenAPI contract remains aligned with Next.js transport types.
- The Next.js browser journey covers material submission, visible progress,
  evidence inspection, human decision, and guided re-investigation.
