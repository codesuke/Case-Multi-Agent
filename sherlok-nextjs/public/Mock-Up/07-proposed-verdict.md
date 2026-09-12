# Screen 07 — Proposed Verdict and Human Review

Status: **Draft for approval**  
Route concept: `/case/verdict`  
Navigation label: `Proposed Verdict`  
Visual anchor: `public/design/human-review-dossier-v2.png`

## Purpose

Let a person evaluate the Lead Detective's evidence-cited proposal,
uncertainty, and review history before recording the final human decision.

## Primary user outcome

The user understands what is proposed, why it is supported, what remains
uncertain, and can Accept, Reject, or request a focused re-investigation.

## Desktop composition

- **Header:** case label, `Proposed verdict` state, and review status.
- **Main column (8 columns):** confidence, ranked conclusions, limitations,
  and unresolved review concerns.
- **Right rail (4 columns):** audit trail and key evidence cited.
- **Sticky bottom decision bar:** human decision controls and guidance note.

## Components

### Proposal header

- Always uses `Proposed verdict`, never `Final answer` or `Solved`.
- Confidence score from the verdict contract, paired with a verbal label and
  explanation that confidence is not certainty.
- Review status: Awaiting review, Accepted, Rejected, or Re-investigation
  requested.

### Ranked conclusions

- Displays all conclusions in their returned rank order.
- Each conclusion shows case-derived subject/suspect, explanation, and exact
  evidence-ID chips.
- Rank 1 is visually primary without declaring legal or factual certainty.
- Selecting a citation opens Evidence detail.

### What remains uncertain

- Displays every verdict limitation.
- Includes unresolved Skeptic findings when they are available to the UI.
- Red is reserved for genuine risk/error; ordinary uncertainty uses restrained
  warning styling plus explicit wording.
- If no limitations are returned, the UI does not invent reassurance.

### Key evidence cited

- Deduplicated list of evidence IDs used by the conclusions.
- Shows short evidence statement, classification, and source link.
- `View all evidence` opens the Evidence screen.

### Investigation audit trail

- Shows observable stage completions, Skeptic outcome, revision round, Lead
  Detective synthesis, and human decision.
- Curator and Human Review remain stages, not agents.
- Timings appear only when measured.

### Human decision bar

- Actions:
  - `Accept proposal`
  - `Reject proposal`
  - `Request re-investigation`
- Accept/Reject require a concise confirmation describing that the recorded
  decision cannot be changed on this verdict.
- Re-investigation reveals a required `Guidance note` input and explains that
  existing evidence is reused while Suspect Analyst and Timeline Reconciler
  restart.
- All decision controls disable after a decision is recorded.

### Re-investigation history

- The prior proposal remains visibly marked `Re-investigation requested`.
- The guidance note is retained and shown as human-provided direction.
- During the new pass, the page links to Agent Workspace.
- When a new verdict arrives, it is displayed as a new proposal; do not imply
  an automatic comparison if the backend does not retain both result shapes.

## Interaction rules

- A human decision is available only when a verdict is awaiting review.
- A blank/whitespace guidance note cannot start re-investigation.
- Re-investigation uses the provider currently selected in the shared top bar.
- Accepting or rejecting does not alter the proposal's conclusions, confidence,
  or limitations.
- Users cannot edit the generated verdict.

## Required states

1. Waiting for synthesis.
2. Synthesis failed; verdict unavailable.
3. Awaiting human review.
4. Guidance note open but invalid/empty.
5. Re-investigation requested and running.
6. New proposal awaiting review.
7. Accepted decision recorded.
8. Rejected decision recorded.

## Data dependency note

The current verdict shape provides ranked conclusions, evidence IDs,
confidence, limitations, and review status. A generated `Suggested next step`
is therefore not part of the MVP screen unless the domain contract is expanded
in a separately approved specification. The re-investigation guidance note is
supported and remains the actionable next-step interface.

## Responsive behavior

- Below 1024px, audit trail and key evidence stack after the proposal.
- Below 640px, the decision bar becomes a vertical action sheet and the
  guidance input remains visible with its validation message.
- Evidence IDs stay adjacent to their conclusion text.

## Accessibility

- Decision confirmations move focus to the confirmation heading.
- Recorded decision is announced and remains visible in text.
- Confidence is spoken as a score and label, not represented by a gauge alone.
- Validation identifies the guidance field and explains what is required.

## Acceptance criteria

- [ ] The verdict is consistently labeled as a proposal.
- [ ] Every conclusion shows rank, explanation, and evidence IDs.
- [ ] Confidence and limitations are both prominent.
- [ ] Every cited ID opens its Evidence detail.
- [ ] Accept, Reject, and Re-investigation are enabled only while awaiting
  review.
- [ ] Re-investigation requires a non-empty guidance note and restarts at the
  parallel analysis stage without recollecting evidence.
- [ ] A recorded decision cannot be applied twice or reversed on that verdict.
- [ ] No unsupported suggested-next-step field is fabricated.

## Not on this screen

Verdict editing, decision reversal, signatures, multiple reviewers, PDF
export, public sharing, or automatic legal/factual certainty language.
