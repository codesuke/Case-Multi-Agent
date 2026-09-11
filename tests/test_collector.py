from __future__ import annotations

from dataclasses import dataclass
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
