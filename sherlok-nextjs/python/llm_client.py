"""Provider-agnostic LLM boundary.

Agent code depends only on the `LLMClient` protocol below and never imports
a provider SDK directly. `EnvLLMClient` is the only place that is allowed to
do so, selected explicitly for a run or by the `LLM_PROVIDER` environment
variable.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Protocol


class LLMError(RuntimeError):
    """Raised when the LLM boundary cannot produce a usable JSON response."""


@dataclass(frozen=True)
class LLMRunMetadata:
    """Non-secret configuration recorded for an investigation run."""

    provider: str
    model: str

    @property
    def display_text(self) -> str:
        return f"Provider: {self.provider}"


class LLMClient(Protocol):
    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        """Return a JSON-decoded response constrained to `response_schema`."""
        ...


_REFORMAT_INSTRUCTION = (
    "Your previous reply was not valid JSON matching the required schema. "
    "Reply again with only valid JSON matching the schema, and nothing else."
)

_SUPPORTED_PROVIDER_MESSAGE = (
    "Supported providers are 'gemini', 'openai', and 'groq'."
)

_DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
_PROVIDER_FAILURE_MESSAGE = (
    "LLM provider request failed. Check the selected provider credentials, model, and connectivity."
)

@dataclass(frozen=True)
class _OpenAICompatibleProvider:
    """Fixed configuration for one supported OpenAI-compatible provider."""

    display_name: str
    key_environment_variable: str
    model_environment_variable: str
    base_url: str


@dataclass(frozen=True)
class _OpenAIChatRequest:
    """The provider-neutral data needed for one OpenAI chat completion."""

    model: str
    prompt: str
    system: str
    response_schema: dict


_OPENAI_COMPATIBLE_PROVIDERS = {
    "groq": _OpenAICompatibleProvider(
        display_name="Groq",
        key_environment_variable="GROQ_API_KEY",
        model_environment_variable="GROQ_MODEL",
        base_url="https://api.groq.com/openai/v1",
    ),
}


class EnvLLMClient:
    """`LLMClient` that dispatches to an explicit provider or `LLM_PROVIDER`.

    Supported values: "gemini" (default), "openai", and "groq". Retries
    once with a stricter reformatting instruction when
    the response is malformed JSON or does not satisfy `response_schema`,
    then raises `LLMError` rather than fabricating or returning a result the
    caller cannot trust.
    """

    def __init__(self, provider: str | None = None) -> None:
        self._provider = provider or os.environ.get("LLM_PROVIDER", "gemini")

    def call_llm(self, prompt: str, system: str, response_schema: dict) -> dict:
        raw_text = self._call_provider(prompt, system, response_schema)
        try:
            return _parse_json_object(raw_text, response_schema)
        except LLMError:
            raw_text = self._call_provider(
                f"{prompt}\n\n{_REFORMAT_INSTRUCTION}", system, response_schema
            )
            return _parse_json_object(raw_text, response_schema)

    def run_metadata(self) -> LLMRunMetadata:
        """Validate selected configuration and return safe visible metadata."""
        if self._provider == "gemini":
            _required_api_key("GEMINI_API_KEY", "Gemini")
            return LLMRunMetadata("gemini", _optional_model("GEMINI_MODEL", _DEFAULT_GEMINI_MODEL))
        if self._provider == "openai":
            _required_api_key("OPENAI_API_KEY", "OpenAI")
            return LLMRunMetadata("openai", _optional_model("OPENAI_MODEL", "gpt-4o-mini"))
        compatible_provider = _OPENAI_COMPATIBLE_PROVIDERS.get(self._provider)
        if compatible_provider:
            _required_api_key(
                compatible_provider.key_environment_variable, compatible_provider.display_name
            )
            model = _required_model(
                compatible_provider.model_environment_variable, compatible_provider.display_name
            )
            return LLMRunMetadata(self._provider, model)
        raise LLMError(
            f"Unsupported LLM_PROVIDER: {self._provider!r}. {_SUPPORTED_PROVIDER_MESSAGE}"
        )

    def _call_provider(self, prompt: str, system: str, response_schema: dict) -> str:
        try:
            if self._provider == "gemini":
                return _call_gemini(prompt, system, response_schema)
            if self._provider == "openai":
                return _call_openai(prompt, system, response_schema)
            compatible_provider = _OPENAI_COMPATIBLE_PROVIDERS.get(self._provider)
            if compatible_provider:
                return _OpenAICompatibleAdapter(compatible_provider).call(
                    prompt, system, response_schema
                )
            raise LLMError(
                f"Unsupported LLM_PROVIDER: {self._provider!r}. "
                f"{_SUPPORTED_PROVIDER_MESSAGE}"
            )
        except LLMError:
            raise
        except Exception as error:
            raise LLMError(_PROVIDER_FAILURE_MESSAGE) from error


def _parse_json_object(raw_text: str, response_schema: dict) -> dict:
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as error:
        raise LLMError(f"LLM response was not valid JSON: {error}") from error
    if not isinstance(parsed, dict):
        raise LLMError("LLM response JSON was not an object.")
    _validate_schema(parsed, response_schema, "response")
    return parsed


_SCHEMA_TYPE_CHECKS = {
    "object": lambda value: isinstance(value, dict),
    "array": lambda value: isinstance(value, list),
    "string": lambda value: isinstance(value, str),
    "integer": lambda value: isinstance(value, int) and not isinstance(value, bool),
    "number": lambda value: isinstance(value, (int, float)) and not isinstance(value, bool),
    "boolean": lambda value: isinstance(value, bool),
}


def _validate_schema(value: object, schema: dict, path: str) -> None:
    """Raise `LLMError` describing the first mismatch between `value` and `schema`.

    Supports the subset of JSON Schema used by the agent response schemas:
    `type`, `enum`, `nullable`, `required`, `properties`, and `items`.
    """
    if value is None:
        if schema.get("nullable"):
            return
        raise LLMError(f"{path} must not be null.")

    enum_values = schema.get("enum")
    if enum_values is not None and value not in enum_values:
        raise LLMError(f"{path} must be one of {enum_values!r}, got {value!r}.")

    expected_type = schema.get("type")
    if expected_type is not None:
        type_check = _SCHEMA_TYPE_CHECKS.get(expected_type)
        if type_check is None or not type_check(value):
            raise LLMError(
                f"{path} must be of type {expected_type!r}, got {type(value).__name__!r}."
            )
        if expected_type == "object":
            _validate_object(value, schema, path)
        elif expected_type == "array":
            _validate_array(value, schema, path)


def _validate_object(value: dict, schema: dict, path: str) -> None:
    for required_key in schema.get("required", []):
        if required_key not in value:
            raise LLMError(f"{path} is missing required field {required_key!r}.")
    for key, item_schema in schema.get("properties", {}).items():
        if key in value:
            _validate_schema(value[key], item_schema, f"{path}.{key}")


def _validate_array(value: list, schema: dict, path: str) -> None:
    item_schema = schema.get("items")
    if item_schema is None:
        return
    for index, item in enumerate(value):
        _validate_schema(item, item_schema, f"{path}[{index}]")


def _call_gemini(prompt: str, system: str, response_schema: dict) -> str:
    api_key = _required_api_key("GEMINI_API_KEY", "Gemini")
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name=_optional_model("GEMINI_MODEL", _DEFAULT_GEMINI_MODEL),
        system_instruction=system,
    )
    response = model.generate_content(
        prompt,
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": response_schema,
        },
    )
    return response.text


def _call_openai(prompt: str, system: str, response_schema: dict) -> str:
    api_key = _required_api_key("OPENAI_API_KEY", "OpenAI")
    client = _create_openai_client(api_key, None)
    return _complete_openai_chat(
        client,
        _OpenAIChatRequest(
            model=_optional_model("OPENAI_MODEL", "gpt-4o-mini"),
            prompt=prompt,
            system=system,
            response_schema=response_schema,
        ),
    )


class _OpenAICompatibleAdapter:
    """Runs Groq through its fixed OpenAI-compatible endpoint."""

    def __init__(self, provider: _OpenAICompatibleProvider) -> None:
        self._provider = provider

    def call(self, prompt: str, system: str, response_schema: dict) -> str:
        api_key = _required_api_key(
            self._provider.key_environment_variable, self._provider.display_name
        )
        model = _required_model(
            self._provider.model_environment_variable, self._provider.display_name
        )
        client = _create_openai_client(api_key, self._provider.base_url)
        return _complete_openai_chat(
            client,
            _OpenAIChatRequest(
                model=model,
                prompt=prompt,
                system=system,
                response_schema=response_schema,
            ),
        )


def _complete_openai_chat(client: object, request: _OpenAIChatRequest) -> str:
    """Submit one JSON-mode completion and return its text response."""
    response = client.chat.completions.create(
        model=request.model,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": f"{request.system}\n\n{_schema_instruction(request.response_schema)}",
            },
            {"role": "user", "content": request.prompt},
        ],
    )
    return response.choices[0].message.content


def _schema_instruction(response_schema: dict) -> str:
    """Tell JSON-mode providers the exact object shape that validation expects."""
    schema = json.dumps(response_schema, separators=(",", ":"), sort_keys=True)
    return f"Return only a JSON object matching this schema: {schema}"


def _create_openai_client(api_key: str, base_url: str | None):
    """Create an OpenAI client for OpenAI or a fixed compatible endpoint."""
    from openai import OpenAI

    return OpenAI(api_key=api_key, base_url=base_url)


def load_local_environment(path: str | None = None) -> bool:
    """Load a local `.env` without replacing values supplied by the shell."""
    from dotenv import load_dotenv

    return load_dotenv(dotenv_path=path, override=False)


def _required_api_key(environment_variable: str, provider_name: str) -> str:
    """Return a non-blank provider key without ever exposing its value."""
    api_key = os.environ.get(environment_variable, "").strip()
    if not api_key:
        raise LLMError(
            f"{provider_name} configuration error: set {environment_variable} "
            "to a non-empty API key before starting an investigation."
        )
    return api_key


def _required_model(environment_variable: str, provider_name: str) -> str:
    """Return an explicit compatible-provider model name or a safe error."""
    model = os.environ.get(environment_variable, "").strip()
    if not model:
        raise LLMError(
            f"{provider_name} configuration error: set {environment_variable} "
            "to a non-empty model name before starting an investigation."
        )
    return model


def _optional_model(environment_variable: str, default_model: str) -> str:
    """Return a configured optional model or its documented default."""
    return os.environ.get(environment_variable, "").strip() or default_model
