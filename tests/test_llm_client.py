from __future__ import annotations

import json
import os
from types import SimpleNamespace

import pytest

import llm_client
from llm_client import EnvLLMClient, LLMError, LLMRunMetadata

_EVIDENCE_SCHEMA = {
    "type": "object",
    "required": ["evidence"],
    "properties": {
        "evidence": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "statement", "classification"],
                "properties": {
                    "id": {"type": "string"},
                    "statement": {"type": "string"},
                    "classification": {
                        "type": "string",
                        "enum": ["observed_fact", "inference"],
                    },
                },
            },
        }
    },
}


class FakeOpenAIClient:
    """Captures OpenAI-compatible requests without making network calls."""

    def __init__(self, responses: list[str]) -> None:
        self._responses = iter(responses)
        self.calls: list[dict] = []
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self._create_completion)
        )

    def _create_completion(self, **kwargs: object) -> SimpleNamespace:
        self.calls.append(kwargs)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=next(self._responses)))]
        )


def test_call_llm_retries_once_after_malformed_json(monkeypatch: pytest.MonkeyPatch) -> None:
    responses = iter(["not json", '{"evidence": []}'])
    prompts_seen: list[str] = []

    def fake_call_gemini(prompt: str, system: str, response_schema: dict) -> str:
        prompts_seen.append(prompt)
        return next(responses)

    monkeypatch.setattr(llm_client, "_call_gemini", fake_call_gemini)

    client = EnvLLMClient(provider="gemini")
    result = client.call_llm("Extract evidence.", "system prompt", {})

    assert result == {"evidence": []}
    assert prompts_seen[0] == "Extract evidence."
    assert llm_client._REFORMAT_INSTRUCTION in prompts_seen[1]


def test_call_llm_raises_after_two_malformed_responses(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        llm_client, "_call_gemini", lambda prompt, system, response_schema: "still not json"
    )

    client = EnvLLMClient(provider="gemini")

    with pytest.raises(LLMError):
        client.call_llm("Extract evidence.", "system prompt", {})


def test_call_llm_converts_provider_failures_into_a_safe_llm_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        llm_client,
        "_call_gemini",
        lambda prompt, system, response_schema: (_ for _ in ()).throw(
            RuntimeError("provider rejected secret-value")
        ),
    )

    with pytest.raises(LLMError, match="provider request failed") as error:
        EnvLLMClient(provider="gemini").call_llm("Extract evidence.", "system prompt", {})

    assert "secret-value" not in str(error.value)


def test_call_llm_raises_for_unsupported_provider() -> None:
    client = EnvLLMClient(provider="cerebras")

    with pytest.raises(LLMError, match="Supported providers are 'gemini', 'openai', and 'groq'"):
        client.call_llm("Extract evidence.", "system prompt", {})


def test_run_metadata_reports_selected_provider_and_model_without_a_credential(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "test-only-key")
    monkeypatch.setenv("GROQ_MODEL", "llama-test")

    metadata = EnvLLMClient(provider="groq").run_metadata()

    assert metadata == LLMRunMetadata(provider="groq", model="llama-test")
    assert "test-only-key" not in metadata.display_text


