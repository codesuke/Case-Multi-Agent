from __future__ import annotations

from dataclasses import dataclass, field

import pytest

from agents.skeptic import Skeptic
from case_file import (
    CaseFile,
    Claim,
    ClaimStatus,
    EvidenceClassification,
    EvidenceItem,
    Specialist,
    SkepticFindingKind,
    SkepticReviewOutcome,
    SuspectProfile,
    Timeline,
    TimelineEvent,
    TimelineIssue,
    TimelineIssueKind,
)


@dataclass
class StubLLM:
    response: dict
    prompts: list[str] = field(default_factory=list)

    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        self.prompts.append(prompt)
        return self.response


@dataclass
class SequentialResponseLLM:
    responses: list[dict]
    prompts: list[str] = field(default_factory=list)

    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        self.prompts.append(prompt)
        return self.responses.pop(0)


def _case_file_with_specialist_output() -> CaseFile:
    case_file = CaseFile(mystery_text="A necklace vanished from the study overnight.")
    case_file.evidence = [
        EvidenceItem(
            id="E-01",
            statement="The housekeeper's key card unlocked the study at midnight.",
            classification=EvidenceClassification.OBSERVED_FACT,
        ),
    ]
    case_file.suspect_profiles = [
        SuspectProfile(
            suspect="The Housekeeper",
            motive=(
                Claim(statement="Owed the victim money.", status=ClaimStatus.UNKNOWN),
            ),
            opportunity=(
                Claim(
                    statement="The key card used at midnight proves she was in the study.",
                    status=ClaimStatus.SUPPORTED,
                    evidence_ids=("E-01",),
                ),
            ),
        )
    ]
    case_file.timeline = Timeline(
        events=[
            TimelineEvent(
                statement="The study was unlocked.",
                time="midnight",
                order=1,
                status=ClaimStatus.SUPPORTED,
                evidence_ids=("E-01",),
            )
        ],
        issues=[
            TimelineIssue(
                kind=TimelineIssueKind.GAP,
                statement="Nobody accounts for the next hour.",
                evidence_ids=("E-01",),
            )
        ],
    )
    return case_file


def test_skeptic_includes_human_guidance_in_the_prompt_when_present() -> None:
    llm = StubLLM(response={"findings": []})
    case_file = _case_file_with_specialist_output()
    case_file.human_notes = ["Evidence E-01 is unavailable; do not rely on it."]

    Skeptic(llm).run(case_file)

    assert "Evidence E-01 is unavailable; do not rely on it." in llm.prompts[0]


def test_skeptic_prompt_omits_guidance_section_without_human_notes() -> None:
    llm = StubLLM(response={"findings": []})
    case_file = _case_file_with_specialist_output()

    Skeptic(llm).run(case_file)

    assert "human reviewer" not in llm.prompts[0].lower()


def test_skeptic_approves_when_no_findings() -> None:
    llm = StubLLM(response={"findings": []})
    case_file = _case_file_with_specialist_output()

    Skeptic(llm).run(case_file)

    assert len(case_file.skeptic_reviews) == 1
    review = case_file.skeptic_reviews[0]
    assert review.outcome is SkepticReviewOutcome.APPROVED
    assert review.findings == ()


def test_skeptic_records_findings_naming_specialist_and_claim() -> None:
    llm = StubLLM(
        response={
            "findings": [
                {
                    "specialist": "suspect_analyst",
                    "claim": "The key card used at midnight proves she was in the study.",
                    "kind": "unsupported_reasoning",
                    "explanation": "Card use establishes use of the card, not who held it.",
                }
            ]
        }
    )
    case_file = _case_file_with_specialist_output()

    Skeptic(llm).run(case_file)

    review = case_file.skeptic_reviews[0]
    assert review.outcome is SkepticReviewOutcome.REVISION_REQUESTED
    assert len(review.findings) == 1
    finding = review.findings[0]
    assert finding.specialist is Specialist.SUSPECT_ANALYST
    assert finding.claim == "The key card used at midnight proves she was in the study."
    assert finding.kind is SkepticFindingKind.UNSUPPORTED_REASONING


def test_skeptic_accepts_an_exact_claim_embedded_in_a_rendered_line() -> None:
    rendered_claim = "- Opportunity: The key card used at midnight proves she was in the study. (E-01)"
    llm = SequentialResponseLLM(
        responses=[
            {
                "findings": [
                    {
                        "specialist": "suspect_analyst",
                        "claim": rendered_claim,
                        "kind": "unsupported_reasoning",
                        "explanation": "Card use does not identify the card holder.",
                    }
                ]
            }
        ]
    )

    Skeptic(llm).run(_case_file_with_specialist_output())

    assert len(llm.prompts) == 1


