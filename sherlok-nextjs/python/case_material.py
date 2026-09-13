"""Deterministic, source-preserving intake for fictional case material."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from io import BytesIO
from pathlib import Path
import re

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from pydantic import BaseModel, Field


FACILITATOR_SECTION_PATTERN = re.compile(
    r"(?:sealed\s+)?facilitator(?:[\s-]+only)?[\s-]+(?:solution|evaluation(?:\s+material)?)",
    re.IGNORECASE,
)
MARKDOWN_INDENT_WIDTH = 2


@dataclass(frozen=True)
class _BlockLocation:
    source_name: str
    number: int
    heading: str | None


@dataclass(frozen=True)
class _MarkdownBlockSettings:
    start_block_number: int = 0
    table_is_uncertain: bool = False


@dataclass(frozen=True)
class _NormalizedTable:
    headers: tuple[str, ...]
    rows: tuple[tuple[str, ...], ...]
    is_uncertain: bool = False


class SourceReference(BaseModel):
    """A UI-safe, case-local location in supplied material."""

    source_name: str
    block_id: str
    heading: str | None = None
    paragraph: int | None = Field(default=None, ge=1)
    list_position: str | None = None
    page: int | None = Field(default=None, ge=1)
    table_row: int | None = Field(default=None, ge=1)
    table_column: int | None = Field(default=None, ge=1)


class CaseMaterialBlockKind(str, Enum):
    """The meaningful structures the Curator retains."""

    SECTION = "section"
    PARAGRAPH = "paragraph"
    ORDERED_LIST_ITEM = "ordered_list_item"
    UNORDERED_LIST_ITEM = "unordered_list_item"
    TABLE = "table"


class CaseMaterialTable(BaseModel):
    """A Markdown table whose headers and rows remain independently visible."""

    title: str | None = None
    headers: tuple[str, ...]
    rows: tuple[tuple[str, ...], ...]
    row_references: tuple[SourceReference, ...]
    cell_references: tuple[tuple[SourceReference, ...], ...] = ()
    header_references: tuple[SourceReference, ...] = ()
    is_uncertain: bool = False


class CaseMaterialBlock(BaseModel):
    """One canonical piece of material with its source location."""

    id: str
    kind: CaseMaterialBlockKind
    source_reference: SourceReference
    text: str = ""
    ordinal: int | None = Field(default=None, ge=1)
    nesting: int = Field(default=0, ge=0)
    table: CaseMaterialTable | None = None


class CaseMaterialInput(BaseModel):
    """One supplied text source; uploads are read before curation."""

    display_name: str
    content: str | bytes
    media_type: str | None = None


class CuratedCaseMaterial(BaseModel):
    """The active investigation's canonical material and intake notices."""

    source_text: dict[str, str] = Field(default_factory=dict)
    blocks: list[CaseMaterialBlock] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    @property
    def canonical_text(self) -> str:
        return _render_blocks(self.blocks, include_source_ids=False)

    @property
    def prompt_text(self) -> str:
        """Render readable canonical material annotated for evidence traceability."""
        return _render_blocks(self.blocks, include_source_ids=True)

    @property
    def is_usable(self) -> bool:
        return bool(self.blocks)


class CaseMaterialCuratorError(ValueError):
    """Raised when intake cannot yield usable canonical material."""


class CaseFileCurator:
    """Normalize untrusted pasted text and Markdown without detective reasoning."""

    def curate(self, materials: list[CaseMaterialInput]) -> CuratedCaseMaterial:
        result = CuratedCaseMaterial()
        for source_index, material in enumerate(materials, start=1):
            source_name = _safe_source_name(
                material.display_name, source_index, set(result.source_text)
            )
            try:
                blocks = _blocks_for_input(material, source_name, result.warnings)
                blocks = _exclude_sealed_solution(blocks, source_name, result.warnings)
                if not blocks:
                    raise ValueError("No usable case text could be extracted.")
            except ValueError as error:
                result.warnings.append(f"{source_name}: {error}")
                continue
            result.source_text[source_name] = _render_blocks(blocks, include_source_ids=False)
            result.blocks.extend(blocks)
        if not result.is_usable:
            notices = " ".join(result.warnings)
            raise CaseMaterialCuratorError(f"No usable case material was supplied. {notices}".strip())
        return result


def input_from_upload(upload: str | object) -> CaseMaterialInput:
    """Read a Gradio upload while retaining only a safe display name."""
    path = Path(str(getattr(upload, "name", upload)))
    return CaseMaterialInput(display_name=path.name, content=path.read_bytes())


