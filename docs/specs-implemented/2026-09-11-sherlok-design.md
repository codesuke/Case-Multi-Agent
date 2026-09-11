# Sherlok — Design

> **Implementation status:** Shipped. This document records the delivered
> case-agnostic pipeline and its test seams; new product work requires a new
> planned specification.

## Problem

A single AI assistant can rush to conclusions, overlook evidence, repeat
assumptions, or sound confident without enough proof. This project builds a
beginner-friendly multi-agent system where specialized AI "detectives"
analyze a fictional mystery, share findings through an orchestration
workflow, challenge weak assumptions, and produce an evidence-based verdict
for human review.

## Goals / Non-goals

- Goal: demonstrate multi-agent collaboration (specialization, sharing,
  challenge/verification, grounded conclusions) on a toy but realistic task.
- Goal: keep it simple enough for a beginner to read and extend.
- Non-goal: production-grade robustness, auth, persistence, or multi-user
  support. This is a demo/learning project.

## Reference case

*The Vanishing Aurora Diamond Case Book* is the authoritative end-to-end
scenario for planning, demonstration, and acceptance evaluation. Use its
participant portion as investigation input. Do not give the sealed
facilitator solution to any agent; use that section only to evaluate the
quality and uncertainty of the produced verdict.

The workshop roles map to the application roles as follows:

- Evidence → Evidence Collector
- Detective → Timeline Reconciler
- Suspect → Suspect Analyst
- Skeptic → Skeptic/Challenger
- Chief → Lead Detective

The reference case does not replace free-form mystery input. It is a stable
acceptance scenario for a system that must continue to accept other fictional
mysteries.

No production prompt, schema, orchestration branch, or UI component can
hard-code its suspects, evidence IDs, timestamps, expected culprit, or item
counts. Tests must include a second unrelated fictional mystery with different
names, evidence identifiers, and timeline structure to detect case-specific
behavior.

## Architecture

```
Gradio UI (input textbox + live transcript + verdict panel)
        │
        ▼
Orchestrator (Python, sequential pipeline with one feedback loop)
        │
   1. Evidence Collector          (parses mystery → structured clue list)
        │
   ┌────┴────────┐
   ▼             ▼
2. Suspect        3. Timeline
   Analyst           Reconciler        (run in parallel on evidence)
   │                 │
   └────────┬────────┘
            ▼
4. Skeptic/Challenger   (flags unsupported claims → may bounce back once)
            ▼
5. Lead Detective        (final verdict, cites evidence IDs, confidence score)
            ▼
Human review (Accept / Reject / Re-investigate button in Gradio)
```

## Components

### LLM wrapper (`llm_client.py`)
- Single function: `call_llm(prompt, system, response_schema) -> dict`.
- Provider (Gemini or GPT) selected via env var / config, not hardcoded —
  agent code never talks to a provider SDK directly.
- On malformed/non-JSON output: one retry with a stricter reformatting
  prompt; if that also fails, raise a visible error (no silent failure).

### Shared state (`case_file.py`)
- Single `CaseFile` dataclass: evidence list, suspect profiles, timeline,
  skeptic flags, final verdict.
- Passed through the whole pipeline. Each agent reads the fields it needs
  and appends to its own section — agents never mutate another agent's
  section.

### Agents (`agents/`)
Each agent is a class with one method `run(case_file) -> case_file`, a
fixed system prompt, and a required JSON output schema. Every claim an
agent produces must cite the `evidence_ids` it is based on — this is the
mechanism that prevents ungrounded conclusions.

1. **Evidence Collector** (`collector.py`) — parses the raw mystery text
   into a structured, ID-tagged list of facts/clues, tagging each as
   observed fact vs. inference.
2. **Suspect Analyst** (`suspect_analyst.py`) — builds motive/opportunity
   profiles per suspect, citing evidence IDs.
3. **Timeline Reconciler** (`timeline_reconciler.py`) — checks temporal/
   logical consistency across clues, flags gaps or contradictions.
4. **Skeptic/Challenger** (`skeptic.py`) — reviews Analyst + Reconciler
   output, flags claims with weak or missing evidence citations. May send
   the case back to Analyst/Reconciler for one revision round.
5. **Lead Detective** (`lead_detective.py`) — synthesizes everything into a
   final ranked verdict with evidence citations and a confidence score.
   Only runs after the Skeptic has signed off (or after the one retry).

### Orchestrator (`orchestrator.py`)
- Runs the fixed sequence above.
- Analyst and Timeline Reconciler run concurrently (`asyncio.gather` or
  threads) since they're independent given the same evidence list.
- Skeptic gets exactly one feedback loop back to Analyst/Reconciler —
  prevents infinite loops.
- Yields/streams each agent's output as it completes, for the UI transcript.

### UI (`app.py`, Gradio)
- Textbox for pasting mystery text (no fixed/built-in mystery — user
  supplies their own).
- Live transcript pane showing each detective's turn as it happens
  (Gradio generator/streaming output).
- Final verdict panel: verdict text, confidence score, evidence citations,
  and human decision buttons (Accept / Reject / Request re-investigation).

## Data flow

1. User pastes mystery text into Gradio → orchestrator starts.
2. Collector runs first, produces the evidence list — nothing downstream
   runs without it.
3. Analyst + Reconciler run in parallel on the evidence list.
4. Skeptic reviews both outputs; if it flags unsupported claims, the
   flagged agent(s) re-run once with the Skeptic's feedback appended to
   their prompt.
5. Lead Detective synthesizes the (possibly revised) outputs into the
   final verdict.
6. UI displays the verdict; human clicks Accept / Reject / Re-investigate.
   Re-investigate restarts the pipeline from step 3 with the human's note
   appended to the case file.

## Error handling

- LLM call fails or returns invalid JSON → one retry with a stricter
  prompt, then a visible error in the transcript (pipeline halts, does not
  fabricate a result).
- Skeptic's feedback loop is capped at one retry per agent to avoid
  infinite loops.

## Testing

- Unit test each agent against a canned mystery fixture with a mocked
  `call_llm` (no real API calls in unit tests).
- Use the participant portion of the Aurora Diamond reference case as the
  canonical end-to-end fixture. The facilitator solution is the evaluation
  oracle and must remain outside the agent input.
- The integration evaluation asserts that a verdict is produced, every claim
  cites at least one evidence ID, missing evidence and uncertainty remain
  visible, and an exact confidence percentage is not required.
- The canonical re-investigation scenario excludes Evidence E and verifies
  that the system can explain what changes, including any confidence change.
- A second unrelated mystery fixture must also complete the full pipeline.
  This generality test verifies that no runtime behavior depends on Aurora
  Diamond names, identifiers, timestamps, suspect count, or expected verdict.

## File structure

```
project/
  llm_client.py
  case_file.py
  agents/
    collector.py
    suspect_analyst.py
    timeline_reconciler.py
    skeptic.py
    lead_detective.py
  orchestrator.py
  app.py
  tests/
```

## Open decisions deferred to implementation

- Exact Gemini/GPT SDK call shape (wrapper interface is fixed above; the
  concrete provider call is an implementation detail behind it).
- Exact Gradio streaming mechanism (generator-based `gr.Blocks` update vs.
  polling) — pick whichever is simplest to implement correctly.
