# Sherlok UI Mock-Up Scope

Status: **Next.js direction approved; screen contracts are the implementation baseline**  
Purpose: define the screens to mock up before frontend implementation begins.

These documents translate `design.md`, the supplied reference images, and the
implemented Sherlok workflow into a case-agnostic UI scope. They specify
observable product behavior, not implementation details.

## Proposed screen map

| Screen | Mock-up | User question | Primary reference |
| --- | --- | --- | --- |
| [Start Investigation](01-start-investigation.md) | [PNG](01-start-investigation.png) | How do I give Sherlok a case? | New composition |
| [Case Overview](02-case-overview.md) | [PNG](02-case-overview.png) | What is happening in this case? | Dossier shell language |
| [Evidence](03-evidence.md) | [PNG](03-evidence.png) | What do the agents know, and where did it come from? | `evidence-workspace-dossier-v2.png` |
| [Timeline](04-timeline.md) | [PNG](04-timeline.png) | What happened, in what order, and what conflicts? | Evidence visual language |
| [Analysis](05-analysis.md) | [PNG](05-analysis.png) | What did the specialists claim, and how was it challenged? | Evidence + orchestration language |
| [Agent Workspace](06-agent-workspace.md) | [PNG](06-agent-workspace.png) | How are the agents collaborating right now? | `orchestration-workspace-dossier-v2.png` |
| [Proposed Verdict](07-proposed-verdict.md) | [PNG](07-proposed-verdict.png) | What is being proposed, and what should I decide? | `human-review-dossier-v2.png` |

## Navigation model

Before a case starts, Sherlok opens on **Start Investigation**. After usable
case material is submitted, the persistent case navigation contains:

1. Overview
2. Evidence
3. Timeline
4. Analysis
5. Agent Workspace
6. Proposed Verdict

All destinations remain visible during a run. A destination with no data yet
shows an honest queued or empty state instead of disappearing. Starting a run
automatically opens Agent Workspace; completion of synthesis makes Proposed
Verdict the recommended next destination.

## Shared shell

- **Left rail:** Sherlok wordmark, mission line, case navigation, and safe
  system status. No multi-case library is implied.
- **Top utility bar:** case-local search when data exists, current case label,
  active provider selector, and help. Do not show credentials or model names.
- **Main workspace:** warm parchment content area using a 12-column desktop
  grid and the tokens in `design.md`.
- **Optional right rail:** current status, next step, activity, or citations,
  depending on the screen.
- **Mobile:** navigation becomes a drawer; right-rail content stacks below the
  main content; evidence IDs remain beside their claims.

## Shared component contracts

### Evidence ID chip

- Shows the exact case-local evidence ID.
- Is keyboard focusable and never communicates state by color alone.
- Opens that evidence item on the Evidence screen in a detail drawer.
- Provides a return path to the claim, event, activity, or verdict that linked
  to it.

### Source reference link

- Shows a safe source label and available heading, paragraph, list, table, or
  page location.
- Never exposes an upload path or filesystem location.
- Opens canonical participant material at the referenced block.

### Status indicator

- Always combines icon, text, and color.
- Uses: teal for complete/verified, gold for queued/working/revising, plum for
  awaiting human review, and red for failure or material risk.
- Supported labels are contextual: `Queued`, `Working`, `Completed`,
  `Revising`, `Failed`, and `Awaiting review`.

### Evidence detail drawer

- Shared by Evidence, Timeline, Analysis, Agent Workspace, and Proposed
  Verdict.
- Shows statement, observed-fact/inference classification, source references,
  and related claims.
- Never displays hidden model reasoning or the sealed facilitator solution.

## Product-wide rules

- Every displayed agent claim keeps its evidence IDs beside it.
- Source references and evidence IDs are visually and semantically distinct.
- Observed fact and inference use words and icons, not color alone.
- Confidence is presented as confidence, never certainty.
- The verdict is always a proposal until a person records a decision.
- The Skeptic revision path is visibly limited to one revision round per
  flagged specialist.
- The Case File Curator and Human Review are workflow stages, not AI agents.
- All names, counts, IDs, times, and conclusions come from the current case.
- Only participant-provided material may appear in the investigation views.

## Deliberate MVP exclusions

The inspiration images show several ideas that are outside the current product
contract. Do not include them in generated mock-ups unless scope is expanded:

- authentication, profiles, or multi-user collaboration;
- saved case history or a multi-case dashboard;
- editable agent graphs, custom agents, prompt editing, or arbitrary reruns;
- free-form agent chat or hidden chain-of-thought;
- Notes, Research, Reports, notifications, or web search;
- manual evidence/claim editing and deletion;
- export, sharing, signatures, or multiple reviewers;
- API-key or model configuration in the browser;
- OCR and ingestion from URLs.

## Change gate

The Next.js presentation-layer direction is approved. Any later product-scope
change must update the affected screen file first so design, implementation,
and testing share the same contract.
