# Spec: Next.js Investigation Workspace Wiring

## Problem Statement

The Start Investigation screen accepts text and files, but it currently keeps
them only in browser state. Its progress indicator is timed, not real, and it
navigates to a placeholder Agent Workspace. A User cannot see what source
material was accepted, what the Case File Curator normalized, or what the
detective workflow is doing.

The Python runtime already owns safe case-material curation and investigation
orchestration. Reimplementing PDF, DOCX, Markdown, and plain-text conversion
in Next.js would create two sources of truth for canonical case material,
source references, facilitator-only exclusion, and intake warnings.

## Solution

Wire the existing Next.js workspace to a small Python application interface.
Next.js owns the browser upload experience, navigation, and rendering.
Python owns case-material processing, case state, validation, agent execution,
and provider configuration.

A User submits pasted participant material and supported files through a
same-origin Next.js command route. The route forwards supplied bytes and the
selected provider to Python. Python uses the Case File Curator to produce
canonical case material, starts an investigation, and returns an opaque
investigation ID. The workspace reads an Investigation Snapshot and follows
safe Investigation Events until human review.

```text
Browser -> Next.js upload and presentation adapter -> Python application interface
                                                   -> Case File Curator
                                                   -> detective workflow
```

## User Stories

1. As a User, I want to paste participant case material, so that I can begin without preparing a file.
2. As a User, I want to add PDF, DOCX, Markdown, and plain-text files, so that I can investigate material I already have.
3. As a User, I want to use pasted material and files together, so that one case file can include all supplied sources.
4. As a User, I want unsupported files rejected before submission, so that I can correct input quickly.
5. As a User, I want real submission and curation progress, so that I do not mistake an animation for completed work.
6. As a User, I want a safe explanation when a file is unreadable, encrypted, empty, or needs OCR, so that I know what to replace.
7. As a User, I want to see canonical case material and source references, so that I know exactly what agents can use.
8. As a User, I want PDF blocks to show page locations, so that I can return to supplied material.
9. As a User, I want uncertain table reconstruction clearly labeled, so that I do not treat extraction output as certainty.
10. As a User, I want facilitator-only material excluded before investigation, so that the verdict remains a genuine evaluation.
11. As a User, I want an investigation ID after valid submission, so that the workspace can recover its displayable state.
12. As a User, I want the Agent Workspace to show queued, working, completed, revising, failed, and awaiting-review stages, so that the workflow is understandable.
13. As a User, I want parallel specialist paths shown, so that I can see independent work.
14. As a User, I want a Skeptic revision shown only for the specialist it flags, so that the one permitted revision round is clear.
15. As a User, I want named stage failures to halt dependent stages visibly, so that the interface never invents progress.
16. As a User, I want every displayed claim and verdict reason linked to evidence and safe source references, so that I can assess support.
17. As a User, I want evidence, timeline, analysis, and proposed verdict views, so that each part of the case file is readable.
18. As a User, I want the verdict labeled proposed until I decide, so that the system does not claim to make the final decision.
19. As a User, I want to accept, reject, or request re-investigation with a guidance note, so that I remain responsible for the outcome.
20. As a User, I want re-investigation to retain evidence and rerun only later stages, so that my guidance does not discard collected evidence.
21. As a User, I want keyboard-accessible controls and text status in addition to color, so that the workspace is usable with assistive technology.

## Implementation Decisions

- Decision: Next.js owns browser interaction, file selection, client-side file-type feedback, navigation, and rendering of snapshots and events.
  - Rationale: These are presentation concerns and fit the target workspace.
- Decision: Python remains the only owner of Case File Curator and normalized case-material rules.
  - Rationale: The Curator already converts PDFs through the pinned local `pdf-inspector` adapter, extracts DOCX directly, normalizes Markdown and text, creates safe source references, excludes facilitator-only material, and emits warnings. The browser must not duplicate this logic.
- Decision: Remove the unused JavaScript `@firecrawl/pdf-inspector` dependency when the Next.js package is next updated.
  - Rationale: Conversion runs in Python; retaining a second package suggests an unsupported second implementation.
- Decision: Add one small Python application interface: start an investigation, read a snapshot, stream events, record a human decision, and request re-investigation.
  - Rationale: This is the highest useful seam. It hides document processing, orchestration, provider SDKs, and transport details behind one case-centric interface.
- Decision: Start accepts pasted text, uploaded file bytes with display names and media types, and a selected provider name, then returns an opaque investigation ID.
  - Rationale: It maps directly to the Start Investigation form without exposing upload paths.
- Decision: Snapshots contain only displayable canonical material, warnings, workflow status, evidence, specialist results, Skeptic findings, verdict, and human decision.
  - Rationale: The workspace must never render raw provider output, credentials, hidden reasoning, tracebacks, facilitator-only material, or filesystem paths.
