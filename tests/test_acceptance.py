"""Deterministic master-ticket acceptance coverage at public application seams."""

from __future__ import annotations

import json
import sys
import threading
from collections import deque
from types import ModuleType, SimpleNamespace

import pytest

try:
    import gradio  # noqa: F401
except ModuleNotFoundError:
    gradio_stub = ModuleType("gradio")
    gradio_stub.update = lambda **values: values
    sys.modules["gradio"] = gradio_stub

import app
import llm_client
from case_file import CaseFile, Specialist, VerdictReviewStatus
from llm_client import EnvLLMClient
from orchestrator import InvestigationEventKind, stream_investigation, stream_reinvestigation


# This fixture deliberately contains only the participant section of the case
# book. The sealed facilitator solution is an evaluation oracle, never input.
AURORA_PARTICIPANT_CASE = """\
At 8:00 PM, Dr. Mira Sen displayed the Aurora Diamond in a locked glass case
in the Grand Gallery. A power failure darkened the gallery from 8:20 PM to
8:24 PM. At 8:30 PM, staff found the diamond missing; the glass was intact.

Evidence A: Valid-card access is recorded during a power failure because the
electronic lock has a battery. Evidence B: Arjun Vale's card opened the display
case at 8:23 PM. Evidence C: Arjun says his card remained in his jacket in the
archive. Evidence D: At 8:25 PM, a camera showed Arjun leaving the archive with
a flat catalogue folder, though its contents are not visible. Evidence E: Blue
velvet fibers were found inside that folder; the display cushion is blue velvet.
Evidence F: A muddy print near the case matches Lena Ortiz's boot size, but she
had crossed a wet courtyard earlier. Evidence G: Insurance pays the museum, not
any named suspect, if the diamond remains missing.

Lena says she worked on the generator from 8:19 PM to 8:26 PM. Theo is on stage
camera continuously from 8:15 PM to 8:29 PM. Sofia was with lobby guests during
the blackout. Arjun has a large private debt and says he worked in the archive.
"""


HARBOR_PARTICIPANT_CASE = """\
At 5:40 AM, the signal lantern vanished from Pelican Harbor's locked lighthouse
cabinet. The tide bell rang at 5:17 AM. Evidence H1: the keeper's log records a
cabinet key checkout at 5:12 AM. Evidence H2: diver Niko Bell's boat crossed the
outer buoy at 5:14 AM. Evidence H3: radio operator June Moss confirmed a storm
warning from the radio room until 5:28 AM. Evidence H4: mechanic Ora Venn found
saltwater on the cabinet shelf at 5:35 AM. Evidence H5: Niko's canvas bag was
empty when searched at 6:00 AM. The three possible suspects are Niko, June, and
Ora. The log does not identify who took the key.
"""

SPECIALIST_COUNT = 2
RENDEZVOUS_TIMEOUT_SECONDS = 1


def _role(system: str) -> str:
    if "Evidence Collector" in system:
        return "collector"
    if "Lead Detective" in system:
        return "lead"
    if "Skeptic" in system:
        return "skeptic"
    if "Suspect Analyst" in system:
        return "suspect"
    if "Timeline Reconciler" in system:
        return "timeline"
    raise AssertionError(f"Unexpected agent system message: {system!r}")


class ScriptedLLM:
    """Thread-safe role-based LLM fake; concurrent calls need no fixed order."""

    def __init__(self, responses: dict[str, list[dict]]) -> None:
        self._responses = {role: deque(items) for role, items in responses.items()}
        self.calls: list[tuple[str, str]] = []
        self._lock = threading.Lock()

    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        role = _role(system)
        with self._lock:
            self.calls.append((role, prompt))
            try:
                return self._responses[role].popleft()
            except (KeyError, IndexError) as error:
                raise AssertionError(f"No response configured for {role}.") from error


