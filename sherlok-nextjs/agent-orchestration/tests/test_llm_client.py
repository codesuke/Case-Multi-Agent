"""Behavior tests for the provider-agnostic LLM boundary."""

from __future__ import annotations

import os
import sys
import threading
import types as stdlib_types
import unittest
from unittest.mock import patch

from investigation_application import InvestigationApplication, StartInvestigationRequest
from llm_client import EnvLLMClient


class _FakeGenerateContentConfig:
    def __init__(self, **kwargs: object) -> None:
        self.kwargs = kwargs


class _FakeModels:
    def __init__(self) -> None:
        self.request: dict[str, object] | None = None

    def generate_content(self, **kwargs: object) -> object:
        self.request = kwargs
        return stdlib_types.SimpleNamespace(text='{"status":"ready"}')


class _FakeGenAIClient:
    api_key: str | None = None
    models = _FakeModels()

    def __init__(self, *, api_key: str) -> None:
        type(self).api_key = api_key


class _InvestigationModels:
    def __init__(self) -> None:
        self.requests: list[dict[str, object]] = []
        self._lock = threading.Lock()

    def generate_content(self, **kwargs: object) -> object:
        with self._lock:
            self.requests.append(kwargs)
        config = kwargs["config"]
        assert isinstance(config, _FakeGenerateContentConfig)
        return stdlib_types.SimpleNamespace(
            text=_response_for_agent(config.kwargs["system_instruction"])
        )


class _InvestigationGenAIClient:
    models = _InvestigationModels()

    def __init__(self, *, api_key: str) -> None:
        self.api_key = api_key


def _response_for_agent(system_instruction: object) -> str:
    assert isinstance(system_instruction, str)
    if system_instruction.startswith("You are the Evidence Collector"):
        return '{"evidence":[{"id":"L-7","statement":"The lamp went dark.","classification":"observed_fact"}]}'
    if system_instruction.startswith("You are the Suspect Analyst"):
        return '{"suspects":[{"name":"The Keeper","motive":[{"statement":"No motive is established.","status":"unknown","evidence_ids":[]}],"opportunity":[{"statement":"The evidence does not establish their location.","status":"unknown","evidence_ids":[]}]}]}'
    if system_instruction.startswith("You are the Timeline Reconciler"):
        return '{"events":[{"statement":"The lamp went dark.","time":"before midnight","order":1,"status":"supported","evidence_ids":["L-7"]}],"issues":[]}'
    if system_instruction.startswith("You are the Skeptic"):
        return '{"findings":[]}'
    if system_instruction.startswith("You are the Lead Detective"):
        return '{"conclusions":[{"rank":1,"suspect":"The Keeper","explanation":"The evidence does not establish responsibility.","evidence_ids":["L-7"]}],"confidence":35,"limitations":["Responsibility remains uncertain."]}'
    raise AssertionError(f"Unexpected agent system instruction: {system_instruction!r}")


class GeminiSDKAdapterTests(unittest.TestCase):
    def test_gemini_provider_uses_official_client_structured_output(self) -> None:
        _FakeGenAIClient.api_key = None
        _FakeGenAIClient.models = _FakeModels()
        fake_google = stdlib_types.ModuleType("google")
        fake_genai = stdlib_types.ModuleType("google.genai")
        fake_genai.Client = _FakeGenAIClient
        fake_genai.types = stdlib_types.SimpleNamespace(
            GenerateContentConfig=_FakeGenerateContentConfig
        )
        fake_google.genai = fake_genai
        schema = {
            "type": "object",
            "required": ["status"],
            "properties": {"status": {"type": "string"}},
        }

        with (
            patch.dict(
                os.environ,
                {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"},
            ),
            patch.dict(sys.modules, {"google": fake_google, "google.genai": fake_genai}),
        ):
            result = EnvLLMClient("gemini").call_llm(
                "Inspect the evidence.", "You are a careful detective.", schema
            )

        self.assertEqual(result, {"status": "ready"})
        self.assertEqual(_FakeGenAIClient.api_key, "test-key")
        request = _FakeGenAIClient.models.request
        self.assertIsNotNone(request)
        assert request is not None
        self.assertEqual(request["model"], "test-model")
        self.assertEqual(request["contents"], "Inspect the evidence.")
        config = request["config"]
        self.assertIsInstance(config, _FakeGenerateContentConfig)
        assert isinstance(config, _FakeGenerateContentConfig)
        self.assertEqual(
            config.kwargs,
            {
                "system_instruction": "You are a careful detective.",
                "response_mime_type": "application/json",
                "response_schema": schema,
            },
        )

    def test_gemini_provider_completes_an_investigation_through_the_application_interface(
        self,
    ) -> None:
        _InvestigationGenAIClient.models = _InvestigationModels()
        fake_google = stdlib_types.ModuleType("google")
        fake_genai = stdlib_types.ModuleType("google.genai")
        fake_genai.Client = _InvestigationGenAIClient
        fake_genai.types = stdlib_types.SimpleNamespace(
            GenerateContentConfig=_FakeGenerateContentConfig
        )
        fake_google.genai = fake_genai

        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}),
            patch.dict(sys.modules, {"google": fake_google, "google.genai": fake_genai}),
        ):
            application = InvestigationApplication(EnvLLMClient)
            started = application.start(
                StartInvestigationRequest(
                    pasted_material="The lighthouse lamp went dark before midnight.",
                    provider="gemini",
                )
            )
            events = tuple(application.events(started.investigation_id))

        snapshot = application.snapshot(started.investigation_id)
        self.assertEqual(
            events[-1].event_type,
            "lead_detective_completed",
            events[-1].message,
        )
        self.assertIsNotNone(snapshot.case_file)
        assert snapshot.case_file is not None
        self.assertEqual(snapshot.case_file.evidence[0].id, "L-7")
        self.assertEqual(len(_InvestigationGenAIClient.models.requests), 5)


if __name__ == "__main__":
    unittest.main()
