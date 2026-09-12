# Screen 06 — Agent Workspace

Status: **Draft for approval**  
Route concept: `/case/agents`  
Navigation label: `Agent Workspace`  
Visual anchor: `public/design/orchestration-workspace-dossier-v2.png`

## Purpose

Make the orchestration understandable while it runs: who is working, what each
role receives and produces, where parallel work occurs, and whether Skeptic
feedback caused the one permitted revision round.

## Primary user outcome

The user can watch and inspect the multi-agent workflow without needing to
understand implementation code or trust a black-box transcript.

## Desktop composition

- **Header:** investigation state, plain-language progress, elapsed time when
  measured, and link to current issue/failure.
- **Main column (9 columns):** workflow graph, phase rail, and selected-stage
  detail.
- **Right rail (3 columns):** chronological activity feed and visible errors.

## Components

### Workflow graph

The graph must represent the real dependency order:

```text
Case File Curator → Evidence Collector
                         ├→ Suspect Analyst ───────┐
                         └→ Timeline Reconciler ──┤
                                                  ↓
                                               Skeptic
                                                  ↺ Revision 1 of 1
                                                  ↓
                                           Lead Detective
                                                  ↓
                                             Human Review
```

- Curator and Human Review are stages, not AI agents.
- Suspect Analyst and Timeline Reconciler visibly run in parallel.
- The revision edge targets only the specialist(s) flagged by Skeptic.
- The graph supports Queued, Working, Completed, Revising, Failed, and Awaiting
  review using icon, text, and color.

### Phase rail

- Prepare → Collect → Analyze → Challenge → Synthesize → Review.
- Provides quick orientation and a linear, accessible equivalent to the graph.

### Overall progress

- Uses completed stages plus plain-language current work.
- A percentage may appear only if calculated from meaningful workflow state.
- Agent/stage totals are derived; never hard-code a count from an inspiration
  image.

### Selected-stage detail

- Role/stage name and responsibility.
- Current status and current observable operation.
- Input summary using references and evidence IDs, not private reasoning.
- Structured output summary when available.
- Start/end/elapsed timing only when measured.
- Skeptic feedback and revision state when applicable.
- Links to full Evidence, Timeline, Analysis, or Verdict data.

### Activity feed

- Chronological real orchestration events.
- Each item shows actor/stage, status, event label, recency/time when measured,
  supporting detail, and evidence IDs when present.
- Filters: All activity or selected stage.
- Does not manufacture conversational messages between agents.

### Failure panel

- Names the failed stage and gives a safe, actionable message.
- Explains which downstream stages did not run.
- Preserves successfully completed prior-stage data.
- Does not show tracebacks, raw provider payloads, credentials, or fabricated
  partial verdicts.

## Interaction rules

- Selecting a graph node updates Selected-stage detail and optionally filters
  the activity feed.
- Evidence chips open Evidence detail with a return path.
- Completed stage links open its full owning screen.
- When synthesis completes, `Review proposed verdict` becomes the primary
  action.
- The workflow is inspectable but not editable.

## Required states

1. Ready/starting.
2. Curating material.
3. Collecting evidence.
4. Parallel specialist analysis.
5. Skeptic reviewing.
6. Revision 1 of 1.
7. Lead Detective synthesizing.
8. Awaiting human review.
9. Human decision recorded.
10. Halted at any named stage.

## Fidelity rules

- Never show Skeptic working or complete before both parallel specialists
  finish successfully.
- Never show Lead Detective working before Skeptic permits synthesis.
- Never show a verdict after a dependent-stage failure.
- Never show pause, cancel, retry, reroute, drag-and-drop, or manual-run
  controls unless those behaviors are implemented later.
- Never label hidden chain-of-thought as an agent output.

## Responsive behavior

- Below 1024px, activity and errors stack under the workflow/detail area.
- Below 640px, replace the spatial graph with an equivalent vertical dependency
  list while retaining the parallel-branch relationship in text.

## Accessibility

- The graph has a complete ordered-list alternative.
- Live activity updates are polite and do not repeatedly steal focus.
- Reduced-motion preferences disable pulsing/progress animation.
- Node status never relies on position, motion, or color alone.

## Acceptance criteria

- [ ] The graph matches the implemented dependencies and parallel branch.
- [ ] Selecting a stage reveals its responsibility, inputs, outputs, and state.
- [ ] Activity comes from real streamed events.
- [ ] The Skeptic feedback loop is clearly bounded to Revision 1 of 1.
- [ ] Failures remain visible and prevent false downstream completion.
- [ ] The user can trace cited outputs to evidence.
- [ ] The screen contains no graph-editing or agent-chat controls.

## Not on this screen

Custom agents, graph editing, prompt editing, arbitrary reruns, token/cost
dashboards, private chain-of-thought, or fake agent conversations.