class OpenAICompatibleTransport:
    """Adapts scripted responses to the OpenAI chat-completions transport."""

    def __init__(self, scripted_llm: ScriptedLLM) -> None:
        self._scripted_llm = scripted_llm
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self._create_completion)
        )

    def _create_completion(self, **kwargs: object) -> SimpleNamespace:
        messages = kwargs["messages"]
        system, prompt = messages
        response = self._scripted_llm.call_llm(
            prompt["content"], system["content"], kwargs["response_format"]
        )
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(response)))]
        )


class RendezvousLLM(ScriptedLLM):
    """Makes either serial specialist execution fail without assuming its order."""

    def __init__(self, responses: dict[str, list[dict]]) -> None:
        super().__init__(responses)
        self.specialist_rendezvous = threading.Barrier(SPECIALIST_COUNT)

    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        if _role(system) in {"suspect", "timeline"}:
            self.specialist_rendezvous.wait(timeout=RENDEZVOUS_TIMEOUT_SECONDS)
        return super().call_llm(prompt, system, response_schema)


def _aurora_responses(*, evidence_e_unavailable: bool = False) -> dict[str, list[dict]]:
    evidence = [
        ("A", "The lock records valid-card access during power failure."),
        ("B", "Arjun Vale's card opened the display case at 8:23 PM."),
        ("C", "Arjun says his card remained in his archive jacket."),
        ("D", "Arjun left with a flat folder whose contents were not visible."),
        ("E", "Blue velvet fibers were found in Arjun's folder."),
        ("F", "A muddy print has an innocent wet-courtyard explanation."),
        ("G", "Insurance pays the museum rather than a named suspect."),
    ]
    collector = {
        "evidence": [
            {"id": identifier, "statement": statement, "classification": "observed_fact"}
            for identifier, statement in evidence
        ]
    }
    suspect_claim = (
        "Arjun's card use proves he personally opened the case."
        if not evidence_e_unavailable
        else "The available evidence does not identify who held Arjun's card."
    )
    revised_claim = "Arjun's card was used; who held it remains unconfirmed."
    suspect = {
        "suspects": [
            {
                "name": name,
                "motive": [{"statement": motive, "status": "unknown", "evidence_ids": []}],
                "opportunity": [
                    {"statement": claim, "status": "supported", "evidence_ids": ids}
                ],
            }
            for name, motive, claim, ids in [
                ("Lena Ortiz", "A denied promotion is not proof.", "Her generator alibi is partly supported.", ["F"]),
                ("Theo Park", "Publicity is not proof.", "Stage footage supports his alibi.", ["A"]),
                ("Arjun Vale", "Debt may supply motive but is not proof.", suspect_claim, ["B", "C"]),
                ("Sofia Reed", "An exclusive story is not proof.", "Lobby guests support her alibi.", ["A"]),
            ]
        ]
    }
    revised_suspect = {
        **suspect,
        "suspects": [
            profile
            if profile["name"] != "Arjun Vale"
            else {
                **profile,
                "opportunity": [
                    {"statement": revised_claim, "status": "supported", "evidence_ids": ["B", "C"]}
                ],
            }
            for profile in suspect["suspects"]
        ],
    }
    timeline = {
        "events": [
            {"statement": "The power failed.", "time": "8:20 PM", "order": 1, "status": "supported", "evidence_ids": ["A"]},
            {"statement": "Arjun's card opened the case.", "time": "8:23 PM", "order": 2, "status": "supported", "evidence_ids": ["B"]},
        ],
        "issues": [{"kind": "gap", "statement": "Card use does not identify its holder.", "evidence_ids": ["B", "C"]}],
    }
    evidence_ids = ["A", "B", "D"] if evidence_e_unavailable else ["A", "B", "D", "E"]
    verdict = {
        "conclusions": [{"rank": 1, "suspect": "Arjun Vale", "explanation": "Arjun is the leading explanation, not a proven culprit.", "evidence_ids": evidence_ids}],
        "confidence": 62 if evidence_e_unavailable else 74,
        "limitations": [
            "Uncertainty: the record does not identify who used Arjun's card.",
            "Missing evidence: inspect the access card and verify the folder contents.",
            *( ["Evidence E is unavailable, so the fiber link cannot support this run."] if evidence_e_unavailable else [] ),
        ],
    }
    first_review = {"findings": []} if evidence_e_unavailable else {"findings": [{"specialist": "suspect_analyst", "claim": suspect_claim, "kind": "unsupported_reasoning", "explanation": "Card use does not identify the card holder."}]}
    return {
        "collector": [collector],
        "suspect": [suspect] if evidence_e_unavailable else [suspect, revised_suspect],
        "timeline": [timeline],
        "skeptic": [first_review] if evidence_e_unavailable else [first_review, {"findings": []}],
        "lead": [verdict],
    }


