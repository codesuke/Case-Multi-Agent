# GitHub open-issue audit — 2026-09-13

## Scope and method

This audit reads the GitHub REST API for the `codesuke/Sherlok` repository.
It counts issue records only. It does not count pull requests returned by the
issues endpoint. The audit time is 2026-09-13 (UTC).

Primary sources:

- [Open issue query](https://api.github.com/repos/codesuke/Sherlok/issues?state=open&per_page=100)
- [Master issue #1](https://github.com/codesuke/Sherlok/issues/1)
- [Child issue #2](https://github.com/codesuke/Sherlok/issues/2)
- [Issue #1 timeline](https://api.github.com/repos/codesuke/Sherlok/issues/1/timeline)
- [Issue #2 timeline](https://api.github.com/repos/codesuke/Sherlok/issues/2/timeline)

## Current status

There are **two open issues**. Both are unassigned, have no milestone, have
no comments, and have the `ready-for-agent` label.

| Issue | Status | Evidence of progress |
| --- | --- | --- |
| [#1 — Migrate Sherlok presentation layer to Next.js](https://github.com/codesuke/Sherlok/issues/1) | Open master issue; its timeline records #2 as a child issue. | Three of six approved implementation slices are checked complete. Slice 1 is the versioned Python interface. Slice 2 is the in-memory REST/SSE adapter. Slice 3 is the Next.js same-origin routes and typed server adapter. |
| [#2 — Complete functional wiring for every Next.js investigation workspace route](https://github.com/codesuke/Sherlok/issues/2) | Open child issue of #1. Its timeline records #1 as its parent. | The issue has no completed checklist items, comments, closing event, linked pull request, or commit event. Its body says that workspace routes have partial wiring and `/case/agents` is still a static mock. |

## Completion measurement

The only explicit completion measure in the open issues is the six-slice
checklist in #1. **3 of 6 slices are complete (50%).** This is completion of
the approved implementation slices, not a measured percentage of total project
effort. Issue #2 remains open and is itself unchecked in #1's approved
follow-up list.

## Remaining work

The remaining work is stated in ASD-STE100 style.

1. Build the live Agent Workspace from investigation snapshots and events.
   Show parallel work, Skeptic revisions, and safe failure states.
2. Connect the Case Overview, Evidence, Timeline, Analysis, and Proposed
   Verdict pages. Keep evidence links and human decisions for the same
   investigation ID.
3. Add and run the critical browser journey. Update local run documentation
   and record the delivered runtime architecture.
4. Make `/agent-workspace` the canonical live workspace route. Make
   `/case/agents` an ID-preserving alias or redirect. Remove its static mock
   behavior.
5. Make all public routes show returned investigation data or a safe recovery
   state. Do not show invented case data.
6. Test the full browser journey with an unrelated fictional case. Test
   unavailable service, invalid input, unknown ID, step failure, and lost
   event-stream recovery.

Items 1 through 3 are the unchecked master slices. Items 4 through 6 state
specific acceptance work from the open child issue. They are not additional
master slices.
