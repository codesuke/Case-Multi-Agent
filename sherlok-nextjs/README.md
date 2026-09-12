# Sherlok Next.js Workspace

This directory contains Sherlok's target user-facing investigation workspace.
Python remains responsible for case-material processing, agent orchestration,
validation, case state, and LLM access. Next.js renders that state and makes
the live multi-agent workflow understandable to a human reviewer.

Status: scaffolded and designed; backend integration is planned but not yet
implemented.

## Getting started

Install dependencies with the pinned package manager, then start the frontend:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The current home page is
still the generated scaffold.

## Read before implementation

- [`design.md`](design.md) defines the visual system.
- [`public/Mock-Up/README.md`](public/Mock-Up/README.md) defines the seven-screen map and shared interaction rules.
- [`../docs/specs-planned/2026-09-12-nextjs-investigation-workspace.md`](../docs/specs-planned/2026-09-12-nextjs-investigation-workspace.md) defines behavior and the Python seam.
- [`../docs/adr/0001-nextjs-presentation-python-orchestration.md`](../docs/adr/0001-nextjs-presentation-python-orchestration.md) records the stack decision.

Before changing framework code, also read the version-matched documentation
under `node_modules/next/dist/docs/`, as required by this directory's
`AGENTS.md`.

## Product rules

- Keep evidence IDs beside every displayed agent claim.
- Show observable progress and result summaries, never hidden chain-of-thought.
- Treat the verdict as a proposal until a person records a decision.
- Never expose credentials, raw provider output, upload paths, or facilitator-only material.
- Keep all reusable UI behavior case-agnostic.

## Framework documentation

- [Next.js documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