def _assert_final_citations_are_case_local(case_file: CaseFile) -> None:
    assert case_file.verdict is not None
    evidence_ids = {item.id for item in case_file.evidence}
    assert all(conclusion.evidence_ids for conclusion in case_file.verdict.conclusions)
    assert all(set(conclusion.evidence_ids) <= evidence_ids for conclusion in case_file.verdict.conclusions)


def test_aurora_participant_fixture_completes_revision_and_visible_human_review() -> None:
    assert "Facilitator Only Solution" not in AURORA_PARTICIPANT_CASE
    assert "Most likely explanation" not in AURORA_PARTICIPANT_CASE
    llm = ScriptedLLM(_aurora_responses())

    events = list(stream_investigation(AURORA_PARTICIPANT_CASE, llm))

    event_kinds = [event.kind for event in events]
    assert event_kinds[:4] == [
        InvestigationEventKind.EVIDENCE_COLLECTION_STARTED,
        InvestigationEventKind.EVIDENCE_COLLECTION_COMPLETED,
        InvestigationEventKind.SUSPECT_ANALYSIS_STARTED,
        InvestigationEventKind.TIMELINE_RECONCILIATION_STARTED,
    ]
    assert set(event_kinds[4:6]) == {
        InvestigationEventKind.SUSPECT_ANALYSIS_COMPLETED,
        InvestigationEventKind.TIMELINE_RECONCILIATION_COMPLETED,
    }
    assert InvestigationEventKind.SKEPTIC_REVIEW_REVISION_REQUESTED in event_kinds
    assert events[-1].kind is InvestigationEventKind.LEAD_DETECTIVE_COMPLETED
    case_file = events[-1].case_file
    assert case_file is not None
    _assert_final_citations_are_case_local(case_file)
    assert case_file.verdict.conclusions[0].suspect == "Arjun Vale"
    assert any("Uncertainty" in item for item in case_file.verdict.limitations)
    assert any("Missing evidence" in item and "inspect" in item for item in case_file.verdict.limitations)
    assert case_file.verdict.review_status is VerdictReviewStatus.AWAITING_REVIEW
    assert "proposal pending human review" in app.render_verdict(case_file)
    assert all(update.get_config()["interactive"] for update in app.sync_review_controls(case_file))


