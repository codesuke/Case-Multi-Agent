# Fix sealed facilitator-section boundaries

## Problem Statement

As a learner or facilitator, I cannot safely investigate a case book like
*The Vanishing Aurora Diamond Case Book*. The Case File Curator sees the
participant-facing cover sentence, “Participant edition followed by a sealed
facilitator solution,” as though it begins the sealed facilitator solution.
It then excludes almost all of the participant material before the Evidence
Collector begins. Converting the DOCX to PDF and then Markdown does not solve
the problem when the cover wording is preserved.

This violates the reference-case boundary in both directions: agents receive
too little canonical case material, while the real sealed facilitator solution
must still remain outside the case file and agent input.

## Solution

Make sealed facilitator-solution exclusion boundary-aware. The Case File
Curator will recognize only an actual facilitator section marker, rather than
any sentence that happens to mention a facilitator solution. It will retain the
complete participant portion, including its structured source blocks and
source references, and exclude the marker block and every following block from
canonical case material and all agent input.

The behavior will be verified through the existing public investigation flow,
using the reference case as an acceptance fixture without embedding any of its
case-specific facts, names, evidence IDs, or conclusions in production logic.

## User Stories

1. As a learner, I want participant-facing text that describes a sealed facilitator solution to remain in canonical case material, so that ordinary instructions do not remove my case.
2. As a facilitator, I want the actual sealed facilitator section excluded from agent input, so that its evaluation oracle cannot influence the investigation.
3. As a learner, I want the full participant briefing, incident material, witness statements, evidence register, and challenge material retained when they precede the facilitator section, so that agents can form an evidence-grounded verdict.
4. As a learner, I want headings, paragraphs, lists, and tables in the participant portion retained with their source references, so that I can inspect the origin of collected evidence.
5. As a learner, I want the Curator to display a clear notice when it excludes a sealed facilitator section, so that I understand why later material is absent.
6. As a learner, I want direct DOCX intake to work for a structured case book, so that I do not need a lossy conversion step before investigating it.
7. As a learner, I want equivalent Markdown that contains participant prose mentioning a sealed solution to keep that prose, so that a document conversion does not create a false exclusion.
8. As a learner, I want text-based PDF extraction to use the same exclusion rule after page Markdown is normalized, so that format choice does not weaken the boundary.
9. As a facilitator, I want a real facilitator heading with permitted wording variants recognized, so that the evaluation oracle is consistently kept outside the case file.
10. As a facilitator, I want text after the real facilitator heading excluded even if it is a paragraph, list, or table, so that none of the sealed solution reaches an agent.
11. As a maintainer, I want the exclusion rule based on document structure already produced by the Curator, so that it stays deterministic and does not depend on an LLM.
12. As a maintainer, I want the rule to remain case-agnostic, so that it supports arbitrary fictional case books without encoding Aurora Diamond-specific content.
13. As a maintainer, I want an intake failure or warning to remain visible when no usable participant material exists, so that the system does not start an investigation from empty or sealed-only content.
14. As a learner, I want the Evidence Collector to receive only canonical participant material, so that every resulting evidence item remains traceable to permitted source material.
15. As a learner, I want downstream detective roles and human review behavior unchanged, so that this correction fixes intake without changing how a verdict is proposed or decided.
16. As a maintainer, I want deterministic regression coverage for the reference case and compact synthetic fixtures, so that future marker changes cannot silently reintroduce truncation or leakage.

## Implementation Decisions

