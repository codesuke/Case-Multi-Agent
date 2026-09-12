from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import pytest

from agents.collector import EvidenceCollector
from case_file import CaseFile
from case_material import CaseFileCurator, CaseMaterialInput


@dataclass
class InvalidEvidenceLLM:
    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        return {
            "evidence": [
                {
                    "id": "E-01",
                    "statement": "The butler left at 9 PM.",
                    "classification": "unsupported_label",
                }
            ]
        }


@dataclass
class FixedResponseLLM:
    response: dict[str, Any]

    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        return self.response


@dataclass
class SequentialResponseLLM:
    responses: list[dict[str, Any]]
    prompts: list[str] = field(default_factory=list)

    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        self.prompts.append(prompt)
        return self.responses.pop(0)


def test_collector_only_updates_the_evidence_section_of_a_case_file() -> None:
    collector = EvidenceCollector(InvalidEvidenceLLM())
    case_file = CaseFile(mystery_text="The butler left at 9 PM.")

    with pytest.raises(ValueError, match="classification"):
        collector.run(case_file)

    assert case_file.evidence == []
    assert case_file.suspect_profiles == []
    assert case_file.timeline.events == []
    assert case_file.timeline.issues == []


def test_collector_resolves_an_unambiguous_displayed_source_reference_suffix() -> None:
    curated = CaseFileCurator().curate(
        [CaseMaterialInput(display_name="case.txt", content="The bell rang.", media_type="text/plain")]
    )
    case_file = CaseFile(
        mystery_text=curated.canonical_text,
        canonical_material=curated.prompt_text,
        material_blocks=curated.blocks,
    )
    collector = EvidenceCollector(
        FixedResponseLLM(
            {
                "evidence": [
                    {
                        "id": "E-01",
                        "statement": "The bell rang.",
                        "classification": "observed_fact",
                        "source_reference_ids": ["S-001"],
                    }
                ]
            }
        )
    )

    collector.run(case_file)

    assert case_file.evidence[0].source_references[0].source_name == "case.txt"


def test_collector_resolves_a_case_evidence_id_to_its_unique_table_row() -> None:
    curated = CaseFileCurator().curate(
        [
            CaseMaterialInput(
                display_name="signal.md",
                media_type="text/markdown",
                content=(
                    "# Evidence Register\n\n"
                    "| ID | Observation |\n"
                    "| --- | --- |\n"
                    "| S-01 | Imani's keycard opened the control-room door at 6:03 PM. |\n\n"
                    "# Evidence Classification\n\n"
                    "| ID | Fact or inference |\n"
                    "| --- | --- |\n"
                    "| S-01 | |"
                ),
            )
        ]
    )
    case_file = CaseFile(
        mystery_text=curated.canonical_text,
        canonical_material=curated.prompt_text,
        material_blocks=curated.blocks,
    )
    response = {
        "evidence": [
            {
                "id": "S-01",
                "statement": "Imani's keycard opened the control-room door at 6:03 PM.",
                "classification": "observed_fact",
                "source_reference_ids": ["S-01"],
            }
        ]
    }
    llm = SequentialResponseLLM(responses=[response, response])

    EvidenceCollector(llm).run(case_file)

    evidence = case_file.evidence[0]
    assert evidence.id == "S-01"
    assert evidence.source_references[0].source_name == "signal.md"
    assert evidence.source_references[0].heading == "Evidence Register"
    assert evidence.source_references[0].table_row == 1


def test_collector_rejects_an_ambiguous_source_reference_suffix() -> None:
    curated = CaseFileCurator().curate(
        [
            CaseMaterialInput(display_name="one.txt", content="One bell rang.", media_type="text/plain"),
            CaseMaterialInput(display_name="two.txt", content="Two bells rang.", media_type="text/plain"),
        ]
    )
    case_file = CaseFile(
        mystery_text=curated.canonical_text,
        canonical_material=curated.prompt_text,
        material_blocks=curated.blocks,
    )
    collector = EvidenceCollector(
        FixedResponseLLM(
            {
                "evidence": [
                    {
                        "id": "E-01",
                        "statement": "A bell rang.",
                        "classification": "observed_fact",
                        "source_reference_ids": ["S-001"],
                    }
                ]
            }
        )
    )

    with pytest.raises(ValueError, match="ambiguous"):
        collector.run(case_file)


def test_collector_corrects_a_placeholder_source_reference_once() -> None:
    curated = CaseFileCurator().curate(
        [CaseMaterialInput(display_name="case.txt", content="The bell rang.")]
    )
    case_file = CaseFile(
        mystery_text=curated.canonical_text,
        canonical_material=curated.prompt_text,
        material_blocks=curated.blocks,
    )
    llm = SequentialResponseLLM(
        responses=[
            {
                "evidence": [
                    {
                        "id": "E-01",
                        "statement": "The bell rang.",
                        "classification": "observed_fact",
                        "source_reference_ids": ["None"],
                    }
                ]
            },
            {
                "evidence": [
                    {
                        "id": "E-01",
                        "statement": "The bell rang.",
                        "classification": "observed_fact",
                        "source_reference_ids": ["case.txt:S-001"],
                    }
                ]
            },
        ]
    )

    EvidenceCollector(llm).run(case_file)

    assert case_file.evidence[0].source_references[0].block_id == "S-001"
    assert len(llm.prompts) == 2
    assert "Do not use placeholders" in llm.prompts[1]
