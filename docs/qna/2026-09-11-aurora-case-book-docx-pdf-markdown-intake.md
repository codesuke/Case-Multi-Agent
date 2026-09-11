# Aurora case-book DOCX → PDF → Markdown intake

## Question

Can the current application safely use case books structured like
`The_Vanishing_Aurora_Diamond_Case_Book.docx` after they are converted to PDF
and then Markdown?

## Answer

**Not yet for this case book.** The Curator supports PDF, DOCX, Markdown, and
plain-text input, and its PDF route sends locally extracted page Markdown
through the Markdown parser. [Supported formats and routing](../../case_material.py#L173-L205)
Text-based PDFs can therefore be processed when their extraction is usable;
scanned/OCR-required pages are deliberately excluded. [PDF extraction
policy](../../case_material.py#L208-L258)

However, this exact document currently loses almost the entire participant
case before any detective agent receives it. Its cover includes the ordinary
participant-facing sentence “Participant edition followed by a sealed
facilitator solution,” before the real `Facilitator Only Solution` section.
The actual DOCX has 149 top-level paragraphs, 12 tables, and no inline
images (read with `python-docx` on 2026-09-11). The Curator's marker pattern
matches that earlier sentence, then removes that block's matching suffix and
all following blocks. [Marker pattern](../../case_material.py#L17-L20)
[Truncation behavior](../../case_material.py#L598-L611)

Read-only execution against the supplied DOCX produced 138 extracted blocks
but retained only 11 (ten paragraphs and one table), with the sealed-solution
warning. A local DOCX-to-GFM conversion produced the same cover sentence; when
that Markdown was curated, it retained only nine blocks. Thus DOCX → PDF →
Markdown is not a workaround: a conversion that preserves this wording will
trigger the same false positive. A generated PDF was not tested in this
environment, so page-layout/OCR fidelity is separately unverified.

## What must change before using such files

1. Detect the sealed portion only at a section boundary/heading (or using
   trusted document metadata), rather than matching the phrase anywhere in a
   text block.
2. Add a regression test using this reference document, asserting that the
   complete participant portion—including its case facts and tables—is kept,
   while the actual facilitator section is excluded.
3. Validate the chosen DOCX → PDF → Markdown converter against that fixture.
   For PDFs, confirm every participant page is text-extractable and review
   table warnings; OCR-required pages are intentionally not ingested.

Direct DOCX intake is preferable once the marker bug is fixed: it preserves
DOCX headings, lists, and tables without adding a renderer/converter boundary.
The existing PDF-adapter decision likewise says not to convert DOCX to PDF
first. [Existing adapter decision](2026-09-11-pdf-inspector-case-material-adapter.md)
