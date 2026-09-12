"""Public behavior for the Python investigation application interface."""

from __future__ import annotations

from dataclasses import dataclass, field
import threading

from case_file import VerdictReviewStatus
from case_material import CaseMaterialInput
from investigation_application import (
    DecisionRequest,
    InvestigationApplication,
    ReinvestigationRequest,
    StartInvestigationRequest,
)


@dataclass
class _ApplicationLLM:
    responses: list[dict] = field(
        default_factory=lambda: [
            {
                "evidence": [
                    {
                        "id": "L-7",
                        "statement": "The lighthouse lamp went dark before midnight.",
                        "classification": "observed_fact",
                    }
                ]
            },
            {
                "suspects": [
                    {
                        "name": "The Keeper",
                        "motive": [
                            {
                                "statement": "No motive is established.",
                                "status": "unknown",
                                "evidence_ids": [],
                            }
                        ],
                        "opportunity": [
                            {
                                "statement": "The evidence does not establish their location.",
                                "status": "unknown",
                                "evidence_ids": [],
                            }
                        ],
                    }
                ]
            },
            {
                "events": [
                    {
                        "statement": "The lighthouse lamp went dark.",
                        "time": "before midnight",
                        "order": 1,
                        "status": "supported",
                        "evidence_ids": ["L-7"],
                    }
                ],
                "issues": [],
            },
            {"findings": []},
            {
                "conclusions": [
                    {
                        "rank": 1,
                        "suspect": "The Keeper",
                        "explanation": "The available evidence does not establish responsibility.",
                        "evidence_ids": ["L-7"],
                    }
                ],
                "confidence": 35,
                "limitations": ["Responsibility remains uncertain."],
            },
        ]
    )

    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        expected_key = (
            "evidence"
            if "Evidence Collector" in system
            else "conclusions"
            if "Lead Detective" in system
            else "findings"
            if "Skeptic" in system
            else "events"
            if "Timeline Reconciler" in system
            else "suspects"
        )
        for index, response in enumerate(self.responses):
            if expected_key in response:
                return self.responses.pop(index)
        raise AssertionError(f"No {expected_key} response is configured.")


class _BlockingApplicationLLM(_ApplicationLLM):
    def __init__(self) -> None:
        super().__init__()
        self.release_collection = threading.Event()

    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        if "Evidence Collector" in system:
            assert self.release_collection.wait(timeout=2)
        return super().call_llm(prompt, system, response_schema)


def test_user_can_start_an_uploaded_case_and_recover_its_snapshot_and_events() -> None:
    application = InvestigationApplication(lambda provider: _ApplicationLLM())

    started = application.start(
        StartInvestigationRequest(
            provider="gemini",
            uploads=(
                CaseMaterialInput(
                    display_name="beacon.md",
                    content="# Beacon log\n\nThe lamp went dark before midnight.",
                    media_type="text/markdown",
                ),
            ),
        )
    )

    events = tuple(application.events(started.investigation_id))
    snapshot = application.snapshot(started.investigation_id)

    assert snapshot.investigation_id == started.investigation_id
    assert snapshot.case_file is not None
    assert "# Beacon log" in snapshot.case_file.canonical_material
    assert snapshot.case_file.source_text == {
        "beacon.md": "# Beacon log\n\nThe lamp went dark before midnight."
    }
    assert snapshot.case_file.evidence[0].id == "L-7"
    assert snapshot.case_file.verdict is not None
    assert [event.event_id for event in events] == list(range(1, len(events) + 1))
    assert events[0].event_type == "case_material_curation_started"
    assert events[-1].event_type == "lead_detective_completed"


def test_user_can_observe_a_lifecycle_event_before_the_investigation_completes() -> None:
    llm = _BlockingApplicationLLM()
    application = InvestigationApplication(lambda provider: llm)
    started = application.start(
        StartInvestigationRequest(pasted_material="The lighthouse lamp went dark.")
    )

    events = application.events(started.investigation_id)
    first_event = next(events)

    assert first_event.event_type == "evidence_collection_started"
    assert application.snapshot(started.investigation_id).is_complete is False
    llm.release_collection.set()
    tuple(events)


def test_user_can_accept_a_proposed_verdict_through_the_application_interface() -> None:
    application = InvestigationApplication(lambda provider: _ApplicationLLM())
    started = application.start(
        StartInvestigationRequest(pasted_material="The lighthouse lamp went dark.")
    )
    tuple(application.events(started.investigation_id))

    snapshot = application.decide(
        started.investigation_id, DecisionRequest(action="accept")
    )

    assert snapshot.case_file is not None
    assert snapshot.case_file.verdict is not None
    assert snapshot.case_file.verdict.review_status is VerdictReviewStatus.ACCEPTED
    assert tuple(application.events(started.investigation_id))[-1].event_type == "human_decision_recorded"


def test_user_can_request_reinvestigation_without_collecting_evidence_again() -> None:
    application = InvestigationApplication(lambda provider: _ApplicationLLM())
    started = application.start(
        StartInvestigationRequest(pasted_material="The lighthouse lamp went dark.")
    )
    initial_events = tuple(application.events(started.investigation_id))
    first_snapshot = application.snapshot(started.investigation_id)
    prior_event_count = len(initial_events)

    snapshot = application.reinvestigate(
        started.investigation_id,
        ReinvestigationRequest(note="Check the keeper's alibi.", provider="openai"),
    )

    later_events = tuple(application.events(started.investigation_id, prior_event_count))
    snapshot = application.snapshot(started.investigation_id)
    assert snapshot.case_file is not None
    assert first_snapshot.case_file is not None
    assert [item.id for item in snapshot.case_file.evidence] == [item.id for item in first_snapshot.case_file.evidence]
    assert snapshot.case_file.human_notes == ["Check the keeper's alibi."]
    assert later_events[0].event_type == "reinvestigation_requested"
    assert "evidence_collection_started" not in {event.event_type for event in later_events}
