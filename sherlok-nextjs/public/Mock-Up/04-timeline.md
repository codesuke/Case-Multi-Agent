# Screen 04 — Timeline

Status: **Draft for approval**  
Route concept: `/case/timeline`  
Navigation label: `Timeline`

## Purpose

Make chronology, unordered events, gaps, and contradictions understandable
while preserving the evidence behind each timeline claim.

## Primary user outcome

The user can see what is known about event order, what remains uncertain, and
which evidence supports each event or issue.

## Desktop composition

- **Header:** title, Timeline Reconciler status, revision badge, and compact
  view filters.
- **Main column (8 columns):** chronological rail/list and unordered events.
- **Right rail (4 columns):** gaps and contradictions, selected-event detail,
  and relevant Skeptic feedback.

## Components

### Timeline status header

- Status: Queued, Working, Completed, Revising, or Failed.
- Revision label uses `Revision 1 of 1` only after Skeptic sends this specialist
  back.
- Describes that a timestamp can be unknown without making the event invalid.

### Chronological event rail

- Event cards show time (or time range), statement, supported/unknown status,
  order, and evidence-ID chips.
- Events use the Timeline Reconciler's provided order; the UI does not infer or
  repair chronology.
- A selected event opens related evidence and source references.

### Unordered or uncertain events

- Separate section for events with no reliable time or order.
- Explains why these are not silently placed on the chronological rail.
- Uses the same citation and status treatment as ordered events.

### Gaps and contradictions panel

- Groups issues by `Gap` and `Contradiction`.
- Each item includes the exact issue statement and cited evidence IDs.
- Does not turn a gap into an accusation or invented event.

### Revision comparison

- Appears only if the Timeline Reconciler was revised.
- Shows the triggering Skeptic finding and a read-only comparison between
  first-pass and current output when first-pass data is retained.
- If first-pass data is not retained, shows the feedback and revision status
  without fabricating a diff.

## Interaction rules

- Selecting an event or issue highlights it and opens its evidence detail.
- Filters switch among All, Events, Gaps, and Contradictions.
- A Skeptic link opens the Analysis screen at the relevant finding.
- Users cannot drag, reorder, edit, or insert events.

## Required states

1. Queued behind Evidence Collector.
2. Working in parallel with Suspect Analyst.
3. Completed with ordered events.
4. Completed with unordered events and/or issues.
5. Revision requested.
6. Revision 1 of 1 working or complete.
7. Failed with named safe error.

## Responsive behavior

- Below 1024px, gaps/contradictions stack beneath the event rail.
- Below 640px, the timeline becomes a single vertical list with time, status,
  statement, and citations kept together.

## Accessibility

- Chronology is encoded in document order, not visual position alone.
- Issue type and claim status use text and icon as well as color.
- Evidence chips and related-finding links are keyboard reachable.

## Acceptance criteria

- [ ] Ordered and unordered events are clearly separated.
- [ ] Every event and issue retains its evidence IDs.
- [ ] Gaps and contradictions remain visible as unresolved analysis.
- [ ] The only revision shown is the bounded Skeptic-requested round.
- [ ] The UI never invents a time, order, event, or comparison.
- [ ] A failure halts dependent-stage expectations without hiding prior data.

## Not on this screen

Drag-to-reorder, manual timeline editing, maps, calendars, user-authored events,
or controls for additional revision rounds.
