# Spec: OpenAI-compatible free-provider adapter

## Problem Statement

The application supports Gemini and OpenAI only. Learners who have a free
Groq key cannot use it. Adding provider calls to agents would
break the provider-neutral design and duplicate validation and retry behavior.

## Solution

Extend `EnvLLMClient` so `LLM_PROVIDER=groq` selects an OpenAI-compatible
adapter. The adapter keeps the existing
`LLMClient.call_llm(prompt, system, response_schema) -> dict` interface.
Agents do not change. The shared LLM module continues to validate output,
retry malformed or schema-invalid output once, and raise a safe `LLMError`
after the second invalid response.

## User Stories

1. As a learner, I want to select Groq with an environment
   variable, so that I can run the fictional investigation with a free-tier
   key.
2. As a learner, I want a clear error when configuration is missing or wrong,
   so that I can fix setup without seeing a secret or provider traceback.
3. As a developer, I want all provider behavior behind the existing LLM
   interface, so that agents remain provider-agnostic and offline tests keep
   using mocks.

## Implementation Decisions

- Decision: Extend only `llm_client.py` and its tests for provider dispatch.
  - Rationale: It is the existing seam for credentials and concrete SDKs.
- Decision: Add one private OpenAI-compatible adapter for Groq. Configure it
  through a fixed provider registry, not a user-supplied base URL.
  - Rationale: One deep module centralizes endpoint, key-name, default-model,
    and configuration-error behavior. A fixed registry avoids an accidental
    arbitrary-endpoint feature.
- Decision: Preserve local JSON-schema validation and the exact one-retry rule.
  - Rationale: Provider-native JSON modes vary. Local validation is the
    case-agnostic contract that protects all agent outputs.
- Decision: Use the OpenAI Python client only inside `llm_client.py`, with
  Groq's documented base URL.
  - Rationale: Groq exposes an OpenAI-compatible chat-completions endpoint;
    this prevents provider SDK imports from spreading.
- Decision: Require explicit model environment variables for new providers;
  optional documented defaults may be added only after a live compatibility
  check is recorded.
  - Rationale: Free-tier model availability changes frequently. Explicit model
    selection avoids silently choosing an unavailable model.

## Provider Configuration

| Provider | Select with | Required secret | Model setting | Base URL |
| --- | --- | --- | --- | --- |
| Groq | `LLM_PROVIDER=groq` | `GROQ_API_KEY` | `GROQ_MODEL` | `https://api.groq.com/openai/v1` |

Configuration errors must name the missing variable and provider, but never
include any environment-variable value. Credentials remain in ignored local
configuration and are never added to fixtures, code, logs, or GitHub issues.

## Key-generation Guide

1. Create an account in the provider's own console.
2. Create an API key there. Copy it once into the ignored local `.env` file.
3. Set the matching `LLM_PROVIDER`, key, and model variables from the table.
4. Load `.env` into the shell (`set -a; source .env; set +a`) before launching
   the app. The project does not load `.env` itself today.
5. If a key is pasted into a chat, terminal recording, commit, or issue,
   revoke it in the provider console and generate a replacement.

Official account and API-key entry points:

- [Groq Console](https://console.groq.com) and [Groq overview](https://console.groq.com/docs/overview)

Free tiers are quota-limited and can change. They are for local learning and
manual demos, never for test execution or a promised production service level.

## Testing Decisions

- Test through `EnvLLMClient.call_llm` as the highest useful seam.
- Mock the OpenAI client transport. Do not use real keys or network calls.
- Verify endpoint, key lookup, model selection, valid structured response,
  invalid-then-valid retry, invalid-twice failure, and safe missing-key errors
  for Groq.
- Run the deterministic investigation pipeline with mocked Groq transport to
  prove agents remain unchanged.

## Dependencies

- Resolve the conflicted integration in #15 before changing the shared LLM
  module.
- Complete #17's local configuration safety and documentation work first, or
  implement both changes together after reconciling their acceptance criteria.

## Out of Scope

- OpenRouter, Mistral, Hugging Face, Together, or arbitrary custom endpoints.
- A `.env` loader, deployment secret manager, account provisioning, billing,
  or automatic model discovery.
- Changing agent prompts, schemas, orchestration, or UI behavior.

## Further Notes

- Groq documents a free plan and an OpenAI-compatible endpoint, including
  strict JSON Schema support for selected models.
- See `docs/qna/2026-09-11-free-llm-api-provider-options.md` for the
  source-backed provider comparison and current quota caveats.
