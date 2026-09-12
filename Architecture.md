# Architecture

This application is a Python-orchestrated, Next.js multi-agent investigation
demo. The Next.js workspace is the target presentation layer. The existing
Gradio adapter remains runnable only while the migration reaches behavior
parity.
The product requirements and work tracking are in
[GitHub master issue #1](https://github.com/codesuke/Sherlok/issues/1).
The detailed pipeline is recorded in the implemented design specification.

## File Structure

```text
/
├── AGENTS.md                         # Agent working agreement
├── Architecture.md                    # This guide
├── CONTEXT.md                         # Domain glossary
├── app.py                             # Legacy Gradio adapter during migration
├── api.py                             # Planned Python HTTP/event adapter
├── case_file.py                       # Shared domain state and schemas
├── case_material.py                   # Deterministic source-preserving intake
├── llm_client.py                      # Provider-agnostic LLM boundary
├── orchestrator.py                    # Pipeline and streaming coordination
├── agents/                            # One isolated responsibility per agent
│   ├── collector.py
│   ├── suspect_analyst.py
│   ├── timeline_reconciler.py
│   ├── skeptic.py
│   └── lead_detective.py
├── tests/                             # Unit tests and a deterministic E2E test
├── sherlok-nextjs/                    # Next.js investigation workspace
├── docs/
│   ├── adr/
│   ├── agents/
│   ├── project-brief/
│   ├── qna/
│   ├── reference-material/
│   ├── specs-implemented/
│   ├── specs-planned/
│   └── templates/
└── .agents/skills/                    # Focused vendored development skills
```

## Runtime Shape

```text
Browser
  |
  v
Next.js investigation workspace
  |  commands: start, decide, re-investigate
  |  reads: snapshot + server-sent investigation events
  v
Python application interface
  |
  +--> orchestrator.py --> agents/ --> provider-agnostic LLM interface
  |
  +--> case_material.py / case_file.py
```

The UI visualizes observable investigation events and evidence-linked results.
It never displays hidden model reasoning. REST is used for commands and
snapshots. Server-sent events are used for the one-way live progress stream.
The Python runtime owns case state, validation, orchestration, and provider
configuration.

## Dependency Boundaries

- `sherlok-nextjs/` presents case-material input, normalized sources, workflow
  progress, evidence-linked outputs, the proposed verdict, and human review
  controls. It does not contain provider calls or investigation reasoning.
- The planned Python transport adapter converts HTTP commands into application
  calls and domain events into transport records. It does not decide pipeline
  order or format UI markup.
- `app.py` is the legacy Gradio adapter. Do not add new product behavior to it
  unless needed to preserve migration parity.
- `orchestrator.py` owns ordering, parallel work, the bounded revision loop,
  and streaming events. It turns both provider/schema failures and agent
  validation failures from parallel specialists into visible, named step
  failures before halting dependent stages.
- Modules under `agents/` read and update only their assigned CaseFile section
  through their `run(case_file)` contract.
- `llm_client.py` is the only layer allowed to import a concrete LLM provider.
- `EnvLLMClient` resolves the provider selected in the UI against shell and
  local `.env` configuration. The UI never receives credentials or model
  settings, and the client never writes configuration to process environment
  state or investigation data.
- Tests mock the LLM boundary rather than prompts or provider SDKs.

## Case-material intake

`case_material.py` is the Case File Curator module. It deterministically
normalizes pasted text, Markdown, DOCX, and text-based PDFs into typed source blocks, retains safe
source references, and produces readable canonical material before Evidence
Collection. The current slice supports PDF, DOCX, Markdown, and plain text.
PDF extraction uses the pinned local `pdf-inspector` adapter: blocks retain
1-based page locations, uncertain table reconstruction is visibly labeled,
and OCR-required, malformed, encrypted, or empty PDF material is excluded
with a safe warning. OCR is never enabled. The Curator treats material as
untrusted content and performs no detective reasoning.

Evidence Collection accepts only displayed, case-local source reference IDs.
If a provider supplies a placeholder or unknown source reference, the
Collector requests one corrected evidence response; a repeated invalid
reference remains a visible step failure.
The Timeline Reconciler likewise makes one correction request when its output
cites an evidence ID outside the collected case-file evidence.
The Skeptic recognizes exact claim statements embedded in its own rendered
specialist lines, and otherwise makes one correction request when a finding
does not identify a statement made by the specialist it targets.
The Suspect Analyst and Lead Detective likewise make one correction request
when their structured output violates an evidence-citation or verdict contract.

## Case-Agnostic Boundary

- Runtime modules accept arbitrary fictional mystery text and structured
  outputs; they do not encode Aurora Diamond suspects, evidence IDs, times,
  counts, or conclusions.
- The Aurora Diamond case is a reference fixture and evaluation benchmark,
  not application configuration or hidden prompt context.
- A second unrelated mystery fixture verifies that the complete pipeline does
  not depend on the reference case's shape or vocabulary.

## Where New Code Belongs

- Add a reusable investigation data type to `case_file.py`.
- Add a specialist's reasoning and output schema under `agents/`.
- Add pipeline control flow or stream events to `orchestrator.py`.
- Add transport-only behavior to the Python HTTP/event adapter.
- Add user interaction and rendering to `sherlok-nextjs/`.
- Keep `app.py` stable as a temporary migration reference.
- Add deterministic behavior tests in `tests/`, mirroring the public module
  under test.

## Migration Status

- Delivered: Python agent pipeline and Gradio reference adapter.
- Prepared: Next.js scaffold, visual direction, and seven case-agnostic screen
  contracts.
- Planned: typed Python application interface, HTTP/event adapter, Next.js
  integration, parity tests, and Gradio retirement.

The active migration contract is
[`docs/specs-planned/2026-09-12-nextjs-investigation-workspace.md`](docs/specs-planned/2026-09-12-nextjs-investigation-workspace.md).
The durable stack decision is
[`docs/adr/0001-nextjs-presentation-python-orchestration.md`](docs/adr/0001-nextjs-presentation-python-orchestration.md).
