# Spec: Complete Next.js Investigation Workspace Wiring

## Problem Statement

Sherlok's visual screens are largely complete, but a User cannot yet rely on
the workspace as one working investigation journey. The Start Investigation
screen, the live Agent Workspace, and the five case-file views have partial
transport wiring, while `/case/agents` still displays a separate static mock.
The live view does not lead a User to the completed Case File. Local runtime
configuration is undocumented and presently prevents the Next.js proxy from
reaching Python. The installed Python dependency set can also differ from the
pinned adapter requirements, preventing the transport adapter from starting.

As a result, polished interfaces can imply case state or agent activity that
the running investigation has not supplied. A User needs every public route to
show the displayable Investigation Snapshot and safe Investigation Events for
the same opaque investigation ID, or to present a clear recovery state.

## Solution

Finish the existing Next.js-to-Python integration as one case-centric journey.
The existing Python application interface remains the single integration seam:
start an investigation, read its Investigation Snapshot, stream Investigation
Events, record a Human Decision, and request Re-investigation. Next.js remains
the same-origin presentation adapter; Python remains owner of Case File,
curation, provider configuration, validation, and orchestration.

The Start Investigation screen creates an opaque investigation ID and opens
the canonical live Agent Workspace. That workspace projects current status and
safe events, recovers from missed events using a snapshot, and exposes a
case-file link when displayable material is available. Overview, Evidence,
Timeline, Analysis, and Proposed Verdict project that same snapshot. The
legacy `/case/agents` route becomes an alias for the live Agent Workspace, not
a second simulated workflow. Local setup must run compatible Python
dependencies, the Python adapter, and Next.js with the proxy URL configured.

## User Stories

1. As a User, I want to submit pasted participant material and supported files, so that I can start a real investigation.
2. As a User, I want safe validation and service-failure messages, so that I know whether to amend material or restore the local service.
3. As a User, I want the selected provider sent only through the server-side adapter, so that browser code never receives credentials.
4. As a User, I want an opaque investigation ID retained in navigation, so that every screen refers to the same Case File.
5. As a User, I want the Agent Workspace to show actual Investigation Events, so that I can distinguish work in progress, completion, revision, and failure.
6. As a User, I want a snapshot loaded before and alongside live events, so that I can recover an understandable workflow if I open or refresh the page late.
7. As a User, I want a named, safe event-stream failure state, so that a closed stream never looks like a completed investigation.
8. As a User, I want the Agent Workspace to link to the Case File once displayable material exists, so that I can inspect results without constructing a URL.
9. As a User, I want `/agent-workspace` and `/case/agents` to show the same live investigation for the same ID, so that navigation never opens a mock workflow.
10. As a User, I want the Case Overview to show canonical case material, source references, and material warnings, so that I know what agents could use.
11. As a User, I want the Evidence view to display only collected evidence with its source references, so that evidence remains traceable.
12. As a User, I want Timeline statements and unresolved issues to link to their cited evidence, so that I can inspect support.
13. As a User, I want Suspect Analysis and Skeptic review to display case-file claims rather than demo content, so that I can assess the actual investigation.
14. As a User, I want each evidence navigation link to preserve the current investigation ID, so that it opens the right evidence item.
15. As a User, I want the Proposed Verdict to remain a proposal until I record a Human Decision, so that the system does not decide the case for me.
16. As a User, I want Accept and Reject to update the displayed snapshot, so that I can see the recorded Human Decision immediately.
17. As a User, I want Request Re-investigation disabled until I provide a non-empty Guidance Note, so that the request is actionable.
18. As a User, I want Re-investigation to retain Evidence and produce fresh later-stage events, so that my guidance does not discard collected work.
19. As a User, I want an unavailable or unknown investigation to show a recovery message on every route, so that no page silently renders invented content.
20. As a local developer, I want documented commands and configuration for both runtimes, so that the complete journey can run from a clean checkout.
21. As a local developer, I want dependency verification to catch an incompatible FastAPI/Starlette installation, so that the proxy contract is tested against the supported Python environment.
22. As an evaluator, I want the same journey to work for a second unrelated fictional mystery, so that the presentation remains case-agnostic.
23. As a keyboard or assistive-technology user, I want navigation, controls, status, and failures represented with semantic links, buttons, and live regions, so that workflow state is not communicated only by color or animation.

## Implementation Decisions

