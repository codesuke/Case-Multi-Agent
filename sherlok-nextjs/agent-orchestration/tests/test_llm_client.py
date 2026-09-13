"""Behavior tests for the provider-agnostic LLM boundary."""

from __future__ import annotations

import os
import sys
import types as stdlib_types
import unittest
from unittest.mock import patch

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


if __name__ == "__main__":
    unittest.main()