def test_skeptic_accepts_a_rendered_claim_without_the_markdown_bullet() -> None:
    claim = (
        "Mara had access to the control room through authorized keycard use, "
        "but the access record does not identify the card holder, so her direct "
        "entry is not proven."
    )
    case_file = _case_file_with_specialist_output()
    case_file.suspect_profiles[0].opportunity = (
        Claim(
            statement=claim,
            status=ClaimStatus.SUPPORTED,
            evidence_ids=("E-17", "E-43", "E-44", "E-59"),
        ),
    )
    response = {
        "findings": [
            {
                "specialist": "suspect_analyst",
                "claim": f"Opportunity: {claim} (E-17, E-43, E-44, E-59)",
                "kind": "unsupported_reasoning",
                "explanation": "Keycard authorization does not prove entry.",
            }
        ]
    }
    llm = SequentialResponseLLM(responses=[response, response])

    Skeptic(llm).run(case_file)

    assert len(llm.prompts) == 1
    assert case_file.skeptic_reviews[0].findings[0].claim == claim


def test_skeptic_accepts_typographic_apostrophe_normalization_in_rendered_claim() -> None:
    timeline_claim = (
        "At 6:03 PM, the control-room door was opened by Imani’s keycard; "
        "the record shows card use, not who held the card, and the earlier card "
        "handoff statements could explain why Imani’s card was in another person’s hands."
    )
    rendered_claim = (
        "Event: At 6:03 PM, the control-room door was opened by Imani's keycard; "
        "the record shows card use, not who held the card, and the earlier card "
        "handoff statements could explain why Imani's card was in another person's "
        "hands. (E-34, E-35, E-12, E-13, E-19, E-21, E-29, E-30)"
    )
    case_file = _case_file_with_specialist_output()
    case_file.timeline = Timeline(
        events=[
            TimelineEvent(
                statement=timeline_claim,
                time="6:03 PM",
                order=1,
                status=ClaimStatus.SUPPORTED,
                evidence_ids=(
                    "E-34",
                    "E-35",
                    "E-12",
                    "E-13",
                    "E-19",
                    "E-21",
                    "E-29",
                    "E-30",
                ),
            )
        ]
    )
    response = {
        "findings": [
            {
                "specialist": "timeline_reconciler",
                "claim": rendered_claim,
                "kind": "unsupported_reasoning",
                "explanation": "Card use does not identify the holder.",
            }
        ]
    }
    llm = SequentialResponseLLM(responses=[response, response])

    Skeptic(llm).run(case_file)

    assert len(llm.prompts) == 1
    assert case_file.skeptic_reviews[0].findings[0].claim == timeline_claim


def test_skeptic_rejects_finding_that_cites_an_unknown_claim() -> None:
    llm = StubLLM(
        response={
            "findings": [
                {
                    "specialist": "suspect_analyst",
                    "claim": "A claim nobody made.",
                    "kind": "unsupported_reasoning",
                    "explanation": "This does not exist.",
                }
            ]
        }
    )
    case_file = _case_file_with_specialist_output()

    with pytest.raises(ValueError, match="not made by"):
        Skeptic(llm).run(case_file)


def test_skeptic_rejects_invalid_specialist_value() -> None:
    llm = StubLLM(
        response={
            "findings": [
                {
                    "specialist": "lead_detective",
                    "claim": "The key card used at midnight proves she was in the study.",
                    "kind": "unsupported_reasoning",
                    "explanation": "Not a real specialist.",
                }
            ]
        }
    )
    case_file = _case_file_with_specialist_output()

    with pytest.raises(ValueError, match="Unknown specialist"):
        Skeptic(llm).run(case_file)


def test_skeptic_only_updates_its_own_case_file_section() -> None:
    llm = StubLLM(
        response={
            "findings": [
                {
                    "specialist": "suspect_analyst",
                    "claim": "A claim nobody made.",
                    "kind": "unsupported_reasoning",
                    "explanation": "This does not exist.",
                }
            ]
        }
    )
    case_file = _case_file_with_specialist_output()
    original_suspects = list(case_file.suspect_profiles)
    original_timeline = case_file.timeline

    with pytest.raises(ValueError):
        Skeptic(llm).run(case_file)

    assert case_file.suspect_profiles == original_suspects
    assert case_file.timeline == original_timeline
    assert case_file.skeptic_reviews == []


def test_skeptic_appends_reviews_across_multiple_calls() -> None:
    llm = StubLLM(response={"findings": []})
    case_file = _case_file_with_specialist_output()

    Skeptic(llm).run(case_file)
    Skeptic(llm).run(case_file)

    assert len(case_file.skeptic_reviews) == 2
    assert all(
        review.outcome is SkepticReviewOutcome.APPROVED
        for review in case_file.skeptic_reviews
    )