def _safe_source_name(display_name: str, source_index: int, used_names: set[str]) -> str:
    name = Path(display_name).name.strip() or f"source-{source_index}.txt"
    if name not in used_names:
        return name
    path = Path(name)
    return f"{path.stem} ({source_index}){path.suffix}"


def _decode_text(content: str | bytes) -> str:
    try:
        text = content if isinstance(content, str) else content.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ValueError("The uploaded text is not valid UTF-8.") from error
    if not text.strip():
        raise ValueError("The supplied text is empty.")
    return text


def _is_markdown(material: CaseMaterialInput, source_name: str) -> bool:
    return (
        Path(source_name).suffix.lower() in {".md", ".markdown"}
        or material.media_type == "text/markdown"
    )


def _is_supported_text_source(material: CaseMaterialInput, source_name: str) -> bool:
    suffix = Path(source_name).suffix.lower()
    return suffix in {"", ".txt", ".md", ".markdown"} or material.media_type in {
        "text/markdown",
        "text/plain",
    }


def _is_docx(source_name: str) -> bool:
    return Path(source_name).suffix.lower() == ".docx"


def _is_pdf(material: CaseMaterialInput, source_name: str) -> bool:
    return Path(source_name).suffix.lower() == ".pdf" or material.media_type == "application/pdf"


def _blocks_for_input(
    material: CaseMaterialInput, source_name: str, warnings: list[str]
) -> list[CaseMaterialBlock]:
    if _is_docx(source_name):
        return _docx_blocks(material.content, source_name)
    if _is_pdf(material, source_name):
        return _pdf_blocks(material.content, source_name, warnings)
    if not _is_supported_text_source(material, source_name):
        raise ValueError("Unsupported file type. Use PDF, DOCX, Markdown, or plain text.")
    return _blocks_for_material(material, source_name, _decode_text(material.content))


def _pdf_blocks(
    content: str | bytes, source_name: str, warnings: list[str]
) -> list[CaseMaterialBlock]:
    """Extract only reliable native PDF text; OCR is deliberately never called."""
    if isinstance(content, str):
        raise ValueError("The PDF document could not be read.")
    try:
        from pdf_inspector import classify_pdf_bytes, extract_pages_markdown_bytes

        classification = classify_pdf_bytes(content)
        extracted = extract_pages_markdown_bytes(content)
    except Exception as error:
        raise ValueError(
            "The PDF document could not be read; it may be malformed or encrypted."
        ) from error

    table_pages = set(extracted.pages_with_tables)
    ocr_pages = set(extracted.pages_needing_ocr) | {
        page_number + 1 for page_number in classification.pages_needing_ocr
    }
    blocks: list[CaseMaterialBlock] = []
    if classification.pdf_type in {"scanned", "image_based", "mixed"}:
        warnings.append(
            f"{source_name}: {classification.pdf_type.replace('_', '-')} PDF pages may "
            "require OCR; OCR is not enabled."
        )
    for extracted_page in extracted.pages:
        page_number = extracted_page.page + 1
        if extracted_page.needs_ocr or page_number in ocr_pages:
            warnings.append(
                f"{source_name}: page {page_number} requires OCR and was excluded; OCR is not enabled."
            )
            continue
        page_markdown = extracted_page.markdown.strip()
        if not page_markdown:
            warnings.append(f"{source_name}: page {page_number} contained no extractable text.")
            continue
        page_has_table = page_number in table_pages
        if page_has_table:
            warnings.append(
                f"{source_name}: page {page_number} contains a table whose reconstruction may be uncertain."
            )
        page_blocks = _markdown_blocks(
            page_markdown,
            source_name,
            _MarkdownBlockSettings(
                start_block_number=len(blocks), table_is_uncertain=page_has_table
            ),
        )
        blocks.extend(_with_pdf_page(block, page_number) for block in page_blocks)
    return blocks


def _with_pdf_page(block: CaseMaterialBlock, page_number: int) -> CaseMaterialBlock:
    reference = block.source_reference.model_copy(update={"page": page_number})
    if block.table is None:
        return block.model_copy(update={"source_reference": reference})
    table = block.table.model_copy(
        update={
            "row_references": tuple(
                row_reference.model_copy(update={"page": page_number})
                for row_reference in block.table.row_references
            ),
            "cell_references": tuple(
                tuple(cell_reference.model_copy(update={"page": page_number}) for cell_reference in row)
                for row in block.table.cell_references
            ),
        }
    )
    return block.model_copy(update={"source_reference": reference, "table": table})


