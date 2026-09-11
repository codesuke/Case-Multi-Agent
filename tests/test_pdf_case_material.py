"""Public Curator behavior for locally extracted PDF case material."""

from __future__ import annotations

import sys
from types import SimpleNamespace

import pytest

from agents.collector import EvidenceCollector
from case_file import CaseFile
from case_material import CaseFileCurator, CaseMaterialCuratorError, CaseMaterialInput
from orchestrator import InvestigationEventKind, stream_investigation


def _pdf_extractor(
    pages: list[SimpleNamespace],
    table_pages: list[int] | None = None,
    pdf_type: str = "text_based",
) -> SimpleNamespace:
    return SimpleNamespace(
        classify_pdf_bytes=lambda content: SimpleNamespace(
            pdf_type=pdf_type, pages_needing_ocr=[]
        ),
        extract_pages_markdown_bytes=lambda content: SimpleNamespace(
            pages=pages,
            pages_with_tables=table_pages or [],
            pages_needing_ocr=[],
        )
    )


def _participant_then_facilitator_pdf_page() -> SimpleNamespace:
    return SimpleNamespace(
        page=0,
        markdown=(
            "# Participant materials\n\n"
            "This edition mentions a sealed facilitator solution.\n\n"
            "The lantern disappeared.\n\n"
            "# Facilitator Only Solution\n\n"
            "Sealed evaluation conclusion."
        ),
        needs_ocr=False,
    )


def test_curator_preserves_pdf_page_locations_and_labels_table_uncertainty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "pdf_inspector",
        _pdf_extractor(
            [
                SimpleNamespace(
                    page=0,
                    markdown="# Incident\n\nThe lantern disappeared.",
                    needs_ocr=False,
                ),
                SimpleNamespace(
                    page=1,
                    markdown="| Time | Event |\n| --- | --- |\n| 21:00 | Alarm |",
                    needs_ocr=False,
                ),
            ],
            [2],
        ),
    )

    result = CaseFileCurator().curate(
        [CaseMaterialInput(display_name="/uploads/incident.pdf", content=b"%PDF")]
    )

    table = result.blocks[-1]
    assert [block.source_reference.page for block in result.blocks] == [1, 1, 2]
    assert table.table is not None
    assert table.table.is_uncertain is True
    assert table.table.row_references[0].page == 2
    assert table.source_reference.source_name == "incident.pdf"
    assert "[incident.pdf:S-001] (page 1)" in result.prompt_text
    assert "/uploads" not in result.prompt_text
    assert any("page 2" in warning and "table" in warning for warning in result.warnings)


def test_curator_excludes_ocr_required_pdf_pages_but_keeps_other_usable_sources(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "pdf_inspector",
        _pdf_extractor([SimpleNamespace(page=0, markdown="", needs_ocr=True)]),
    )

    result = CaseFileCurator().curate(
        [
            CaseMaterialInput(display_name="scan.pdf", content=b"%PDF"),
            CaseMaterialInput(display_name="notes.txt", content="The alarm sounded."),
        ]
    )

    assert list(result.source_text) == ["notes.txt"]
    assert result.canonical_text == "The alarm sounded."
    assert any("scan.pdf: page 1 requires OCR" in warning for warning in result.warnings)


def test_curator_warns_when_a_mixed_pdf_has_text_and_ocr_required_pages(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "pdf_inspector",
        _pdf_extractor(
            [
                SimpleNamespace(page=0, markdown="The alarm sounded.", needs_ocr=False),
                SimpleNamespace(page=1, markdown="", needs_ocr=True),
            ],
            pdf_type="mixed",
        ),
    )

    result = CaseFileCurator().curate(
        [CaseMaterialInput(display_name="mixed.pdf", content=b"%PDF")]
    )

    assert result.canonical_text == "The alarm sounded."
    assert any("mixed PDF pages may require OCR" in warning for warning in result.warnings)
    assert any("page 2 requires OCR" in warning for warning in result.warnings)


def test_pdf_keeps_its_position_and_excludes_sealed_facilitator_material(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "pdf_inspector",
        _pdf_extractor(
            [
                SimpleNamespace(
                    page=0,
                    markdown=(
                        "Participant briefing: the lantern disappeared.\n\n"
                        "Facilitator Only Solution\nThe answer is withheld."
                    ),
                    needs_ocr=False,
                )
            ]
        ),
    )

    result = CaseFileCurator().curate(
        [
            CaseMaterialInput(display_name="case.pdf", content=b"%PDF"),
            CaseMaterialInput(display_name="notes.txt", content="Witness note."),
        ]
    )

    assert list(result.source_text) == ["case.pdf", "notes.txt"]
    assert "Participant briefing" in result.canonical_text
    assert "answer is withheld" not in result.canonical_text
    assert any("sealed facilitator" in warning for warning in result.warnings)


