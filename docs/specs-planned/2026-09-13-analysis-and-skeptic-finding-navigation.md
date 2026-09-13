# Spec: Complete the Analysis Page and Skeptic Finding Navigation

Initiative: Sherlok MVP completion (#3)
Issue: #11

## Problem Statement

The User cannot yet inspect the current Case File analysis as one clear view.
They need to read suspect profiles and their Claims, inspect cited Evidence,
and understand what the Skeptic challenged. When a Skeptic finding names a
Claim that the Analysis page can show, the User needs a direct way to locate
that exact Claim. The page must state only the Investigation Snapshot that it
receives. It must not invent a revision state, a Claim, or reference-case
content.

## Solution

Complete the Analysis page as a case-agnostic projection of the current
Investigation Snapshot. It shows each Suspect Profile with its motive and
opportunity Claims, their status, and links to cited Evidence. It shows each
Skeptic review, its outcome, and its findings. A finding that has an exact
displayed Claim target gives the User a focus action. That action selects,
reveals, and moves focus to the matching Claim without changing the current
investigation ID. A revision indicator appears only when the snapshot reports
the relevant revision state.

## User Stories

1. As a User, I want to open Analysis for the current Case File, so that I can inspect its suspect analysis.
2. As a User, I want to see each Suspect Profile from the Investigation Snapshot, so that I can compare reported suspects without invented profiles.
3. As a User, I want to see motive Claims for each displayed suspect, so that I can assess reported motive.
4. As a User, I want to see opportunity Claims for each displayed suspect, so that I can assess reported opportunity.
5. As a User, I want each Claim to state whether it is supported or unresolved, so that I do not mistake an unknown Claim for a fact.
6. As a User, I want each Claim to show its cited Evidence IDs, so that I can judge its support.
7. As a User, I want to open cited Evidence from a Claim, so that I can inspect the supplied basis for that Claim.
8. As a User, I want Evidence navigation to keep my investigation ID, so that I do not inspect another Case File.
9. As a User, I want to see every available Skeptic review outcome, so that I can understand the review history.
10. As a User, I want to see each Skeptic finding's specialist, kind, affected Claim text, and explanation, so that I can understand the stated weakness.
11. As a User, I want a Skeptic finding to identify its exact displayed Claim when it has one, so that I can compare the challenge with the Claim.
12. As a User, I want the Claim focus action to select and visibly focus the matching Claim, so that keyboard and assistive-technology use has the same result.
13. As a User, I want a finding without a displayed Claim target to remain readable without a false focus action, so that the page does not imply a match it cannot prove.
14. As a User, I want to see a revision state only when the Investigation Snapshot reports the relevant specialist revision, so that the Analysis page does not guess workflow status.
15. As a User, I want a clear pending state while the Case File has no Analysis data, so that incomplete investigation work is not presented as empty results.
16. As a User, I want a clear empty state when Analysis completes without suspect profiles or Skeptic findings, so that I know no data is available.
17. As a User, I want a clear loading state while the snapshot is retrieved, so that I know the page is working.
18. As a User, I want a safe failure state when the Case File cannot be loaded, so that I have a recovery path without private technical data.
19. As a User, I want an unknown investigation to show a safe recovery state, so that the page never shows another investigation's data.
20. As a keyboard or assistive-technology User, I want labelled controls, visible focus, text status, and semantic Claim and finding relationships, so that I can inspect analysis without relying on color.
21. As a maintainer, I want the existing Investigation Snapshot read boundary to remain the Analysis data source, so that Next.js does not recreate Case File or orchestration rules.
22. As a maintainer, I want the existing same-origin Evidence navigation boundary to remain the only path to cited Evidence, so that browser code does not access the Python adapter directly.
23. As a test author, I want a deterministic unrelated fictional Case File with Claims and Skeptic findings, so that the feature is proved without a live provider or reference-case data.

## Implementation Decisions

- The existing Case File snapshot read is the single data seam for this slice. The Analysis page renders its display only from the validated current Investigation Snapshot and does not call agent, provider, or Python-internal APIs from the browser.
- The Analysis projection uses the existing Suspect Profile, Claim, Skeptic Review, Skeptic Finding, Evidence, and revision-state contract. This slice does not add a Case File field, alter agent prompts, or change the versioned transport contract.
- Each Suspect Profile groups its existing motive and opportunity Claims. Each Claim displays its statement, status, and only the Evidence IDs supplied by the Claim. A cited ID uses the existing same-origin Evidence page link with the opaque investigation ID and the existing Evidence-item target convention.
- The Skeptic area lists every supplied review and finding. It presents the review outcome and each finding's named specialist, finding kind, affected Claim text, and explanation. It does not display hidden reasoning, raw provider output, or a guessed cause for the finding.
- A finding is focusable only when its named Claim exactly matches one rendered Analysis Claim for the current snapshot. The focus action switches to the profile view if needed, selects the matching Claim, brings it into view, and moves keyboard focus to it. If no exact displayed Claim exists, the finding remains informative but has no target control.
- Revision display is a projection of the snapshot's revision data. It appears only for a relevant reported revision and never infers that a revision is active, completed, or required from a Skeptic outcome alone.
- The page retains the shared Case File loading, pending, empty, safe failure, and unknown-investigation behavior. An incomplete snapshot must not be rendered as a completed analysis. Safe messages must not expose credentials, internal URLs, filesystem paths, raw provider output, hidden reasoning, or sealed facilitator material.
- All navigation preserves the opaque investigation ID. The page remains case-agnostic: no production UI text, fixture, or matching behavior depends on reference-case names, Evidence IDs, times, conclusions, or expected item counts.

## Testing Decisions

- A good test crosses the browser Case File seam and observes a User-visible result. It verifies rendered snapshot data, a selected and focused Claim, preserved investigation navigation, or a safe state. It does not assert component state, helper calls, prompt content, or internal workflow order.
- Reuse the deterministic browser journey and its mocked same-origin Investigation Snapshot as the primary prior art. Add an unrelated fictional snapshot with multiple suspect Claims, cited Evidence, and at least one Skeptic finding that exactly targets a displayed Claim.
- The public-seam test opens Analysis, inspects a Claim, opens its Skeptic finding, activates the focus action, and verifies that the exact Claim becomes selected and focused. It also verifies that a Claim Evidence link opens the correct Evidence item while retaining the investigation ID.
- Add browser coverage for a finding whose target is not displayed, so no false Claim target is offered; for the relevant reported revision state; and for an absent revision state, so no revision indicator is inferred.
- Reuse existing Case Workspace failure coverage as prior art. Add or retain deterministic loading, pending, empty, malformed-snapshot safe failure, and unknown-investigation assertions for Analysis. No browser, unit, contract, or acceptance test calls a live provider.
- Verify keyboard access for Claim selection, Skeptic finding focus, and Evidence links. Assert text alternatives for status and relationship information so color is not the only signal.

## Out of Scope

- Changes to Evidence collection, suspect-analysis methodology, timeline reconciliation, Skeptic validation, agent prompts, provider selection, or the one-round revision rule.
- New Claim identifiers, changes to the Case File schema or transport version, cross-case comparison, search, filtering, persistence, sharing, authentication, or a new public Python endpoint.
- Proposed Verdict display, Human decisions, Re-investigation commands, live-provider tests, deployment changes, CI/CD workflows, issue-tracker automation, and reference-case-specific behavior.

## Further Notes

- Issue #11 is slice 6 in the MVP User flow and is blocked by Evidence navigation work in #9. It uses the established Evidence-item target convention from that slice.
- The public test seam is one deterministic browser journey. It is intentionally higher than component or transport tests, so it proves the User can inspect the Claim and its Skeptic finding together.
- The reference case remains a participant-material fixture and facilitator evaluation oracle only. It is not production input or a source of hard-coded UI behavior.

## Acceptance Criteria

- [ ] The page displays Suspect Profiles and Claims from the current Investigation Snapshot.
- [ ] Each displayed Claim links to its cited Evidence when Evidence is available.
- [ ] The page displays Skeptic reviews and their findings from the current Investigation Snapshot.
- [ ] A Skeptic finding identifies and focuses its exact displayed Claim when that target exists.
- [ ] A finding with no displayed Claim target does not imply a false match.
- [ ] The page shows the relevant revision state only when the Investigation Snapshot provides it.
- [ ] The page shows clear loading, pending, empty, safe failure, and unknown-investigation states.
- [ ] The page does not display fixed reference-case data or private runtime material.
- [ ] A deterministic public-seam test proves that the User can inspect a Claim, its Skeptic finding, and its cited Evidence using an unrelated fictional case.
