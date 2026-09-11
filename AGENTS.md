# Agent Guide

This is a beginner-friendly Python/Gradio demonstration of a multi-agent
detective workflow. The repository is the source of truth: read the durable
docs before changing behavior, make meaningful decisions explicit, and leave
the project clearer than you found it.

## Read First

- `docs/project-brief/PS.md` — assignment context and expected deliverable.
- `docs/reference-material/The_Vanishing_Aurora_Diamond_Case_Book.docx` —
  authoritative reference case and facilitator evaluation material.
- [GitHub master issue #1](https://github.com/codesuke/Case-Multi-Agent/issues/1)
  — product requirements, behavior contracts, and work tracking.
- `docs/specs-implemented/2026-09-11-sherlok-design.md` —
  intended architecture.
- `Architecture.md` — code layout and dependency boundaries.
- `CONTEXT.md` — project-specific language.
- `docs/agents/code-quality.md` and `docs/agents/python-gradio-conventions.md`
  — implementation conventions.

## Working Rules

- Maintain one GitHub master issue for each product initiative. Publish its
  approved implementation slices as native sub-issues, and keep the master
  issue's progress checklist current.
- Planning work produces specifications, acceptance criteria, dependencies,
  and implementation slices. It does not implement product code unless the
  user explicitly changes that responsibility.
- Prefer small, demonstrable vertical slices over broad rewrites.
- Build product behavior test-first: failing behavior test, minimal
  implementation, then refactor.
- Keep `CONTEXT.md` a glossary, not an implementation spec.
- Record hard-to-reverse architecture decisions in `docs/adr/` using the
  provided template.
- Put active work in `docs/specs-planned/` and archive shipped or superseded
  specs in `docs/specs-implemented/`.
- Agent code must depend on the provider-agnostic LLM wrapper, never a
  provider SDK directly.
- Use only the participant portion of the reference case as agent input. The
  sealed facilitator solution is an evaluation oracle and must not be exposed
  to agents during an investigation.
- Keep production behavior case-agnostic. Do not hard-code Aurora Diamond
  names, suspects, evidence IDs, times, conclusions, or expected counts in
  prompts, schemas, orchestration, or UI behavior. Use them only in reference
  fixtures, examples, and evaluation material.
- Do not add CI/CD pipelines, GitHub workflows, or issue-tracker automation
  unless the user explicitly requests them.

## Vendored Skills

The focused, repo-local skill set in `.agents/skills/` is sourced from
VirtuNode-dev/Starter-Pack. Use the applicable skill when planning, designing,
implementing, testing, debugging, reviewing, researching, or handing off
work. It intentionally excludes the Starter Pack's GitHub-flow and CI/CD
material.

## Definition of Done

- Requested observable behavior works.
- Relevant tests pass, or the reason they cannot run is stated.
- Documentation reflects changed product language, architecture, or workflow.
- Every final detective claim remains traceable to evidence IDs.
