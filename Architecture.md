# Architecture

This application is a Python/Gradio multi-agent investigation demo.
The product requirements and work tracking are in
[GitHub master issue #1](https://github.com/codesuke/Case-Multi-Agent/issues/1).
The detailed pipeline is recorded in the implemented design specification.

## File Structure

```text
/
├── AGENTS.md                         # Agent working agreement
├── Architecture.md                    # This guide
├── CONTEXT.md                         # Domain glossary
├── app.py                             # Gradio presentation layer
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

## Dependency Boundaries

- `app.py` presents case-material input, normalization results, progress,
  verdict, and human review controls. It does not contain provider calls or
  investigation reasoning.
- `orchestrator.py` owns ordering, parallel work, the bounded revision loop,
  and streaming events.
- Modules under `agents/` read and update only their assigned CaseFile section
  through their `run(case_file)` contract.
- `llm_client.py` is the only layer allowed to import a concrete LLM provider.
- `EnvLLMClient` resolves shell and local `.env` configuration before a
  session-only UI fallback; it never writes credentials to process environment
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
- Add UI-only behavior to `app.py`.
- Add deterministic behavior tests in `tests/`, mirroring the public module
  under test.
