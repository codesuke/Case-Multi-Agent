# Spec: Complete the Start Investigation User Flow

Initiative: Sherlok MVP completion (#3)
Issue: #6

## Problem Statement

The User cannot yet depend on the Start Investigation page as the first step
of a real investigation. The page must accept usable pasted case material and
supported files, pass the selected provider through the safe command boundary,
and give clear recovery guidance when the material or service cannot be used.

The User must reach the Agent Workspace as soon as Python accepts the
material. The page must not wait for Case Structurer work, Evidence
Collection, Follow-up Recommendations, or later Case File state.

## Solution

Complete the Start Investigation page as one case-agnostic User flow. The
User supplies pasted case material, supported files, or both, selects an
available provider, and starts an investigation through the same-origin
command route. Python validates and curates the supplied participant material,
creates the Case File, and returns an opaque investigation ID.

The page shows local file-type feedback before submission and safe,
recoverable feedback for server validation and service failures. On success,
it immediately sends the User to the Agent Workspace with the returned ID.
The Agent Workspace, not this page, displays all later Investigation Events,
Follow-up Recommendations, and Case File content.

## User Stories

1. As a User, I want to paste case material, so that I can start without making a file.
2. As a User, I want to select supported case files, so that I can investigate supplied documents.
3. As a User, I want to use pasted material and files together, so that Python can curate one complete set of sources.
4. As a User, I want to see which selected files are accepted, so that I know what the start command will receive.
5. As a User, I want to remove a selected file before I start, so that I can correct my source set.
6. As a User, I want unsupported files rejected before submission, so that I can replace them without an unnecessary service call.
7. As a User, I want a clear supported-file message, so that I know which replacement source to provide.
8. As a User, I want to select one available investigation provider by name, so that I can use configured service access without entering credentials.
9. As a User, I want the page to hide credentials, model settings, and internal addresses, so that private configuration stays private.
10. As a User, I want Start Investigation disabled when no usable material is present, so that I do not send an empty case.
11. As a User, I want input controls locked while the command is pending, so that one action has one clear material set.
12. As a User, I want text feedback while the command is pending, so that I know the application is preparing the Case File.
13. As a User, I want Python to decide whether submitted material is usable, so that the browser does not interpret case content or document structure.
14. As a User, I want a safe, specific, recoverable message when Python cannot use my material, so that I can correct it and try again.
15. As a User, I want a safe recovery message when the investigation service is unavailable, so that I can retry without seeing technical details.
16. As a User, I want successful start to take me directly to the Agent Workspace, so that I can observe the investigation as it continues.
17. As a User, I want the Agent Workspace URL to contain the returned opaque investigation ID, so that later views read the correct Case File.
18. As a User, I want navigation to happen before later agent stages finish, so that case preparation and investigation progress do not hold up the first transition.
19. As a User, I want the Start Investigation page to avoid showing Case Structurer results, Evidence, Follow-up Recommendations, or a Verdict, so that it does not imply results it does not own.
20. As a keyboard or assistive-technology User, I want accessible labels, focusable file selection and removal controls, and announced status and error text, so that I can complete the same flow.
21. As a maintainer, I want the browser to use only the same-origin command route, so that the private Python adapter remains private.
22. As a maintainer, I want the Python application interface to own curation, provider configuration, validation, Case File creation, and the start result, so that investigation rules have one owner.
23. As a test author, I want a deterministic unrelated fictional case to prove this journey, so that no test depends on the reference case or a live provider.

## Implementation Decisions

- The existing Start Investigation interaction is the single browser seam for
  this slice. It owns temporary text, selected files, the provider choice,
  local file-extension feedback, pending state, safe response display, and
  navigation. It does not create or inspect Case File state.
- The existing same-origin start command remains the sole browser-to-service
  boundary. It forwards only pasted material, the provider name, and accepted
  files to the private Python application interface. Browser code never reads
  the Python address or provider credentials.
- The page accepts pasted material, supported files, or both. It accepts plain
  text, Markdown, DOCX, and text-based PDF as the supported file categories.
  Local extension filtering gives early feedback only; Python remains the
  authority for file readability, document content, provider availability,
  and whether the submitted material is usable.
- The provider control shows the configured provider choices by name only.
  It sends the selected name unchanged through the start command. Credentials,
  tokens, model controls, and provider-specific browser behavior are excluded.
- The Start Investigation action is available only when trimmed pasted text or
  at least one locally accepted file exists. During a pending command, text,
  file, provider, and start controls are unavailable and the page gives a
  non-animation text status.
- The public start response remains either a valid opaque investigation ID or
  the established safe transport-failure shape. The page navigates only after
  a successful, valid start response. Invalid or unknown responses use a safe
  fallback message and keep the User on the page.
- Material validation, unreadable uploads, provider configuration failures,
  and unavailable service failures use safe messages and recovery actions. No
  screen, client state, or response display exposes credentials, internal
  addresses, raw provider output, hidden reasoning, filesystem paths, or
  sealed facilitator material.
- Once Python accepts the material and returns an ID, navigation is immediate
  to the Agent Workspace with that ID as a URL query value. It must not wait
  for Case Structurer events, Evidence Collection, Follow-up Recommendations,
  or any later Case File result.
- The Start Investigation page does not subscribe to Investigation Events or
  render a Case Structurer result, Follow-up Recommendation, Evidence,
  analysis, or Verdict. Those projections belong to the Agent Workspace and
  later Case File pages.
- The flow remains case-agnostic. Production text, validation, transport
  behavior, and tests do not contain reference-case names, evidence IDs,
  timings, conclusions, or expected counts.

## Testing Decisions

- A good test observes the public User result at the highest existing seam. It
  verifies submitted material, safe visible feedback, or navigation; it does
  not assert component state, helper calls, implementation order, or private
  Python details.
- Reuse the existing deterministic browser journey as the primary test seam.
  Extend its unrelated fictional case to submit pasted material and to assert
  immediate navigation to the Agent Workspace after an opaque ID is returned,
  while the Case File remains incomplete and later workflow work has not
  completed.
- Add browser coverage for file-only and mixed pasted-plus-file starts,
  rejected file types, removal before submission, disabled empty submission,
  pending control locking and text status, and provider selection without
  credential fields.
- Add browser coverage for safe Python material-validation failures, safe
  unavailable-service failures, malformed successful responses, and retry
  behavior. Assert that the User remains on the start page and that no unsafe
  internal value is rendered.
- Reuse the existing Next.js route and transport-contract tests as prior art.
  Test that the command route forwards only the supported start fields to the
  configured private adapter, preserves valid safe failures, and translates
  unreadable requests or unavailable adapter failures into the established
  safe response shape.
- Reuse deterministic Python application-interface tests to cover accepted
  pasted material, uploads, combined sources, unusable material, provider
  configuration, Case File creation, and opaque start IDs. Do not require a
  live provider call.
- Verify keyboard file selection, keyboard file removal, control labels, and
  announced pending and error states in the browser test suite or focused
  accessibility checks.

## Out of Scope

- Case Structurer display, Follow-up Recommendation display, Evidence
  Collection, specialist analysis, Skeptic review, Verdict display, Human
  decisions, and Re-investigation.
- New providers, browser-side provider configuration, credential entry, model
  settings, OCR controls, URL ingestion, saved cases, sharing, persistence,
  authentication, or advanced source editing.
- Changes to Case File rules, agent prompts, workflow order, specialist
  concurrency, bounded revision behavior, the public investigation ID shape,
  or the versioned transport contract.
- A public Python endpoint, live-provider test dependency, CI/CD workflows,
  GitHub automation, or reference-case-specific product behavior.

## Further Notes

- This is slice 1, Start Investigation, in the MVP master issue (#3). It can
  begin after the completed runtime-readiness and Case File contract work.
- Issue #17 does not change the start command or its successful result. The
  Case Structurer begins after accepted material, and its events and Follow-up
  Recommendations remain owned by the Agent Workspace.
- The implementation must preserve the existing ownership boundary: Next.js
  presents and navigates; Python owns material curation and investigation
  creation.
- The release proof for this slice is intentionally early in the workflow: it
  proves start and routing, not a completed investigation.

## Acceptance Criteria

- [ ] The User can start an investigation with pasted material, supported
  files, or both.
- [ ] Unsupported files are rejected before submission with a replacement
  action.
- [ ] Empty material cannot start an investigation.
- [ ] The page shows safe, recoverable responses for unusable material,
  malformed start results, and an unavailable investigation service.
- [ ] The page exposes no provider credential, internal Python address, raw
  provider output, filesystem path, hidden reasoning, or facilitator material.
- [ ] A valid start response immediately sends the User to the Agent Workspace
  with its opaque investigation ID.
- [ ] This transition does not wait for Case Structurer work, Evidence
  Collection, Follow-up Recommendations, or later Case File state.
- [ ] The Start Investigation page does not render or infer Case Structurer
  output, Follow-up Recommendations, or later Case File data.
- [ ] A deterministic public-seam test starts an unrelated fictional case and
  reaches the Agent Workspace before later agent stages complete.