def _reference(source_name: str, block_number: int, **location: object) -> SourceReference:
    return SourceReference(
        source_name=source_name,
        block_id=f"S-{block_number:03d}",
        **location,
    )


def _blocks_for_material(
    material: CaseMaterialInput, source_name: str, text: str
) -> list[CaseMaterialBlock]:
    if _is_markdown(material, source_name):
        return _markdown_blocks(text, source_name)
    return _plain_text_blocks(text, source_name)


def _docx_blocks(content: str | bytes, source_name: str) -> list[CaseMaterialBlock]:
    if isinstance(content, str):
        raise ValueError("The DOCX document could not be read.")
    if content.startswith(b"\xd0\xcf\x11\xe0"):
        raise ValueError("The DOCX document is encrypted or could not be read.")
    try:
        document = Document(BytesIO(content))
    except Exception as error:
        raise ValueError("The DOCX document could not be read.") from error

    blocks: list[CaseMaterialBlock] = []
    current_heading: str | None = None
    ordered_positions: dict[str, int] = {}
    try:
        contents = document.iter_inner_content()
        for content_item in contents:
            block_number = len(blocks) + 1
            if isinstance(content_item, Paragraph):
                text = content_item.text.strip()
                if not text:
                    continue
                kind, ordinal, nesting = _docx_paragraph_structure(
                    content_item, ordered_positions
                )
                if kind is CaseMaterialBlockKind.SECTION:
                    current_heading = text
                    blocks.append(
                        _text_block(source_name, block_number, kind, text, heading=text)
                    )
                elif kind in {
                    CaseMaterialBlockKind.ORDERED_LIST_ITEM,
                    CaseMaterialBlockKind.UNORDERED_LIST_ITEM,
                }:
                    blocks.append(
                        _text_block(
                            source_name,
                            block_number,
                            kind,
                            text,
                            heading=current_heading,
                            ordinal=ordinal,
                            nesting=nesting,
                            list_position=str(ordinal) if ordinal is not None else "item",
                        )
                    )
                else:
                    blocks.append(
                        _text_block(
                            source_name,
                            block_number,
                            CaseMaterialBlockKind.PARAGRAPH,
                            text,
                            heading=current_heading,
                            paragraph=block_number,
                        )
                    )
            elif isinstance(content_item, Table):
                location = _BlockLocation(source_name, block_number, current_heading)
                blocks.append(_docx_table_block(location, content_item))
    except ValueError:
        raise
    except Exception as error:
        raise ValueError("The DOCX document could not be extracted.") from error
    return blocks


def _docx_paragraph_structure(
    paragraph: Paragraph, ordered_positions: dict[str, int]
) -> tuple[CaseMaterialBlockKind, int | None, int]:
    style_name = paragraph.style.name.lower()
    if style_name.startswith("heading"):
        return CaseMaterialBlockKind.SECTION, None, 0
    if style_name.startswith("list number"):
        list_key = paragraph.style.name
        ordinal = ordered_positions.get(list_key, 0) + 1
        ordered_positions[list_key] = ordinal
        return CaseMaterialBlockKind.ORDERED_LIST_ITEM, ordinal, _docx_list_nesting(paragraph)
    if style_name.startswith("list bullet"):
        return CaseMaterialBlockKind.UNORDERED_LIST_ITEM, None, _docx_list_nesting(paragraph)
    return CaseMaterialBlockKind.PARAGRAPH, None, 0


def _docx_list_nesting(paragraph: Paragraph) -> int:
    properties = paragraph._p.pPr
    numbering = properties.numPr if properties is not None else None
    level = numbering.ilvl.val if numbering is not None and numbering.ilvl is not None else 0
    return int(level)


def _docx_table_block(location: _BlockLocation, table: Table) -> CaseMaterialBlock:
    values = tuple(
        tuple(cell.text.strip() for cell in row.cells)
        for row in table.rows
    )
    if not values or not any(cell for row in values for cell in row):
        raise ValueError("The DOCX document contains an empty table.")
    return _table_from_normalized(location, _NormalizedTable(values[0], values[1:]))


