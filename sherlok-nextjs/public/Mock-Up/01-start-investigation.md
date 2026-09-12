# Screen 01 — Start Investigation

Status: **Draft for approval**  
Route concept: `/`  
Navigation label: `New investigation`

## Purpose

Help a beginner supply usable fictional case material, choose an already
configured LLM provider, understand what will happen next, and start the
investigation confidently.

## Primary user outcome

The user submits at least one usable source and enters the investigation with
clear feedback about accepted material and any exclusions.

## Desktop composition

- **Left introduction panel (4 columns):** product promise, the three-step
  journey (`Add material → Watch agents → Review proposal`), and privacy/scope
  guidance.
- **Material workspace (8 columns):** paste input, upload dropzone, source
  list, provider selector, validation feedback, and primary action.
- No case navigation is shown before a case exists.

## Components

### Introductory header

- Serif title: `Start an investigation`.
- One-sentence explanation that Sherlok investigates fictional mysteries by
  separating evidence, specialist analysis, challenge, and human review.
- Compact workflow preview with five phases: Prepare, Collect, Analyze,
  Challenge, Review.

### Case material input

- Large text area labeled `Paste case material`.
- Upload dropzone labeled `Add case files`.
- Accepted formats: plain text, Markdown, DOCX, and text-based PDF.
- Helper text states that pasted text and files can be used together.
- Source rows show display name, format, processing status, warnings, and a
  remove action before the run starts.

### Provider selector

- Labeled `Investigation provider`.
- Fixed choices: Gemini, OpenAI, and Groq.
- Placed in a compact `Run settings` disclosure, collapsed by default.
- Shows provider name only. Credentials and model settings never appear.

### Safety and material notice

- States that only supplied participant material is investigated.
- Warns that image-only/scan PDFs require OCR and cannot be processed.
- Does not claim that the UI can reliably identify every facilitator-only
  document before curation.

### Primary action

- Button: `Start investigation`.
- Disabled only when no usable pasted text or uploaded source is present.
- While starting, changes to `Preparing case file…` with a progress indicator.
- Successful start routes to Agent Workspace.

### Validation panel

- Appears near the affected source and is summarized above the primary action.
- Names the unusable source and safe recovery action.
- Never displays a traceback, credential, raw provider response, or filesystem
  path.

## Interaction rules

- Removing a source is allowed only before the investigation starts.
- Pressing Start locks inputs for that start attempt and begins curation.
- Partial curation may proceed when at least one source is usable; excluded or
  uncertain material remains visible as a warning.
- A provider configuration failure remains on this screen because evidence
  collection has not begun.
- The user may fix material or select another configured provider and retry.

## Required states

1. Empty.
2. Material supplied and ready.
3. Preparing/normalizing.
4. Ready with non-blocking material warnings.
5. Blocking material validation error.
6. Safe provider configuration error.
7. Starting investigation.

## Responsive behavior

- Below 1024px, stack the introduction above the material workspace.
- Below 640px, make the dropzone, selector, source rows, and primary action
  full-width.
- Keep validation text adjacent to the relevant input.

## Accessibility

- Every uploaded source status is announced to assistive technology.
- The dropzone has an equivalent standard file-picker action.
- Errors link to and focus the field or source that needs attention.
- Loading state does not rely on animation alone.

## Acceptance criteria

- [ ] The screen accepts pasted text, supported files, or both.
- [ ] The user can remove a selected file before starting.
- [ ] Exactly one provider can be selected from the supported list.
- [ ] No credential or model input is shown.
- [ ] Start cannot proceed without usable material.
- [ ] Material/provider failures are safe, specific, and recoverable.
- [ ] A successful start opens the live Agent Workspace.
- [ ] No sample case names or fixed evidence counts appear in reusable UI.

## Not on this screen

Recent cases, saved templates, URL ingestion, OCR controls, case sharing,
advanced model settings, and a full canonical-material editor.