def test_load_local_environment_does_not_override_shell_value(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    dotenv_path = tmp_path / ".env"
    dotenv_path.write_text("GEMINI_API_KEY=dotenv-key\n", encoding="utf-8")
    monkeypatch.setenv("GEMINI_API_KEY", "shell-key")

    llm_client.load_local_environment(str(dotenv_path))

    assert os.environ["GEMINI_API_KEY"] == "shell-key"


def test_run_metadata_uses_gemini_default_for_a_blank_optional_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-only-key")
    monkeypatch.setenv("GEMINI_MODEL", "   ")

    metadata = EnvLLMClient(provider="gemini").run_metadata()

    assert metadata.model == "gemini-2.5-flash"


@pytest.mark.parametrize(
    ("provider", "key_variable", "model_variable", "model"),
    [
        ("gemini", "GEMINI_API_KEY", "GEMINI_MODEL", "gemini-test"),
        ("openai", "OPENAI_API_KEY", "OPENAI_MODEL", "openai-test"),
        ("groq", "GROQ_API_KEY", "GROQ_MODEL", "groq-test"),
    ],
)
def test_run_metadata_uses_only_the_explicitly_selected_provider_configuration(
    monkeypatch: pytest.MonkeyPatch,
    provider: str,
    key_variable: str,
    model_variable: str,
    model: str,
) -> None:
    monkeypatch.setenv(key_variable, "test-only-key")
    monkeypatch.setenv(model_variable, model)
    monkeypatch.setenv("OPENAI_API_KEY", "inactive-provider-key")

    metadata = EnvLLMClient(provider=provider).run_metadata()

    assert metadata == LLMRunMetadata(provider=provider, model=model)
    assert "inactive-provider-key" not in metadata.display_text


@pytest.mark.parametrize(
    ("provider", "key_variable", "model_variable"),
    [
        ("groq", "GROQ_API_KEY", "GROQ_MODEL"),
    ],
)
def test_run_metadata_rejects_blank_required_compatible_provider_settings(
    monkeypatch: pytest.MonkeyPatch,
    provider: str,
    key_variable: str,
    model_variable: str,
) -> None:
    monkeypatch.setenv(key_variable, "   ")
    monkeypatch.setenv(model_variable, "test-model")
    with pytest.raises(LLMError, match=key_variable):
        EnvLLMClient(provider=provider).run_metadata()

    monkeypatch.setenv(key_variable, "test-only-key")
    monkeypatch.setenv(model_variable, "   ")
    with pytest.raises(LLMError, match=model_variable):
        EnvLLMClient(provider=provider).run_metadata()


@pytest.mark.parametrize("provider", ["gemini", "openai"])
def test_call_llm_rejects_missing_provider_credential_before_a_network_call(
    monkeypatch: pytest.MonkeyPatch, provider: str
) -> None:
    credential_name = f"{provider.upper()}_API_KEY"
    monkeypatch.delenv(credential_name, raising=False)

    with pytest.raises(LLMError, match=credential_name):
        EnvLLMClient(provider=provider).call_llm("Extract evidence.", "system prompt", {})


@pytest.mark.parametrize("provider", ["gemini", "openai"])
def test_call_llm_rejects_blank_provider_credential(
    monkeypatch: pytest.MonkeyPatch, provider: str
) -> None:
    credential_name = f"{provider.upper()}_API_KEY"
    monkeypatch.setenv(credential_name, "   ")

    with pytest.raises(LLMError, match=credential_name):
        EnvLLMClient(provider=provider).call_llm("Extract evidence.", "system prompt", {})


def test_call_llm_retries_once_after_schema_invalid_data(monkeypatch: pytest.MonkeyPatch) -> None:
    """Valid JSON that violates the response schema is treated the same as malformed JSON."""
    missing_required_field = json.dumps({"evidence": [{"id": "E-01"}]})
    valid_response = json.dumps(
        {
            "evidence": [
                {"id": "E-01", "statement": "The door was locked.", "classification": "observed_fact"}
            ]
        }
    )
    responses = iter([missing_required_field, valid_response])
    prompts_seen: list[str] = []

    def fake_call_gemini(prompt: str, system: str, response_schema: dict) -> str:
        prompts_seen.append(prompt)
        return next(responses)

    monkeypatch.setattr(llm_client, "_call_gemini", fake_call_gemini)

    client = EnvLLMClient(provider="gemini")
    result = client.call_llm("Extract evidence.", "system prompt", _EVIDENCE_SCHEMA)

    assert result["evidence"][0]["id"] == "E-01"
    assert prompts_seen[0] == "Extract evidence."
    assert llm_client._REFORMAT_INSTRUCTION in prompts_seen[1]


def test_call_llm_raises_after_two_schema_invalid_responses(monkeypatch: pytest.MonkeyPatch) -> None:
    invalid_classification = json.dumps(
        {
            "evidence": [
                {"id": "E-01", "statement": "The door was locked.", "classification": "guess"}
            ]
        }
    )
    monkeypatch.setattr(
        llm_client, "_call_gemini", lambda prompt, system, response_schema: invalid_classification
    )

    client = EnvLLMClient(provider="gemini")

    with pytest.raises(LLMError, match="classification"):
        client.call_llm("Extract evidence.", "system prompt", _EVIDENCE_SCHEMA)


def test_call_llm_raises_when_required_field_missing_twice(monkeypatch: pytest.MonkeyPatch) -> None:
    missing_evidence_key = json.dumps({})
    monkeypatch.setattr(
        llm_client, "_call_gemini", lambda prompt, system, response_schema: missing_evidence_key
    )

    client = EnvLLMClient(provider="gemini")

    with pytest.raises(LLMError, match="evidence"):
        client.call_llm("Extract evidence.", "system prompt", _EVIDENCE_SCHEMA)


@pytest.mark.parametrize(
    ("provider", "key_variable", "model_variable", "base_url"),
    [
        ("groq", "GROQ_API_KEY", "GROQ_MODEL", "https://api.groq.com/openai/v1"),
    ],
)
def test_openai_compatible_provider_uses_its_fixed_endpoint_and_model(
    monkeypatch: pytest.MonkeyPatch,
    provider: str,
    key_variable: str,
    model_variable: str,
    base_url: str,
) -> None:
    client = FakeOpenAIClient(['{"evidence": []}'])
    created_clients: list[tuple[str, str]] = []
    monkeypatch.setenv(key_variable, "test-only-key")
    monkeypatch.setenv(model_variable, "test-model")
    monkeypatch.setattr(
        llm_client,
        "_create_openai_client",
        lambda api_key, endpoint: (created_clients.append((api_key, endpoint)) or client),
    )

    result = EnvLLMClient(provider=provider).call_llm(
        "Extract evidence.", "system prompt", _EVIDENCE_SCHEMA
    )

    assert result == {"evidence": []}
    assert created_clients == [("test-only-key", base_url)]
    assert client.calls[0]["model"] == "test-model"
    assert client.calls[0]["response_format"] == {"type": "json_object"}
    assert '"evidence"' in client.calls[0]["messages"][0]["content"]
    assert "Return only a JSON object matching this schema" in client.calls[0]["messages"][0]["content"]


@pytest.mark.parametrize(
    ("provider", "key_variable", "model_variable"),
    [
        ("groq", "GROQ_API_KEY", "GROQ_MODEL"),
    ],
)
def test_openai_compatible_provider_requires_a_nonblank_key_and_model(
    monkeypatch: pytest.MonkeyPatch,
    provider: str,
    key_variable: str,
    model_variable: str,
) -> None:
    monkeypatch.delenv(key_variable, raising=False)
    monkeypatch.delenv(model_variable, raising=False)

    with pytest.raises(LLMError, match=key_variable):
        EnvLLMClient(provider=provider).call_llm("Extract evidence.", "system prompt", {})

    monkeypatch.setenv(key_variable, "test-only-key")
    with pytest.raises(LLMError, match=model_variable):
        EnvLLMClient(provider=provider).call_llm("Extract evidence.", "system prompt", {})


@pytest.mark.parametrize("provider", ["groq"])
def test_openai_compatible_provider_retries_one_invalid_response(
    monkeypatch: pytest.MonkeyPatch, provider: str
) -> None:
    client = FakeOpenAIClient(["not json", '{"evidence": []}'])
    configuration = llm_client._OPENAI_COMPATIBLE_PROVIDERS[provider]
    monkeypatch.setenv(configuration.key_environment_variable, "test-only-key")
    monkeypatch.setenv(configuration.model_environment_variable, "test-model")
    monkeypatch.setattr(llm_client, "_create_openai_client", lambda api_key, endpoint: client)

    result = EnvLLMClient(provider=provider).call_llm(
        "Extract evidence.", "system prompt", _EVIDENCE_SCHEMA
    )

    assert result == {"evidence": []}
    assert len(client.calls) == 2
    assert llm_client._REFORMAT_INSTRUCTION in client.calls[1]["messages"][1]["content"]


@pytest.mark.parametrize("provider", ["groq"])
def test_openai_compatible_provider_raises_after_two_invalid_responses(
    monkeypatch: pytest.MonkeyPatch, provider: str
) -> None:
    client = FakeOpenAIClient(["not json", "still not json"])
    configuration = llm_client._OPENAI_COMPATIBLE_PROVIDERS[provider]
    monkeypatch.setenv(configuration.key_environment_variable, "test-only-key")
    monkeypatch.setenv(configuration.model_environment_variable, "test-model")
    monkeypatch.setattr(llm_client, "_create_openai_client", lambda api_key, endpoint: client)

    with pytest.raises(LLMError, match="not valid JSON"):
        EnvLLMClient(provider=provider).call_llm("Extract evidence.", "system prompt", {})

    assert len(client.calls) == 2