def _table_from_normalized(
    location: _BlockLocation, normalized: _NormalizedTable
) -> CaseMaterialBlock:
    reference = _reference(
        location.source_name, location.number, heading=location.heading
    )
    header_references = tuple(
        _reference(
            location.source_name,
            location.number,
            heading=location.heading,
            table_column=column_number,
        )
        for column_number in range(1, len(normalized.headers) + 1)
    )
    row_references = tuple(
        _reference(
            location.source_name,
            location.number,
            heading=location.heading,
            table_row=row_number,
        )
        for row_number in range(1, len(normalized.rows) + 1)
    )
    cell_references = tuple(
        tuple(
            _reference(
                location.source_name,
                location.number,
                heading=location.heading,
                table_row=row_number,
                table_column=column_number,
            )
            for column_number in range(1, len(row) + 1)
        )
        for row_number, row in enumerate(normalized.rows, start=1)
    )
    return CaseMaterialBlock(
        id=f"{location.source_name}:S-{location.number:03d}",
        kind=CaseMaterialBlockKind.TABLE,
        source_reference=reference,
        table=CaseMaterialTable(
            title=location.heading,
            headers=normalized.headers,
            rows=normalized.rows,
            row_references=row_references,
            cell_references=cell_references,
            header_references=header_references,
            is_uncertain=normalized.is_uncertain,
        ),
    )


def _plain_text_blocks(text: str, source_name: str) -> list[CaseMaterialBlock]:
    paragraphs = (part.strip() for part in re.split(r"\n\s*\n", text))
    return [
        CaseMaterialBlock(
            id=f"{source_name}:S-{number:03d}",
            kind=CaseMaterialBlockKind.PARAGRAPH,
            text=paragraph,
            source_reference=_reference(source_name, number, paragraph=number),
        )
        for number, paragraph in enumerate(paragraphs, start=1)
        if paragraph
    ]


def _markdown_blocks(
    text: str,
    source_name: str,
    settings: _MarkdownBlockSettings | None = None,
) -> list[CaseMaterialBlock]:
    settings = settings or _MarkdownBlockSettings()
    blocks: list[CaseMaterialBlock] = []
    lines = text.splitlines()
    current_heading: str | None = None
    index = 0
    while index < len(lines):
        stripped = lines[index].strip()
        if not stripped:
            index += 1
            continue
        block_number = settings.start_block_number + len(blocks) + 1
        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        ordered = re.match(r"^(\s*)(\d+)\.\s+(.+)$", lines[index])
        unordered = re.match(r"^(\s*)[-*+]\s+(.+)$", lines[index])
        if heading:
            current_heading = heading.group(2).strip()
            blocks.append(
                _text_block(
                    source_name,
                    block_number,
                    CaseMaterialBlockKind.SECTION,
                    current_heading,
                    heading=current_heading,
                )
            )
        elif _is_table_start(lines, index):
            table_lines, index = _consume_table(lines, index)
            blocks.append(
                _table_block(
                    _BlockLocation(source_name, block_number, current_heading),
                    table_lines,
                    settings.table_is_uncertain,
                )
            )
            continue
        elif ordered:
            blocks.append(
                _text_block(
                    source_name,
                    block_number,
                    CaseMaterialBlockKind.ORDERED_LIST_ITEM,
                    ordered.group(3).strip(),
                    heading=current_heading,
                    ordinal=int(ordered.group(2)),
                    nesting=_markdown_nesting(ordered.group(1)),
                    list_position=ordered.group(2),
                )
            )
        elif unordered:
            blocks.append(
                _text_block(
                    source_name,
                    block_number,
                    CaseMaterialBlockKind.UNORDERED_LIST_ITEM,
                    unordered.group(2).strip(),
                    heading=current_heading,
                    nesting=_markdown_nesting(unordered.group(1)),
                    list_position="item",
                )
            )
        else:
            blocks.append(
                _text_block(
                    source_name,
                    block_number,
                    CaseMaterialBlockKind.PARAGRAPH,
                    stripped,
                    heading=current_heading,
                    paragraph=block_number,
                )
            )
        index += 1
    return blocks


def _markdown_nesting(indent: str) -> int:
    return len(indent) // MARKDOWN_INDENT_WIDTH


def _text_block(
    source_name: str,
    number: int,
    kind: CaseMaterialBlockKind,
    text: str,
    **location: object,
) -> CaseMaterialBlock:
    return CaseMaterialBlock(
        id=f"{source_name}:S-{number:03d}",
        kind=kind,
        text=text,
        source_reference=_reference(source_name, number, **location),
        ordinal=location.get("ordinal"),
        nesting=location.get("nesting", 0),
    )


