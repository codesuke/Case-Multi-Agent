# Screen 03 — Evidence

Status: **Draft for approval**  
Route concept: `/case/evidence`  
Navigation label: `Evidence`  
Visual anchor: `public/design/evidence-workspace-dossier-v2.png`

## Purpose

Let the user inspect what the Evidence Collector extracted and trace every
evidence item back to the participant material supplied for this case.

## Primary user outcome

The user can answer: “Is this an observed fact or an inference, and exactly
where did it come from?”

## Desktop composition

- **Header:** title, Evidence Collector status, evidence search, and filters.
- **Main column (9 columns):** source material summary, evidence table, and an
  inline or drawer detail view.
- **Right rail (3 columns):** collection status, source warnings, and next
  workflow step.

## Components

### Source material panel

- Source cards show safe display name, format, canonical block count, and
  warnings.
- `Open material` opens a reader anchored to a safe source reference.
- The reader displays participant material only.

### Evidence toolbar

- Case-local search across evidence ID and statement.
- Classification filter: All, Observed fact, Inference.
- Source filter populated from current case sources.
- Sort: source order, evidence ID, or classification.
- Filters operate on current loaded evidence; they do not imply web or
  semantic search.

### Evidence table

- Columns: ID, statement, classification, source reference, and actions.
- ID remains visible at narrow widths and beside the statement.
- Classification always uses icon, label, and color.
- Source references are safe links, not upload paths.
- Row selection opens Evidence detail.

### Evidence detail drawer

- Evidence ID and classification.
- Full statement.
- One or more source references.
- Traceability path: supplied source → canonical block → evidence item.
- Related claims/events/conclusions that cite this evidence, when available.
- `Open source location` and `Return to referring claim` actions.
- No edit or delete controls.

### Collector status card

- Shows Queued, Working, Completed, or Failed.
- Plain-language checklist may include material curated, evidence extracted,
  and source references validated only when those events are confirmed.
- Named safe error and recovery guidance on failure.

## Interaction rules

- Evidence ID links anywhere in Sherlok open this screen with the item selected.
- Opening a source reference focuses the canonical block without exposing a
  filesystem location.
- Search/filter no-results state preserves active filters and offers `Clear
  filters`.
- Evidence is read-only because it is agent-produced case state.

## Required states

1. Collector queued.
2. Collecting evidence.
3. Populated and complete.
4. No matches for current filters.
5. Material processed with warnings.
6. Collector or source-reference validation failure.

## Responsive behavior

- Below 1024px, status and warnings move below the table.
- Below 640px, rows become stacked evidence cards; ID and classification stay
  in the card header.
- Evidence detail becomes a full-height sheet on mobile.

## Accessibility

- The evidence table has a card/list alternative on small screens without
  changing reading order.
- Classification is never color-only.
- Drawer focus is trapped and returns to the triggering item on close.
- Source anchors have descriptive labels including available location.

## Acceptance criteria

- [ ] Every evidence item shows its exact ID and classification.
- [ ] Every evidence item exposes at least one valid source reference when
  supplied by the Collector contract.
- [ ] Evidence IDs deep-link into the correct selected detail.
- [ ] Search and filters have loading, populated, and no-results behavior.
- [ ] Warnings and failures remain visible and safe.
- [ ] Agent output cannot display facilitator-only material.
- [ ] The screen contains no manual evidence editing or deletion.

## Not on this screen

Manual evidence creation, tagging, bulk actions, deletion, global search,
annotations, or external research.
