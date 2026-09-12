# Screen 05 — Analysis

Status: **Draft for approval**  
Route concept: `/case/analysis`  
Navigation label: `Analysis`

## Purpose

Present specialist claims and the Skeptic's challenge in one place so the user
can compare suspects, inspect support, and understand whether weak work was
revised.

## Primary user outcome

The user can distinguish supported claims from unknowns, compare every
case-derived suspect fairly, and see exactly what the Skeptic challenged.

## Internal tabs

1. **Suspect profiles** — the Suspect Analyst's structured comparison.
2. **Skeptic review** — findings, revision requests, and final outcome.

These are internal views, not additional destinations in the main navigation.

## Desktop composition

- **Header:** title, parallel-analysis status, tab switcher, and revision state.
- **Main column (8 columns):** selected tab content.
- **Right rail (4 columns):** selected claim detail, citations, and related
  challenge/revision information.

## Components — Suspect profiles tab

### Comparison summary

- One card or table column per suspect returned by the current case.
- The layout supports a variable number of suspects and becomes a list when
  comparison columns would become unreadable.
- No suspect is visually treated as guilty before the proposed verdict.

### Suspect profile card

- Case-derived suspect name.
- Motive claim group.
- Opportunity claim group.
- Each claim shows Supported or Unknown and its evidence IDs.
- Unknown claims state the missing support instead of showing an empty area.
- Revision badge appears only if Suspect Analyst completed Revision 1 of 1.

### Claim detail

- Exact agent claim.
- Claim status and evidence IDs.
- Related source-backed evidence.
- Skeptic finding targeting this exact claim, when one exists.
- Current/first-pass comparison only when first-pass data is retained.

## Components — Skeptic review tab

### Review outcome banner

- Outcome: Approved, Revision requested, or Revision exhausted.
- Explains in plain language what the outcome permits next.

### Findings list

- Grouped by targeted specialist: Suspect Analyst or Timeline Reconciler.
- Each finding shows targeted claim, finding kind, explanation, and specialist
  status.
- Finding labels reflect the implemented kinds: Missing citation, Nonexistent
  evidence ID, and Unsupported reasoning.
- The UI never invents an evidence citation for a Skeptic finding that does not
  contain one.

### Revision path

- Shows which specialist was sent back and why.
- Labels the rerun `Revision 1 of 1`.
- If concerns remain afterward, shows `Revision limit reached` and carries
  those uncertainties forward to the verdict review.

## Interaction rules

- Selecting a claim opens Claim detail.
- Evidence-ID chips open the shared Evidence detail drawer.
- Selecting a Skeptic finding focuses its exact target claim when available.
- The user can inspect but cannot edit claims, findings, agent prompts, or
  revision routing.
- Do not expose hidden chain-of-thought; show only structured outputs and
  observable orchestration events.

## Required states

1. Both specialists queued.
2. Both working in parallel.
3. One complete while the other is working.
4. Both complete and awaiting Skeptic.
5. Skeptic approved.
6. Revision requested.
7. Revision 1 of 1 in progress.
8. Approved after revision.
9. Revision exhausted with unresolved findings.
10. Named specialist or Skeptic failure.

## Responsive behavior

- Below 1024px, claim detail stacks under the selected tab.
- Below 640px, suspect comparisons become vertically stacked profiles and the
  two internal tabs remain horizontally scrollable if necessary.

## Accessibility

- Tab controls use correct tab/list/panel relationships.
- Claim status and finding kind never rely on color alone.
- Focus moves to the targeted claim when following a finding link.

## Acceptance criteria

- [ ] Every supported suspect claim displays one or more valid evidence IDs.
- [ ] Unknown claims are explicit and never presented as facts.
- [ ] The screen supports any case-derived number of suspects and claims.
- [ ] Skeptic findings name their specialist, target claim, kind, and
  explanation.
- [ ] Revision state cannot imply more than one round per specialist.
- [ ] Remaining findings stay visible when the revision limit is reached.
- [ ] No hidden reasoning or manual agent controls are exposed.

## Not on this screen

User-authored hypotheses, suspect scoring invented by the UI, agent chat,
prompt editing, manual claim editing, or unlimited critique/revision loops.