- Decision: Use REST for commands and snapshots, server-sent events for ordered live progress, and Next.js server routes as the browser-facing proxy.
  - Rationale: The browser receives one origin and no internal runtime address. Progress is one-way and recoverable through snapshot reads.
- Decision: Keep the first investigation store in memory and visibly state that it lasts only for the running demo process.
  - Rationale: Durable persistence is not required for this beginner demonstration.
- Decision: Replace the Start screen timer with real command state and replace the Agent Workspace placeholder with a snapshot-and-event projection.
  - Rationale: UI status must reflect actual Curator and orchestrator behavior.
- Decision: Use one versioned transport schema to generate or validate TypeScript transport types.
  - Rationale: FastAPI's versioned OpenAPI document is the transport schema source for the Python adapter and the future TypeScript client. Python and TypeScript must not maintain equivalent shapes by memory.
- Decision: Keep Gradio as a reference adapter until the Next.js critical journey reaches behavior parity.
  - Rationale: The delivered Python flow remains reliable during migration.

## Acceptance Criteria

- Valid pasted material, supported files, or both start an investigation and return an opaque ID.
- Next.js displays canonical case material and sanitized intake warnings returned by Python.
- PDF page references and table-uncertainty labels remain visible.
- Unusable material produces a safe validation result and does not start Evidence Collection.
- Facilitator-only material never appears in snapshots, events, rendered UI, or agent input.
- The workspace updates from real ordered events without manual refresh and recovers from missed events through a snapshot.
- Every visible claim and verdict reason links to known evidence IDs and safe source references.
- Stage errors stop dependent stages and show a named, sanitized recovery message.
- A Skeptic revision is visible, targets only the flagged specialist, and occurs at most once.
- The proposed verdict supports accept, reject, and guided re-investigation according to Python case-state rules.
- A second unrelated fictional mystery completes the same journey without reference-case-specific UI behavior.
- The browser never receives credentials, an internal Python URL, upload paths, hidden reasoning, raw provider output, tracebacks, or sealed content.

## Dependencies and Implementation Slices

- [x] Slice 1: Define the versioned Python application interface and transport schema. Add behavior tests for start, snapshot, events, decision, and re-investigation.
- [x] Slice 2: Add the in-memory investigation store and Python REST/SSE adapter. Add contract tests for ordering, recovery, safe failures, and source-reference integrity.
- [ ] Slice 3: Add Next.js same-origin route handlers and a typed server adapter. Replace simulated Start Investigation behavior with the real command and safe validation display.
- [ ] Slice 4: Build the live Agent Workspace from snapshot and event projections, including parallel work, Skeptic revision, and failure states.
- [ ] Slice 5: Connect Case Overview, Evidence, Timeline, Analysis, and Proposed Verdict views with shared evidence navigation and human decisions.
- [ ] Slice 6: Add the critical browser journey, prove parity against the reference adapter, update local run documentation, then plan Gradio retirement separately.

Each slice requires explicit approval before implementation and publication as a native sub-issue.

## Testing Decisions

- Test behavior through the Python application interface, the highest shared seam. Observe submitted material, returned Investigation Snapshots, ordered Investigation Events, and human-decision outcomes; do not test private helpers, prompts, provider SDKs, or UI implementation state.
- Reuse existing Curator behavior tests for PDF page locations, table warnings, OCR exclusion, sealed facilitator exclusion, DOCX and Markdown structure, and safe source references.
- Add deterministic application-interface tests with a fake provider-neutral LLM for normal intake, mixed usable and unusable sources, invalid source references, event ordering, snapshot recovery, bounded revision, and re-investigation.
- Add Python-to-Next.js transport contract tests from the versioned schema for every command, snapshot, event, and safe error.
- Add React tests for real command states, sanitized warnings, snapshot projection, evidence navigation, keyboard behavior, and failure rendering.
- Add one browser test of the complete public seam: submit a second unrelated fictional case, observe curation and agent progress, inspect a cited source, review the proposal, and request re-investigation.
- Continue to run the deterministic Python suite without live provider calls.

## Out of Scope

- Deliberately excluded: browser-side PDF/DOCX conversion, browser credentials, direct browser-to-Python calls, OCR, authentication, accounts, multi-user collaboration, persistent case history, editable agent graphs, prompt editing, free-form agent chat, and hidden reasoning display.
- Deferred: durable storage, background job infrastructure, multi-instance event recovery, deployment automation, and Gradio removal before demonstrated parity.

## Further Notes

- Canonical case material is untrusted supplied content. It is normalized for structure and traceability; the Curator does not perform detective reasoning.
- `pdf-inspector` is a local Python adapter, not a hosted conversion call. OCR remains disabled.
- Investigation state exists only in the running Python demo process. Restarting that process discards its Investigation Snapshots and events.
- This master issue tracks approved slices. This specification remains active until all accepted slices ship or it is superseded.
