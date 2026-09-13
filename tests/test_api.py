"""HTTP contract behavior for the Python investigation adapter."""

from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from api import _read_upload, create_api
from investigation_application import InvestigationApplication


class _ContractLLM:
    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        if "Evidence Collector" in system:
            response = {
                "evidence": [
                    {
                        "id": "H-4",
                        "statement": "The harbor bell stopped at dusk.",
                        "classification": "observed_fact",
                    }
                ]
            }
            if "harbor.md:S-001" in prompt:
                response["evidence"][0]["source_reference_ids"] = ["harbor.md:S-001"]
            return response
        if "Lead Detective" in system:
            return {
                "conclusions": [
                    {
                        "rank": 1,
                        "suspect": "The Bell Ringer",
                        "explanation": "The evidence does not establish responsibility.",
                        "evidence_ids": ["H-4"],
                    }
                ],
                "confidence": 35,
                "limitations": ["Responsibility remains uncertain."],
            }
        if "Skeptic" in system:
            return {"findings": []}
        if "Timeline Reconciler" in system:
            return {
                "events": [
                    {
                        "statement": "The harbor bell stopped.",
                        "time": "dusk",
                        "order": 1,
                        "status": "supported",
                        "evidence_ids": ["H-4"],
                    }
                ],
                "issues": [],
            }
        return {
            "suspects": [
                {
                    "name": "The Bell Ringer",
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
        }


def test_user_can_submit_case_material_and_read_a_safe_snapshot_over_http() -> None:
    application = InvestigationApplication(lambda provider: _ContractLLM())
    client = TestClient(create_api(application))

    started = client.post(
        "/v1/investigations",
        data={"provider": "gemini"},
        files={
            "files": (
                "/private/uploads/harbor.md",
                b"# Harbor report\n\nThe bell stopped at dusk.",
                "text/markdown",
            )
        },
    )

    assert started.status_code == 201
    investigation_id = started.json()["investigation_id"]
    client.get(f"/v1/investigations/{investigation_id}/events")
    snapshot = client.get(f"/v1/investigations/{investigation_id}")

    assert snapshot.status_code == 200
    assert snapshot.json()["case_file"]["source_text"] == {
        "harbor.md": "# Harbor report\n\nThe bell stopped at dusk."
    }
    assert snapshot.json()["case_file"]["evidence"][0]["id"] == "H-4"
    assert snapshot.json()["case_file"]["evidence"][0]["source_references"][0]["source_name"] == "harbor.md"
    assert "/private/uploads" not in snapshot.text


def test_user_can_recover_later_investigation_events_from_the_sse_stream() -> None:
    application = InvestigationApplication(lambda provider: _ContractLLM())
    client = TestClient(create_api(application))
    started = client.post(
        "/v1/investigations",
        data={"pasted_material": "The harbor bell stopped at dusk."},
    )

    events = client.get(
        f"/v1/investigations/{started.json()['investigation_id']}/events",
        params={"after_event_id": 2},
    )

    assert events.status_code == 200
    assert events.headers["content-type"].startswith("text/event-stream")
    assert "id: 3" in events.text
    assert "event: suspect_analysis_started" in events.text
    assert "\nid: 1\n" not in events.text


def test_user_can_record_a_human_decision_and_receive_a_safe_missing_case_error() -> None:
    application = InvestigationApplication(lambda provider: _ContractLLM())
    client = TestClient(create_api(application))
    started = client.post(
        "/v1/investigations",
        data={"pasted_material": "The harbor bell stopped at dusk."},
    )
    client.get(f"/v1/investigations/{started.json()['investigation_id']}/events")

    decision = client.post(
        f"/v1/investigations/{started.json()['investigation_id']}/decision",
        json={"action": "accept"},
    )
    missing = client.get("/v1/investigations/not-an-investigation")

    assert decision.status_code == 200
    assert decision.json()["case_file"]["verdict"]["review_status"] == "accepted"
    assert missing.status_code == 400
    assert missing.json()["detail"] == {
        "stage": "case_file",
        "message": "The investigation was not found.",
        "recovery_action": "Start a new investigation or verify the investigation ID.",
    }


def test_user_can_request_reinvestigation_over_http() -> None:
    application = InvestigationApplication(lambda provider: _ContractLLM())
    client = TestClient(create_api(application))
    started = client.post(
        "/v1/investigations",
        data={"pasted_material": "The harbor bell stopped at dusk."},
    )
    investigation_id = started.json()["investigation_id"]
    initial_events = client.get(f"/v1/investigations/{investigation_id}/events")

    reinvestigated = client.post(
        f"/v1/investigations/{investigation_id}/reinvestigation",
        json={"note": "Check the bell ringer's alibi.", "provider": "openai"},
    )
    client.get(
        f"/v1/investigations/{investigation_id}/events",
        params={"after_event_id": initial_events.text.count("\nid: ") + 1},
    )
    snapshot = client.get(f"/v1/investigations/{investigation_id}")

    assert reinvestigated.status_code == 200
    assert snapshot.json()["case_file"]["human_notes"] == ["Check the bell ringer's alibi."]
    assert snapshot.json()["case_file"]["evidence"][0]["id"] == "H-4"


def test_reinvestigation_requires_a_nonempty_guidance_note() -> None:
    application = InvestigationApplication(lambda provider: _ContractLLM())
    client = TestClient(create_api(application))
    started = client.post(
        "/v1/investigations",
        data={"pasted_material": "The harbor bell stopped at dusk."},
    )
    client.get(f"/v1/investigations/{started.json()['investigation_id']}/events")

    reinvestigated = client.post(
        f"/v1/investigations/{started.json()['investigation_id']}/reinvestigation",
        json={"note": "   "},
    )

    assert reinvestigated.status_code == 400
    assert reinvestigated.json()["detail"] == {
        "stage": "reinvestigation",
        "message": "Enter a guidance note before requesting re-investigation.",
        "recovery_action": "Enter a non-empty guidance note and try again.",
    }


def test_human_review_rejects_a_second_decision_without_an_internal_error() -> None:
    application = InvestigationApplication(lambda provider: _ContractLLM())
    client = TestClient(create_api(application))
    started = client.post(
        "/v1/investigations",
        data={"pasted_material": "The harbor bell stopped at dusk."},
    )
    endpoint = f"/v1/investigations/{started.json()['investigation_id']}/decision"
    client.get(f"/v1/investigations/{started.json()['investigation_id']}/events")

    client.post(endpoint, json={"action": "accept"})
    second_decision = client.post(endpoint, json={"action": "reject"})

    assert second_decision.status_code == 400
    assert "already has a recorded human decision" in second_decision.json()["detail"]["message"]
    assert second_decision.json()["detail"]["stage"] == "human_review"
    assert second_decision.json()["detail"]["recovery_action"] == (
        "Review the recorded decision; request re-investigation if further work is needed."
    )


def test_openapi_document_is_the_versioned_transport_schema() -> None:
    client = TestClient(create_api(InvestigationApplication(lambda provider: _ContractLLM())))

    schema = client.get("/openapi.json").json()

    assert schema["info"]["version"] == "1.0.0"
    assert "/v1/investigations/{investigation_id}/events" in schema["paths"]
    assert "InvestigationSnapshot" in schema["components"]["schemas"]
    assert "text/event-stream" in schema["paths"]["/v1/investigations/{investigation_id}/events"]["get"]["responses"]["200"]["content"]
    assert "TransportFailure" in schema["components"]["schemas"]
    assert "422" not in schema["paths"]["/v1/investigations"]["post"]["responses"]
    assert (
        schema["paths"]["/v1/investigations/{investigation_id}/events"]["get"]
        ["responses"]["200"]["content"]["text/event-stream"]["schema"]["$ref"]
        == "#/components/schemas/PublicInvestigationEvent"
    )
    assert "application/json" not in schema["paths"]["/v1/investigations/{investigation_id}/events"]["get"]["responses"]["200"]["content"]


def test_snapshot_and_events_publish_the_declared_transport_version() -> None:
    application = InvestigationApplication(lambda provider: _ContractLLM())
    client = TestClient(create_api(application))
    started = client.post(
        "/v1/investigations",
        data={"pasted_material": "The harbor bell stopped at dusk."},
    )
    investigation_id = started.json()["investigation_id"]

    events = client.get(f"/v1/investigations/{investigation_id}/events")
    snapshot = client.get(f"/v1/investigations/{investigation_id}")

    assert snapshot.json()["transport_version"] == "1.0.0"
    assert '"transport_version":"1.0.0"' in events.text


def test_invalid_transport_input_uses_the_safe_error_contract() -> None:
    client = TestClient(create_api(InvestigationApplication(lambda provider: _ContractLLM())))
    started = client.post(
        "/v1/investigations",
        data={"pasted_material": "The harbor bell stopped at dusk."},
    )

    invalid = client.post(
        f"/v1/investigations/{started.json()['investigation_id']}/decision",
        json={},
    )

    assert invalid.status_code == 400
    assert invalid.json()["detail"] == {
        "stage": "request_validation",
        "message": "The request is incomplete or has an invalid value.",
        "recovery_action": "Correct the highlighted request fields and try again.",
    }


def test_unreadable_upload_uses_the_safe_error_contract() -> None:
    class _UnreadableUpload:
        async def read(self) -> bytes:
            raise OSError("/private/uploads/harbor.md is unavailable")

    with pytest.raises(HTTPException) as failure:
        asyncio.run(_read_upload(_UnreadableUpload()))

    assert failure.value.status_code == 400
    assert failure.value.detail == {
        "stage": "case_material",
        "message": "One uploaded file could not be read.",
        "recovery_action": "Upload the file again or paste its text and try again.",
    }