def test_pdf_keeps_participant_prose_that_mentions_a_sealed_solution_before_a_heading(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "pdf_inspector",
        _pdf_extractor(
            [_participant_then_facilitator_pdf_page()]
        ),
    )

    result = CaseFileCurator().curate(
        [CaseMaterialInput(display_name="case.pdf", content=b"%PDF")]
    )

    assert "mentions a sealed facilitator solution" in result.canonical_text
    assert "The lantern disappeared" in result.canonical_text
    assert "Facilitator Only Solution" not in result.canonical_text
    assert "Sealed evaluation conclusion" not in result.canonical_text
    assert all("Facilitator Only Solution" not in block.text for block in result.blocks)
    assert len([warning for warning in result.warnings if "sealed facilitator" in warning]) == 1


class _ParticipantOnlyPdfLLM:
    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        assert "Evidence Collector" in system
        assert "mentions a sealed facilitator solution" in prompt
        assert "The lantern disappeared" in prompt
        assert "Facilitator Only Solution" not in prompt
        assert "Sealed evaluation conclusion" not in prompt
        return {"evidence": []}


def test_pdf_participant_material_reaches_evidence_collection_without_sealed_content(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "pdf_inspector",
        _pdf_extractor(
            [_participant_then_facilitator_pdf_page()]
        ),
    )

    events = stream_investigation(
        "",
        _ParticipantOnlyPdfLLM(),
        [CaseMaterialInput(display_name="case.pdf", content=b"%PDF")],
    )
    evidence_collection_completed = next(
        event
        for event in events
        if event.kind is InvestigationEventKind.EVIDENCE_COLLECTION_COMPLETED
    )

    case_file = evidence_collection_completed.case_file
    assert case_file is not None
    assert "mentions a sealed facilitator solution" in case_file.canonical_material
    assert "Sealed evaluation conclusion" not in case_file.canonical_material
    assert all(block.source_reference.page == 1 for block in case_file.material_blocks)
    assert any("sealed facilitator" in warning for warning in case_file.material_warnings)
    assert all("Facilitator Only Solution" not in warning for warning in case_file.material_warnings)
    assert all("Sealed evaluation conclusion" not in warning for warning in case_file.material_warnings)


def test_curator_surfaces_a_safe_malformed_pdf_warning(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "pdf_inspector",
        SimpleNamespace(
            classify_pdf_bytes=lambda content: (_ for _ in ()).throw(RuntimeError("/uploads/key.pdf"))
        ),
    )

    with pytest.raises(CaseMaterialCuratorError, match="No usable case material") as error:
        CaseFileCurator().curate(
            [CaseMaterialInput(display_name="broken.pdf", content=b"not-a-pdf")]
        )

    assert "malformed or encrypted" in str(error.value)
    assert "/uploads" not in str(error.value)


def test_curator_halts_before_evidence_collection_when_only_pdf_pages_need_ocr(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "pdf_inspector",
        _pdf_extractor([SimpleNamespace(page=0, markdown="", needs_ocr=True)]),
    )

    with pytest.raises(CaseMaterialCuratorError, match="No usable case material") as error:
        CaseFileCurator().curate([CaseMaterialInput(display_name="scan.pdf", content=b"%PDF")])

    assert "scan.pdf: page 1 requires OCR" in str(error.value)
    assert "%PDF" not in str(error.value)


class _PdfCitingLLM:
    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        assert "[incident.pdf:S-001]" in prompt
        return {
            "evidence": [
                {
                    "id": "E-01",
                    "statement": "The lantern disappeared.",
                    "classification": "observed_fact",
                    "source_reference_ids": ["incident.pdf:S-001"],
                }
            ]
        }


def test_pdf_source_reference_remains_traceable_through_evidence_collection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "pdf_inspector",
        _pdf_extractor(
            [
                SimpleNamespace(
                    page=1,
                    markdown="The lantern disappeared.",
                    needs_ocr=False,
                )
            ]
        ),
    )
    curated = CaseFileCurator().curate(
        [CaseMaterialInput(display_name="incident.pdf", content=b"%PDF")]
    )
    case_file = CaseFile(
        mystery_text=curated.canonical_text,
        canonical_material=curated.prompt_text,
        material_blocks=curated.blocks,
    )

    EvidenceCollector(_PdfCitingLLM()).run(case_file)

    assert case_file.evidence[0].source_references[0].source_name == "incident.pdf"
    assert case_file.evidence[0].source_references[0].page == 2


def test_only_unusable_pdf_halts_the_public_pipeline_before_evidence_collection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "pdf_inspector",
        _pdf_extractor([SimpleNamespace(page=0, markdown="", needs_ocr=True)]),
    )

    events = list(
        stream_investigation(
            "", _PdfCitingLLM(), [CaseMaterialInput(display_name="scan.pdf", content=b"%PDF")]
        )
    )

    assert [event.kind for event in events] == [
        InvestigationEventKind.CASE_MATERIAL_CURATION_STARTED,
        InvestigationEventKind.VALIDATION_ERROR,
    ]
    assert "requires OCR" in (events[-1].message or "")