- Keep the Case File Curator as the sole owner of sealed facilitator-solution exclusion. The Evidence Collector and all specialist agents receive only the resulting canonical case material.
- Replace the broad anywhere-in-text marker match with a boundary-aware predicate over normalized source blocks. A marker qualifies only when it represents a section boundary: a DOCX heading block or a Markdown heading block. Plain-text content may qualify only when it occupies a standalone section-like line, not as a phrase inside participant prose.
- The qualifying marker must identify a facilitator-only solution or facilitator evaluation section using the existing supported terminology and case-insensitive matching. The exact marker vocabulary is generic and must not contain reference-case names, evidence IDs, times, suspects, or conclusions.
- When a qualifying marker occurs, retain every preceding block unchanged; remove the marker and every subsequent block before rendering source text, canonical case material, prompt material, and agent input.
- Preserve the existing sanitized warning that a sealed facilitator solution was excluded. Do not include sealed text in warnings, validation errors, transcripts, source references, or case-file fields.
- Continue parsing DOCX directly and preserve the existing PDF-to-Markdown and Markdown paths. The boundary decision is made after each format becomes typed source blocks, providing one shared rule across formats.
- Do not infer hidden sections from layout, page breaks, bold text alone, or case conclusions. If a source lacks a qualifying section boundary, treat it as participant material; this avoids silently discarding legitimate case content.
- If no blocks remain after a qualifying exclusion, retain the current safe validation behavior that stops before Evidence Collection.
- No new architecture decision record is required: this narrows an existing Case File Curator safety rule without introducing a new dependency, data boundary, or reversible architectural choice.

## Testing Decisions

- Use the public streamed investigation flow with a mocked provider-neutral LLM as the highest acceptance seam. Supply case material, observe the curated case file handed to Evidence Collection, and assert that the participant material is available while facilitator material is absent.
- Good tests assert observable canonical case material, source blocks, source references, warnings, and pre-Evidence-Collection validation behavior. They do not assert regular-expression internals, helper calls, prompt wording, or the DOCX/PDF library implementation.
- Add a regression test using the supplied Aurora Diamond reference DOCX. It must prove that participant case facts and structured participant tables remain available, the actual facilitator section is excluded, and no sealed facilitator text reaches the mock LLM.
- Add compact DOCX and Markdown fixtures where a participant paragraph mentions a sealed facilitator solution before a later facilitator heading. Assert the mention remains and only content after the heading is excluded.
- Extend the existing text-based PDF seam with page Markdown containing the same false-positive phrase and a later facilitator heading. Assert that page-aware participant blocks remain and sealed blocks are excluded.
- Retain coverage for accepted facilitator-heading variants and for the sealed-only case that must halt before Evidence Collection.
- Reuse the existing case-material intake and PDF intake tests as prior art. All tests remain deterministic, run without credentials or network provider calls, and keep the facilitator solution outside agent input.

## Acceptance Criteria

- Curating the supplied reference DOCX retains participant incident material, its evidence register, and participant tables while excluding the actual `Facilitator Only Solution` section and all following sealed material.
- A participant sentence that mentions a sealed facilitator solution does not trigger exclusion in DOCX, Markdown, or PDF-derived Markdown material.
- A qualifying facilitator section marker produces one sanitized exclusion warning and leaves no sealed text in canonical case material, prompt material, source text, source references, or mock-LLM input.
- A sealed-only source fails visibly before Evidence Collection, preserving the existing safe validation contract.
- The existing public investigation flow continues to preserve evidence traceability for retained participant material.
- The full deterministic test suite passes without a live LLM provider, credentials, or OCR.

## Dependencies

- This is a corrective child slice of the Case File Curator initiative (#23) and builds on the completed DOCX and text-based PDF intake slices (#25 and #26).
- It requires no new provider, parser, OCR, persistence, or UI dependency.

## Out of Scope

- OCR or recovery of scanned, image-only, encrypted, malformed, or otherwise unreadable PDFs.
- General document-layout recognition, including treating arbitrary bold, page breaks, or visual spacing as a facilitator boundary.
- Changes to evidence schemas, specialist responsibilities, the Skeptic revision-round limit, verdict synthesis, human decision controls, or provider selection.
- Extracting, displaying, storing, or evaluating the sealed facilitator solution during a participant investigation.
- Converting DOCX to PDF or PDF to Markdown as a required ingestion route.

## Further Notes

- Direct DOCX intake is preferred for DOCX source material because it retains native structure without an additional conversion boundary.
- The reference case remains an acceptance fixture and evaluation oracle only. Production behavior must remain case-agnostic.
- The related investigation and reproducible observations are recorded in the Aurora case-book intake Q&A note.
