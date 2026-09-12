# Screen 02 — Case Overview

Status: **Draft for approval**  
Route concept: `/case/overview`  
Navigation label: `Overview`

## Purpose

Orient the user in the current case and answer three questions quickly: what
material was supplied, where the investigation is now, and what requires
attention next.

## Primary user outcome

The user understands the case state and can move directly to the most relevant
screen without reading the full event log.

## Desktop composition

- **Header:** safe case label, current state, source count, evidence count, and
  context-sensitive primary action.
- **Main column (8 columns):** current-stage card, workflow rail, source
  material summary, and material warnings.
- **Right rail (4 columns):** next step, recent activity, and visible unresolved
  issues.

## Components

### Case header

- Case title derived from supplied material when available; otherwise a safe
  neutral label such as `Current case`.
- Status indicator: Preparing, Investigating, Revision in progress, Awaiting
  review, Accepted, Rejected, or Halted.
- Counts are derived from current case data and omitted until known.

### Current-stage card

- Plain-language stage title and description.
- Names the active workflow role without implying hidden thought visibility.
- Shows completed-stage count and elapsed time only when measured.
- One primary action based on state:
  - `Watch investigation`
  - `Review evidence`
  - `Resolve failure`
  - `Review proposed verdict`
  - `View recorded decision`

### Workflow rail

- Stages: Prepare → Collect → Analyze → Challenge → Synthesize → Review.
- Shows completed, current, queued, failed, and review states using icon,
  label, and color.
- Analyze visually branches into Suspect Analysis and Timeline Reconciliation.
- A revision marker appears only when a specialist was sent back by Skeptic.

### Source material summary

- One row/card per supplied source.
- Shows safe name, type, canonical block count, processing result, and warnings.
- `Open material` reveals canonical participant material and source locations.

### Investigation snapshot

- Derived summary cards for evidence items, suspect profiles, timeline events,
  contradictions/gaps, Skeptic findings, and verdict availability.
- Each card deep-links to its owning screen.
- Cards with unavailable data say `Waiting for…`; they do not show zero as if
  analysis finished.

### Attention panel

- Shows material warnings, named step failures, unresolved Skeptic findings,
  or pending human review.
- Each item has a specific destination or recovery action.

### Recent activity

- Displays a short, chronological set of real orchestration events.
- Shows agent/stage, event label, recency when measured, and linked evidence
  IDs when the event contains them.

## Interaction rules

- Evidence chips open Evidence detail and retain a return path.
- Clicking a workflow stage opens the relevant screen, including honest queued
  or error states.
- The overview is read-only; it does not edit evidence, case text, or agent
  output.
- Starting a completely new case returns to Start Investigation and requires
  an explicit confirmation if a current in-memory case would be replaced.

## Required states

1. Preparing case material.
2. Investigation in progress.
3. One specialist complete while the parallel specialist is working.
4. Revision round in progress.
5. Awaiting human review.
6. Accepted decision recorded.
7. Rejected decision recorded.
8. Halted at a named stage.

## Responsive behavior

- Below 1024px, the right rail stacks after the current-stage and workflow
  sections.
- Below 640px, summary cards use a single column and the workflow becomes a
  vertical phase list.

## Accessibility

- The workflow has a text-list equivalent with current-step semantics.
- Changing live counts and states uses polite announcements.
- All destination cards have descriptive accessible names.

## Acceptance criteria

- [ ] Current state and next action are understandable without opening logs.
- [ ] Counts and timings are displayed only when backed by real data.
- [ ] Every summary links to its owning screen.
- [ ] Failures name the affected stage and show a safe next action.
- [ ] Review status clearly distinguishes proposal from human decision.
- [ ] The page does not imply persistent history or multiple saved cases.

## Not on this screen

Editable case metadata, multi-case dashboards, collaborators, assignments,
deadlines, free-form notes, and manual workflow controls.
