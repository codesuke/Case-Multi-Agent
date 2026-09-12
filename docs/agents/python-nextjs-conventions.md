# Python and Next.js Conventions

Rules for Sherlok's Python orchestration runtime and Next.js presentation
layer. Historical Gradio work follows `python-gradio-conventions.md` only while
the reference adapter remains in the repository.

## Ownership and Seams

- Python owns domain rules, case state, agent prompts, orchestration, retries,
  validation, provider configuration, and document processing.
- Next.js owns routes, navigation, interaction state, accessibility, and
  rendering. It must not duplicate investigation rules.
- Keep the Python application interface small: start, snapshot, events,
  decision, and re-investigation.
- Keep HTTP and server-sent-event details in adapters. Domain modules must not
  depend on FastAPI, Next.js, React, or transport payloads.
- Generate or validate TypeScript transport types from one versioned schema.
  Do not maintain matching Python and TypeScript shapes by memory.

## Python Runtime

- Keep provider SDK imports and credentials inside `llm_client.py`.
- Use typed dataclasses or Pydantic models for domain and transport data.
- Preserve evidence IDs and safe source references end to end.
- Emit observable lifecycle events. Do not emit hidden chain-of-thought, raw
  provider responses, secrets, or filesystem paths.
- Keep independent specialist work concurrent and the Skeptic revision round
  bounded as specified by the orchestrator.
- Return predictable, sanitized errors that identify the failed stage and a
  safe recovery action.

## Next.js Workspace

- Read `sherlok-nextjs/AGENTS.md` and the installed, version-matched Next.js
  documentation before changing framework code.
- Prefer Server Components for read-only initial data. Add Client Components
  only for uploads, streaming state, navigation interaction, drawers, and
  human decisions.
- Keep browser requests behind same-origin Next.js adapters. Never expose LLM
  credentials or internal runtime configuration to client bundles.
- Model the screen as a projection of the investigation snapshot plus ordered
  events. Do not infer domain truth from presentation state.
- Keep evidence chips keyboard accessible. Use text and icons as well as color
  for status, evidence type, and errors.
- Preserve an honest queued, working, revising, failed, or awaiting-review
  state for every workflow stage.

## Testing

- Test Python behavior through the application interface before transport.
- Add transport contract tests for every command, snapshot, event, and error.
- Test React behavior with deterministic fixtures at the same seam.
- Use browser tests for the critical journey: submit material, observe agent
  progress, inspect cited evidence, review the verdict, and request a guided
  re-investigation.
- Do not require live provider calls in unit, contract, or browser tests.
