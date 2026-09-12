# Spec: Next.js Investigation Workspace

## Problem Statement

The delivered Gradio interface can run the investigation, but it does not give
the intended product enough room to explain the workflow. A beginner needs to
see what each agent is doing, how evidence supports claims, where agents work
in parallel, when the Skeptic requests a revision, and why a verdict still
requires human review.

The new Next.js scaffold and screen mock-ups are not connected to the tested
Python pipeline. Without a stable seam, frontend work could duplicate domain
rules, expose unsafe data, or drift from delivered behavior.

## Solution

Build the seven-view Next.js workspace defined in
`sherlok-nextjs/public/Mock-Up/`. Keep the existing Python modules as the
orchestration runtime. Add a typed Python application interface and expose it
through REST commands, investigation snapshots, and a server-sent event
stream. Route browser traffic through same-origin Next.js adapters.

The Agent Workspace visualizes this sequence:

```text
Prepare case material
        |
        v
Collect evidence
        |
        +--------------------+
        v                    v
Analyze suspects      Reconcile timeline
        +----------+---------+
                   v
             Skeptic review
                   |
          optional bounded revision
                   v
             Synthesize verdict
                   |
                   v
               Human review
```

Each workflow node shows a public status, a short result summary, timing when
available, and related evidence IDs. The UI must not show hidden model
reasoning. Evidence IDs open the matching evidence detail and provide a return
path to the originating claim.

## User Stories

1. As a User, I want to add case material and see safe validation, so that I
   know what the investigation will use.
2. As a User, I want to watch agent stages change from queued to working to
   completed, so that I understand how the result is produced.
3. As a User, I want parallel work and the bounded revision path shown
   visually, so that multi-agent orchestration is concrete rather than hidden.
4. As a User, I want each displayed claim linked to evidence, so that I can
   inspect its support and source.
5. As a User, I want failures and uncertainty shown in plain language, so that
   the interface does not manufacture progress or certainty.
6. As a User, I want to review, accept, reject, or request re-investigation, so
   that the human remains the decision-maker.

## Behavior Contract

- Start accepts pasted text, supported participant files, or both, plus a
  configured provider name. It returns an opaque investigation ID.
- Snapshot returns canonical source blocks, current workflow stages, evidence,
  specialist outputs, Skeptic findings, proposed verdict, and human decision.
- Events are ordered and resumable within the lifetime of the in-memory demo.
  Each event has an event ID, investigation ID, event type, stage, public
  status, timestamp, safe message, and optional evidence IDs.
- Supported public statuses are `queued`, `working`, `completed`, `revising`,
  `failed`, and `awaiting_review`.
- The frontend may render only evidence and source references present in the
  snapshot. Unknown references produce a visible contract error.
- Decision accepts `accept` or `reject` only while a verdict awaits review.
- Re-investigation requires a non-empty guidance note and restarts at the two
  specialist branches without rerunning evidence collection.
- Provider credentials and model settings remain server-side.
- Facilitator-only material, hidden chain-of-thought, raw provider output,
  tracebacks, and upload paths never cross the seam.

## Implementation Decisions

- Decision: Keep Python as the orchestration runtime.
  - Rationale: The tested agent and document-processing modules already have
    strong locality and provider-agnostic seams.
- Decision: Use Next.js as the only target presentation layer.
  - Rationale: The seven-view dossier needs routing, responsive composition,
    reusable evidence interactions, and richer live state.
- Decision: Use REST for commands and snapshots and server-sent events for
  live progress.
  - Rationale: Progress is primarily server-to-browser. SSE is simpler than a
    bidirectional socket and works with ordered event IDs and reconnection.
- Decision: Proxy Python through the Next.js server.
  - Rationale: The browser gets one origin and no internal backend address.
- Decision: Keep an in-memory investigation store for the first slice.
  - Rationale: Persistence and multi-instance recovery are not required for
    the beginner demonstration. The limitation must be visible in docs.
- Decision: Keep Gradio until critical-journey parity is demonstrated.
  - Rationale: This preserves a working reference during migration and makes
    removal a later cleanup rather than a flag-day rewrite.

## Acceptance Criteria

- A user can submit valid case material in Next.js and receive an investigation ID.
- The Agent Workspace updates without a manual refresh as Python emits events.
- The branch into Suspect Analyst and Timeline Reconciler and the later join are visible.
- A Skeptic revision visibly returns only the flagged specialist and occurs at most once.
- Every displayed claim and verdict reason retains its evidence IDs.
- Selecting an evidence ID opens its evidence and safe source references.
- A named stage failure stops dependent stages and appears without secrets or raw provider data.
- The verdict is labeled proposed and awaits Accept, Reject, or Re-investigation.
- Re-investigation requires guidance and does not rerun Evidence Collection.
- A second unrelated mystery passes the same journey without Aurora-specific UI behavior.
- Keyboard navigation and screen-reader text do not rely on color alone.
- The current deterministic Python suite remains green throughout migration.

## Testing Decisions

- Test behavior through the Python application interface before HTTP.
- Use a versioned OpenAPI or JSON Schema artifact as the Python/TypeScript
  contract seam.
- Add deterministic transport tests for event ordering, reconnection,
  snapshots, decisions, failures, and safe data exposure.
- Add frontend tests for state projections and evidence navigation.
- Add one browser test for the full critical journey with a fake Python adapter.
- Run the existing unrelated-case acceptance scenario through the new seam.

## Implementation Slices

- [ ] Define the Python application interface and versioned transport schemas.
- [ ] Add the in-memory investigation store and REST/SSE adapter with contract tests.
- [ ] Build the shared Next.js shell, typed adapter, workflow projection, and safe empty/error states.
- [ ] Implement Start Investigation and Agent Workspace as the first vertical slice.
- [ ] Implement Evidence, Timeline, and Analysis with shared evidence navigation.
- [ ] Implement Case Overview and Proposed Verdict with human decisions and re-investigation.
- [ ] Prove critical-journey parity, update run/deployment documentation, then remove Gradio.

Slices require explicit approval before they are published as native GitHub
sub-issues or implemented.

## Dependencies

- The existing provider-agnostic `llm_client.py` seam.
- The existing `CaseFile` and orchestrator event behavior.
- Approved screen contracts under `sherlok-nextjs/public/Mock-Up/`.
- A Python web adapter dependency selected during slice 2.

## Out of Scope

- Deliberately excluded: authentication, accounts, multi-user collaboration,
  persistent case history, editable agent graphs, prompt editing, free-form
  agent chat, hidden chain-of-thought, browser credential entry, and OCR.
- Deferred: durable storage, background job infrastructure, multi-instance
  event recovery, deployment automation, and Gradio removal before parity.

## Further Notes

- Historical specifications in `docs/specs-implemented/` remain unchanged.
  They describe the delivered Gradio behavior and are migration evidence, not
  the target architecture.
- The design uses interface depth deliberately: UI callers learn a small set
  of operations while Python hides orchestration, provider, and validation
  complexity behind them.
