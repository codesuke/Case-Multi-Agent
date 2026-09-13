# pdf-inspector as a PDF case-material adapter

## Question

Should the Case File Curator use Firecrawl's `pdf-inspector` to turn supplied
PDF case material into Markdown before the detective workflow consumes it?

## Answer

**Yes, as an optional local adapter for PDFs; no, as a reason to convert DOCX
files to PDF first.** `pdf-inspector` is a credible fit for the PDF portion of
issue #23: it has a Python package, can accept PDF bytes, classifies text,
scanned, image-based, and mixed PDFs, and can return page-level Markdown plus
layout/OCR diagnostics. Its documented Markdown conversion covers headings,
ordered and unordered lists, and heuristic/rectangle-detected tables. [Python
API](https://github.com/firecrawl/pdf-inspector/blob/main/docs/python.md)

Keep DOCX extraction direct. Converting DOCX to PDF introduces an additional
renderer, can lose semantic list/table information, and makes the original
DOCX locations harder to preserve. It also expands the scope beyond the
format-specific intake boundary specified in issue #23.

## Fit with issue #23

| Requirement | Fit | Decision / caveat |
| --- | --- | --- |
| Deterministic local PDF extraction, no LLM file decoding | Good | The binding processes a path or bytes locally; the documented native flow is PDF classification, extraction, and Markdown conversion. |
| Headings, lists, tables, and reading order | Good for ordinary text PDFs | The converter documents H1–H4 headings, bullet/numbered/letter lists, multi-column reading order, and two table-detection strategies. Treat generated Markdown as an input to the Curator's typed-block parser, not as proof that every table is correct. |
| Page-aware, safe source references | Good | `extract_pages_markdown[_bytes]` returns one Markdown result per page; result metadata includes pages with tables/columns and pages needing OCR. Store display name + 1-based page in the project's safe `SourceReference`, never an upload path. |
| Scanned/image-only PDFs | Conditional | Native extraction identifies pages needing OCR. The original #23 scope explicitly defers OCR, so the first slice should show a warning and halt/exclude unusable pages rather than call OCR. |
| Mixed PDFs | Good routing signal, not automatic fidelity | Per-page OCR reasons and confidence enable a visible warning for the affected pages. Do not silently merge incomplete pages into canonical case material. |
| Privacy / untrusted uploads | Good if native-only | Native extraction keeps PDF bytes in the application process. Do not enable a hosted fallback or automatic OCR-model acquisition without an explicit product decision: OCR can need PDFium, ONNX Runtime, and a first-use model download. |
| Python application integration | Good | Install with `pip install pdf-inspector`; documented prebuilt CPython wheels cover Linux x86_64/aarch64, macOS Intel/Apple Silicon, and Windows x64. Other targets need Rust to build from source. |
| Licensing | Compatible | The project declares MIT. OCR uses separately acquired components/models, so their licenses and delivery must be reviewed when/if OCR enters scope. |

## Recommended adapter contract

- Add `pdf-inspector` as the PDF implementation behind the Case File Curator's
  existing format-specific parser boundary, pinned to a tested version.
- Call `process_pdf_bytes` or `extract_pages_markdown_bytes` on uploaded bytes;
  retain per-page Markdown and reported metadata. Do not create an
  upload-derived filesystem reference in the case file.
- Parse the returned Markdown into the Curator's section, paragraph, list, and
  table blocks. Add the original source display name and PDF page to each
  block's source reference.
- Treat `pages_needing_ocr`, broken encoding, extraction errors, and table
  reconstruction uncertainty as visible intake warnings. With OCR still out
  of scope, exclude only warned pages when useful material remains; otherwise
  halt before Evidence Collection.
- Keep the adapter deterministic in tests using small text-PDF fixtures that
  cover list and table output. Test the Curator's observable blocks and source
  references, not `pdf-inspector` internals or its benchmark figures.

## Key blockers and risks

1. **Issue #23 currently defers OCR.** Enabling `process_pdf_with_ocr` would
   change that scope and add PDFium, ONNX Runtime, PP-OCR model management,
   first-use downloads, and platform-specific support. The upstream OCR guide
   says its full end-to-end OCR path is exercised on Linux x64; macOS and
   Windows external-runtime paths are preview. [OCR runtime
   guide](https://github.com/firecrawl/pdf-inspector/blob/main/docs/ocr-runtime.md)
2. **Markdown is an interchange format, not a source-location schema.** The
   public Python API offers page granularity and positioned text items, but it
   does not document stable row/cell identifiers for converted tables. The
   project must generate its own case-local block/list/table-row references
   after parsing each page's Markdown, and label uncertain reconstruction.
3. **Package maturity requires version pinning and regression fixtures.** The
   upstream project is actively changing: its changelog records version 1.19.0
   on 2026-09-09 and recent extraction/layout fixes. That is positive
   maintenance evidence, but changes to conversion output can affect canonical
   blocks. [Changelog](https://github.com/firecrawl/pdf-inspector/blob/main/CHANGELOG.md)
4. **Do not present the upstream speed claim as a guaranteed application
   result.** Its published benchmark is a 200-document local corpus with OCR
   disabled and specific hardware. Validate on the course reference PDF and
   fixture corpus in this repository before adopting performance language.

## Further notes

- `pdf-inspector` is Rust with Python bindings via PyO3, not a remote Firecrawl
  API. The upstream API documents both byte-based processing and page-level
  output. [Python API](https://github.com/firecrawl/pdf-inspector/blob/main/docs/python.md)
- Its default Python wheel intentionally excludes OCR models, PDFium, and ONNX
  Runtime. In offline/controlled deployments, the OCR guide documents supplying
  a pre-populated model directory with `offline=True`; this is relevant only if
  a later issue approves OCR. [OCR runtime
  guide](https://github.com/firecrawl/pdf-inspector/blob/main/docs/ocr-runtime.md)
- Upstream documents MIT licensing in its package metadata and repository.
  [Package metadata](https://github.com/firecrawl/pdf-inspector/blob/main/pyproject.toml)
