# Spec: Canonical Agent-Orchestration Source

## Problem Statement

Sherlok's deployable workspace contains the Python agent-orchestration module,
but matching root-level Python source still exists for older tests and tools.
Two copies can drift, making it unclear which Case File, orchestration, or LLM
behavior will run in the shipped application.

## Solution

Make the agent-orchestration module the only canonical Python source. Adapt
tests and developer tooling to execute it through the existing Python
application interface, then remove duplicate runtime source without changing
the Case File, investigation events, or Next.js transport contract.

## User Stories

1. As a contributor, I want one canonical orchestration source, so that a change cannot silently affect local tests but not deployment.
2. As a contributor, I want the module name to describe agent orchestration rather than a programming language, so that I can navigate the repository by responsibility.
3. As a local developer, I want one documented setup path, so that I can run the complete application from a clean checkout.
4. As a deployer, I want the image to use the same orchestration source that tests exercise, so that deployment behavior is predictable.
5. As a User, I want Start Investigation, snapshots, events, Human Decisions, and Re-investigation to retain their existing behavior, so that source consolidation does not change the investigation experience.
6. As a User, I want Case File evidence IDs and source references preserved, so that every claim remains traceable after consolidation.
7. As a maintainer, I want provider credentials to stay in the shared server-side configuration, so that consolidation does not expose them to browser code.
8. As a test author, I want deterministic LLM fakes to work at the existing application interface, so that tests remain independent of providers.
9. As a reviewer, I want no duplicate production orchestration modules left behind, so that the repository communicates one source of truth.
10. As a documentation reader, I want architecture and setup guidance to name the canonical module consistently, so that instructions match the running application.

## Implementation Decisions

- The existing Python application interface remains the single test seam for
  investigation behavior: start, snapshot, events, decision, and
  re-investigation.
- The agent-orchestration module becomes the canonical implementation for Case
  File state, material curation, orchestration, specialist agents, LLM access,
  and the transport adapter.
- Test imports, local diagnostic tooling, and generated transport-contract
  verification are redirected to the canonical module rather than maintaining
  wrappers or duplicate implementations.
- The Next.js presentation module continues to use only same-origin routes;
  no browser-facing transport or provider contract changes are introduced.
- Shared local configuration remains workspace-level. Deployment variables are
  inherited by both processes in the single image.
- Duplicate source is removed only after behavior and transport tests execute
  against the canonical module.

## Testing Decisions

- Test observable behavior through the Python application interface, not
  module-private helpers or import location details.
- Reuse deterministic tests for Case File evidence traceability, source
  curation, bounded Skeptic revision, safe failures, and Human Decisions.
- Reuse the generated OpenAPI and Next.js transport-contract tests to prove
  the presentation seam is unchanged.
- Add a deployment-level smoke check that starts the canonical module in the
  single image and verifies that the public Next.js route can reach it.
- A good test demonstrates the same Investigation Snapshot and ordered public
  events before and after consolidation without a live provider call.

## Out of Scope

- Changing agent prompts, specialist roles, Case File schema, evidence rules,
  provider selection, persistence, authentication, or UI design.
- Moving orchestration into browser code or replacing the HTTP/event seam.
- Adding CI/CD workflows or deployment automation.

## Further Notes

This work removes the temporary source-parity constraint recorded by the
single-image architecture decision. It is a repository-structure change, not a
new detective capability.