- Retain the versioned Python investigation application interface and generated transport contract as the only browser-to-orchestration seam. Do not add browser provider calls, a second state store, or case-specific presentation data.
- Treat the Investigation Snapshot as the recovery source of truth. The Agent Workspace first reads the snapshot, then subscribes to server-sent Investigation Events, deduplicates by event ID, and re-reads the snapshot after a stream error or terminal event when needed.
- Make `/agent-workspace?investigation_id=…` the canonical live-workspace URL because Start Investigation already targets it. Make `/case/agents` a parameter-preserving alias or redirect to that route; it must never instantiate the static demo Agent Workspace.
- Use one shared case navigation model for the live workspace and the five Case File views. It carries the opaque investigation ID on every internal URL, exposes Agent Workspace as the workflow view, and only presents a Case File link when a displayable snapshot exists.
- Replace or remove unreachable static mock components. Interaction such as tabs, filters, selections, and navigation is retained only when it operates on the current snapshot; otherwise it is not presented as live investigation behavior.
- Keep the existing snapshot projection for Case Overview, Evidence, Timeline, Analysis, and Proposed Verdict. Expand it only as needed to make loading, pending, empty, unknown-ID, and safe-service-failure states explicit and accessible.
- Preserve evidence traceability: every visible claim, timeline event, issue, and conclusion links by its evidence ID to the matching Evidence item for the same investigation. No UI uses reference-case names, IDs, counts, times, or conclusions as fallback data.
- Keep Human Decision and Re-investigation commands behind same-origin Next.js routes. On a successful response, replace the rendered snapshot with the returned snapshot; on failure, display only the adapter's safe message and recovery action.
- Document the local runtime contract: install the pinned Python requirements in an isolated environment, run the Python API adapter, set `SHERLOK_PYTHON_API_URL` for the Next.js process, then run Next.js. Add a non-secret configuration example and troubleshooting for an unavailable backend and incompatible dependency installation.
- Add a deterministic local test provider or fixture path solely for behavior tests and manual demo verification. Production provider selection remains owned by Python and continues to use the provider-agnostic LLM wrapper.
- Do not change the accepted ADR boundary: Python owns Case File and orchestration; Next.js owns interaction and projection; REST carries commands and snapshots; SSE carries one-way safe progress.

## Testing Decisions

- The primary acceptance seam is the complete public browser journey against the existing same-origin Next.js routes and a deterministic Python investigation adapter. Tests observe what a User can submit, see, navigate to, and decide; they do not assert React state, private helpers, prompts, or provider SDK calls.
- Add one critical journey covering: start with an unrelated fictional case, observe safe curation/workflow status, open the Case Overview, follow an evidence citation, inspect Timeline and Analysis, record a Human Decision, and request Re-investigation with a Guidance Note on a fresh awaiting-review case.
- Add browser-level failure journeys for an unavailable Python service, malformed/unsupported material, unknown investigation ID, safe step failure, and lost event stream followed by snapshot recovery.
- Add route-level behavior tests confirming both agent URLs project live events and that all Case File navigation retains the same opaque investigation ID.
- Retain and run the existing Python transport behavior and generated-contract tests for start, snapshot, events, decision, and Re-investigation. Execute them in the pinned dependency environment; a dependency mismatch is a setup failure, not a waived application result.
- Retain deterministic Python tests for source-reference integrity, bounded revision, facilitator-only exclusion, and evidence retention during Re-investigation. They are prior art for the visible browser assertions.
- Run lint, production build, and the documented critical journey before declaring the migration behaviorally complete. Do not add CI/CD workflows as part of this work.

## Out of Scope

- New detective capabilities, agent roles, prompt editing, editable workflow graphs, free-form agent chat, or hidden-reasoning display.
- Browser-side PDF/DOCX conversion, direct browser-to-Python networking, provider credentials in the browser, OCR, durable persistence, accounts, collaboration, and deployment automation.
- A visual redesign of already completed screens beyond changes needed to accurately project live state and make the journey navigable.
- Gradio removal. It remains the reference adapter until this specification's browser journey demonstrates behavior parity; retirement is handled by its existing separate plan.

## Further Notes

- The currently audited route set is Start Investigation, canonical Agent Workspace, legacy Agent Workspace alias, and the five Case File views. All must be safe with a missing or invalid investigation ID.
- Investigation state is intentionally in-memory for the demo. A Python-process restart invalidates old IDs and must yield the existing safe recovery state.
- The specification deliberately distinguishes a Case File projection from the older visual mock-up components. A page is functional only when it renders returned case state or a safe, truthful fallback.
- Implementation should be delivered as small vertical slices: runtime readiness and proxy proof; canonical Agent Workspace plus alias and navigation; Case File projection parity and human-decision flow; then the critical browser journey and documentation proof.
