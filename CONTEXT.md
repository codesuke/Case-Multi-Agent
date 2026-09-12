# Sherlok Context

This project demonstrates how specialized AI agents can jointly analyze a
fictional mystery while keeping their reasoning inspectable and subject to a
human decision.

## Language

**Case file**:
The shared, structured state for one investigation: source mystery text,
evidence, analysis outputs, skeptic feedback, and the proposed verdict.
_Avoid_: session, database record

**Canonical case material**:
The readable, normalized source blocks produced by the Case File Curator
before evidence collection. It preserves supplied organization without
interpreting the mystery.

**Source reference**:
A safe, case-local pointer from a material block or evidence item to its
supplied source and available location, such as a heading, paragraph, list
item, or table row.
_Avoid_: upload path, filesystem location

**Evidence**:
An ID-tagged fact or clearly labeled inference extracted from the supplied
mystery text and cited by downstream claims.
_Avoid_: clue text, source snippet

**Claim**:
A conclusion made by an agent that must cite one or more evidence IDs.
_Avoid_: fact, guess

**Revision round**:
The single permitted rerun of a flagged analyst after Skeptic feedback.
_Avoid_: retry loop

**Verdict**:
The Lead Detective's ranked, evidence-cited proposal with a confidence score;
it is not a decision until a human reviews it.
_Avoid_: final answer, resolution

**Human decision**:
The Accept, Reject, or Request re-investigation outcome a person records
for a verdict that is awaiting human review. A verdict without one
remains a proposal.
_Avoid_: approval, final answer

**Guidance note**:
The non-empty note a human attaches when requesting re-investigation,
retained on the case file and available to every agent that reruns.
_Avoid_: prompt, comment

**Investigation event**:
A safe, observable change in workflow state that the Python runtime may send
to the Next.js workspace, such as an agent starting, completing, revising, or
failing. It can include a public summary and evidence IDs, but never hidden
model reasoning.
_Avoid_: chain-of-thought, agent thought

**Investigation snapshot**:
The current displayable projection of a case file: normalized sources,
workflow statuses, evidence, specialist results, Skeptic findings, proposed
verdict, and human decision. It is the recovery source when a live event was
missed.
_Avoid_: frontend state, transcript

**Agent Workspace**:
The Next.js view that shows the ordered workflow, parallel specialist work,
Skeptic challenge, bounded revision, synthesis, and handoff to human review.
It visualizes public investigation events rather than hidden reasoning.
_Avoid_: chat, chain-of-thought viewer

**Re-investigation**:
A restart of suspect analysis, timeline reconciliation, Skeptic review, and
verdict synthesis against the original mystery and evidence plus the
human's guidance note. The Evidence Collector does not rerun.
_Avoid_: retry, redo

**Reference case**:
The participant portion of *The Vanishing Aurora Diamond Case Book*, used as
the canonical end-to-end investigation scenario. Its sealed facilitator
solution is an evaluation oracle, not agent input.
_Avoid_: built-in case, system prompt context