def test_gradio_facing_stream_renders_the_aurora_verdict_for_human_review(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(app, "EnvLLMClient", lambda: ScriptedLLM(_aurora_responses()))

    updates = list(app.run_investigation(AURORA_PARTICIPANT_CASE))

    transcript, evidence, suspects, timeline, skeptic, verdict, case_file = updates[-1]
    assert "Evidence Collector finished" in transcript
    assert "Suspect Analyst finished" in transcript
    assert "Timeline Reconciler finished" in transcript
    assert "Round 2: Approved" in skeptic
    assert "A, B, D, E" in verdict
    assert "proposal pending human review" in verdict
    assert "Arjun Vale" in suspects
    assert "8:23 PM" in timeline
    assert "Blue velvet fibers" in evidence
    assert case_file.verdict.review_status is VerdictReviewStatus.AWAITING_REVIEW


def test_specialist_acceptance_stage_runs_concurrently_without_a_completion_order_contract() -> None:
    llm = RendezvousLLM(_aurora_responses(evidence_e_unavailable=True))

    events = list(stream_investigation(AURORA_PARTICIPANT_CASE, llm))

    completed_specialists = [
        event.kind
        for event in events
        if event.kind
        in {
            InvestigationEventKind.SUSPECT_ANALYSIS_COMPLETED,
            InvestigationEventKind.TIMELINE_RECONCILIATION_COMPLETED,
        }
    ]
    assert set(completed_specialists) == {
        InvestigationEventKind.SUSPECT_ANALYSIS_COMPLETED,
        InvestigationEventKind.TIMELINE_RECONCILIATION_COMPLETED,
    }


def test_reinvestigation_keeps_original_evidence_and_excludes_unavailable_fiber_from_verdict() -> None:
    original_events = list(stream_investigation(AURORA_PARTICIPANT_CASE, ScriptedLLM(_aurora_responses())))
    case_file = original_events[-1].case_file
    assert case_file is not None
    original_evidence = case_file.evidence.copy()
    original_verdict = case_file.verdict.model_copy(deep=True)
    reinvestigation_llm = ScriptedLLM(_aurora_responses(evidence_e_unavailable=True))

    events = list(stream_reinvestigation(case_file, "Evidence E is unavailable; do not rely on it.", reinvestigation_llm))

    assert events[0].kind is InvestigationEventKind.REINVESTIGATION_REQUESTED
    assert InvestigationEventKind.EVIDENCE_COLLECTION_STARTED not in [event.kind for event in events]
    assert case_file.evidence == original_evidence
    assert case_file.human_notes[-1] == "Evidence E is unavailable; do not rely on it."
    assert all(role != "collector" for role, _ in reinvestigation_llm.calls)
    assert any("Evidence E is unavailable" in prompt for _, prompt in reinvestigation_llm.calls)
    _assert_final_citations_are_case_local(case_file)
    assert "E" not in case_file.verdict.conclusions[0].evidence_ids
    assert any("Evidence E is unavailable" in item for item in case_file.verdict.limitations)
    assert case_file.verdict.confidence < original_verdict.confidence
    assert case_file.verdict.conclusions != original_verdict.conclusions


def test_unrelated_harbor_fixture_has_its_own_case_shape_and_leading_explanation() -> None:
    llm = ScriptedLLM(
        {
            "collector": [{"evidence": [{"id": "H1", "statement": "A key was checked out at 5:12 AM.", "classification": "observed_fact"}, {"id": "H2", "statement": "Niko's boat crossed the buoy at 5:14 AM.", "classification": "observed_fact"}, {"id": "H3", "statement": "June remained at the radio until 5:28 AM.", "classification": "observed_fact"}, {"id": "H4", "statement": "Saltwater was found on the shelf.", "classification": "observed_fact"}, {"id": "H5", "statement": "Niko's bag was empty at 6:00 AM.", "classification": "observed_fact"}]}],
            "suspect": [{"suspects": [{"name": "Niko Bell", "motive": [{"statement": "No motive is established.", "status": "unknown", "evidence_ids": []}], "opportunity": [{"statement": "The boat crossing warrants further checking.", "status": "supported", "evidence_ids": ["H2"]}]}, {"name": "June Moss", "motive": [{"statement": "No motive is established.", "status": "unknown", "evidence_ids": []}], "opportunity": [{"statement": "The radio record supports her location.", "status": "supported", "evidence_ids": ["H3"]}]}, {"name": "Ora Venn", "motive": [{"statement": "No motive is established.", "status": "unknown", "evidence_ids": []}], "opportunity": [{"statement": "Saltwater makes the cabinet route worth checking.", "status": "supported", "evidence_ids": ["H4"]}]}]}],
            "timeline": [{"events": [{"statement": "The key was checked out.", "time": "5:12 AM", "order": 1, "status": "supported", "evidence_ids": ["H1"]}], "issues": [{"kind": "gap", "statement": "The checkout log does not name the key holder.", "evidence_ids": ["H1"]}]}],
            "skeptic": [{"findings": []}],
            "lead": [{"conclusions": [{"rank": 1, "suspect": "Niko Bell", "explanation": "Niko is the leading lead, though the key holder is unknown.", "evidence_ids": ["H1", "H2"]}], "confidence": 41, "limitations": ["Missing evidence: identify who checked out the key."]}],
        }
    )

    events = list(stream_investigation(HARBOR_PARTICIPANT_CASE, llm))

    case_file = events[-1].case_file
    assert case_file is not None
    assert [item.id for item in case_file.evidence] == ["H1", "H2", "H3", "H4", "H5"]
    assert len(case_file.suspect_profiles) == 3
    assert case_file.verdict.conclusions[0].suspect == "Niko Bell"
    _assert_final_citations_are_case_local(case_file)


def test_invalid_then_valid_provider_response_retries_once_before_pipeline_continues(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-only-key")
    attempts = 0
    responses = ScriptedLLM(_aurora_responses(evidence_e_unavailable=True))

    def provider(prompt: str, system: str, response_schema: dict) -> str:
        nonlocal attempts
        if _role(system) == "collector":
            attempts += 1
            if attempts == 1:
                return "not json"
        return json.dumps(responses.call_llm(prompt, system, response_schema))

    monkeypatch.setattr(llm_client, "_call_gemini", provider)
    events = list(stream_investigation(AURORA_PARTICIPANT_CASE, EnvLLMClient(provider="gemini")))

    assert attempts == 2
    assert events[-1].kind is InvestigationEventKind.LEAD_DETECTIVE_COMPLETED


def test_invalid_twice_stops_the_pipeline_and_is_visible_in_gradio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-only-key")
    attempts = 0

    def provider(prompt: str, system: str, response_schema: dict) -> str:
        nonlocal attempts
        attempts += 1
        return "not json"

    monkeypatch.setattr(llm_client, "_call_gemini", provider)
    monkeypatch.setattr(app, "EnvLLMClient", lambda: EnvLLMClient(provider="gemini"))

    updates = list(app.run_investigation(AURORA_PARTICIPANT_CASE))

    transcript, evidence, suspects, timeline, skeptic, verdict, case_file = updates[-1]
    assert attempts == 2
    assert "Evidence Collector step failed" in transcript
    assert evidence == "_No evidence collected yet._"
    assert suspects == "_No suspect profiles yet._"
    assert timeline == "_No timeline analysis yet._"
    assert skeptic == "_No Skeptic review yet._"
    assert verdict == "_No verdict yet._"
    assert case_file.verdict is None


@pytest.mark.parametrize("provider", ["groq"])
def test_openai_compatible_provider_runs_the_public_pipeline_with_mocked_transport(
    monkeypatch: pytest.MonkeyPatch, provider: str
) -> None:
    configuration = llm_client._OPENAI_COMPATIBLE_PROVIDERS[provider]
    scripted_llm = ScriptedLLM(_aurora_responses(evidence_e_unavailable=True))
    monkeypatch.setenv(configuration.key_environment_variable, "test-only-key")
    monkeypatch.setenv(configuration.model_environment_variable, "test-model")
    monkeypatch.setattr(
        llm_client,
        "_create_openai_client",
        lambda api_key, endpoint: OpenAICompatibleTransport(scripted_llm),
    )

    events = list(stream_investigation(AURORA_PARTICIPANT_CASE, EnvLLMClient(provider)))

    assert events[-1].kind is InvestigationEventKind.LEAD_DETECTIVE_COMPLETED
    assert events[-1].case_file.verdict is not None