def _is_table_start(lines: list[str], index: int) -> bool:
    has_separator = index + 1 < len(lines) and re.match(
        r"^\s*\|?\s*:?-{3,}", lines[index + 1]
    )
    return "|" in lines[index] and bool(has_separator)


def _consume_table(lines: list[str], index: int) -> tuple[list[str], int]:
    table_lines = [lines[index].strip()]
    index += 2
    while index < len(lines) and "|" in lines[index]:
        table_lines.append(lines[index].strip())
        index += 1
    return table_lines, index


def _table_block(
    location: _BlockLocation,
    table_lines: list[str],
    is_uncertain: bool = False,
) -> CaseMaterialBlock:
    return _table_from_normalized(
        location,
        _NormalizedTable(
            headers=tuple(_table_cells(table_lines[0])),
            rows=tuple(tuple(_table_cells(line)) for line in table_lines[1:]),
            is_uncertain=is_uncertain,
        ),
    )


def _table_cells(row: str) -> list[str]:
    return [cell.strip() for cell in row.strip().strip("|").split("|")]


def _exclude_sealed_solution(
    blocks: list[CaseMaterialBlock], source_name: str, warnings: list[str]
) -> list[CaseMaterialBlock]:
    for index, block in enumerate(blocks):
        if _is_facilitator_section_boundary(block):
            warnings.append(
                f"{source_name}: excluded sealed facilitator solution from agent input."
            )
            return blocks[:index]
    return blocks


def _is_facilitator_section_boundary(block: CaseMaterialBlock) -> bool:
    """Recognize an actual facilitator-only section without stripping participant prose."""
    if block.kind is CaseMaterialBlockKind.SECTION:
        return FACILITATOR_SECTION_PATTERN.fullmatch(block.text.strip()) is not None
    if block.kind is not CaseMaterialBlockKind.PARAGRAPH:
        return False
    return any(
        FACILITATOR_SECTION_PATTERN.fullmatch(line.strip()) is not None
        for line in block.text.splitlines()
    )


def _render_block(block: CaseMaterialBlock, include_source_ids: bool) -> str:
    prefix = _reference_prefix(block.id, block.source_reference, include_source_ids)
    if block.kind is CaseMaterialBlockKind.SECTION:
        return f"{prefix}# {block.text}"
    if block.kind is CaseMaterialBlockKind.ORDERED_LIST_ITEM:
        return f"{prefix}{block.ordinal}. {block.text}"
    if block.kind is CaseMaterialBlockKind.UNORDERED_LIST_ITEM:
        return f"{prefix}- {block.text}"
    if block.kind is CaseMaterialBlockKind.TABLE and block.table is not None:
        rendered_headers = " | ".join(block.table.headers)
        if include_source_ids:
            rendered_headers = " | ".join(
                _reference_prefix(
                    f"{block.id}:H-C-{reference.table_column:03d}",
                    reference,
                    include_source_ids,
                )
                + header
                for header, reference in zip(
                    block.table.headers, block.table.header_references, strict=True
                )
            )
        rows = [
            f"{prefix}{rendered_headers}",
            " | ".join("---" for _ in block.table.headers),
        ]
        for row, reference in zip(block.table.rows, block.table.row_references, strict=True):
            row_prefix = ""
            if include_source_ids:
                row_prefix = _reference_prefix(
                    f"{block.id}:R-{reference.table_row:03d}",
                    reference,
                    include_source_ids,
                )
            cell_references = block.table.cell_references[reference.table_row - 1]
            rendered_cells = (
                _reference_prefix(
                    f"{block.id}:R-{cell.table_row:03d}:C-{cell.table_column:03d}",
                    cell,
                    include_source_ids,
                )
                + value
                for value, cell in zip(row, cell_references, strict=True)
            )
            rows.append(row_prefix + " | ".join(rendered_cells))
        return "\n".join(rows)
    return prefix + block.text


def _reference_prefix(
    reference_id: str, reference: SourceReference, include_source_ids: bool
) -> str:
    if not include_source_ids:
        return ""
    page_location = f" (page {reference.page})" if reference.page is not None else ""
    return f"[{reference_id}]{page_location} "


def _render_blocks(blocks: list[CaseMaterialBlock], include_source_ids: bool) -> str:
    return "\n\n".join(_render_block(block, include_source_ids) for block in blocks)
