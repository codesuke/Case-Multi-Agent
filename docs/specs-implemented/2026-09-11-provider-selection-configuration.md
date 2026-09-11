# Spec: Explicit LLM provider selection

> **Implementation status:** Shipped and superseded by the session-only UI
> configuration design. The completed implementation is recorded here for
> historical context; active provider work requires a new planned spec.
>
> **Current product note:** Cerebras support was removed after its live probe
> returned a billing/quota failure. Current provider selection supports Gemini,
> OpenAI, and Groq only; the Cerebras references below describe the historical
> implementation.

## Problem Statement

A learner may have valid API keys for Gemini, OpenAI, Groq, and Cerebras but
cannot tell which provider will run an investigation, which model it will use,
or how to switch without risking a key leak or unexpected cost.

## Solution

The application uses one explicit `LLM_PROVIDER` setting to choose Gemini,
OpenAI, Groq, or Cerebras for an investigation. Each provider has its own
environment-variable key and model setting. The selected provider is the only
provider called. A missing or invalid selected-provider configuration produces
a visible safe error before the Evidence Collector runs.

## User Stories

1. As a learner, I want to choose Gemini, so that I can use my Gemini account.
2. As a learner, I want to choose OpenAI, so that I can use my OpenAI account.
3. As a learner, I want to choose Groq, so that I can use a free-tier option.
4. As a learner, I want to choose Cerebras, so that I can use a free-tier option.
5. As a learner, I want one active provider at a time, so that I know which
   account receives the investigation request.
6. As a learner, I want to store all four keys locally, so that switching
   provider does not require re-entering credentials.
7. As a learner, I want to select a model for each provider, so that I can
   balance investigation quality, latency, and cost.
8. As a learner, I want a selected provider with no key to fail clearly, so
   that I can correct the right local configuration.
9. As a learner, I want an unsupported provider value to be rejected, so that
   the app never silently uses a different provider.
10. As a learner, I want the live transcript to identify a configuration
    failure without exposing a key, so that I can troubleshoot safely.
11. As a developer, I want every detective agent to keep using the same LLM
    interface, so that provider selection cannot alter case-file behavior.
12. As a developer, I want malformed structured output to retain the existing
    one-retry rule for every provider, so that evidence and claims remain safe.
13. As a developer, I want tests to run without keys or network access, so
    that free-tier quotas never affect deterministic verification.
14. As a facilitator, I want the selected provider and model recorded in the
    visible run metadata without credential values, so that a learner can
    explain the demonstration setup.

## Implementation Decisions

- Provider selection is configuration-based, using one required provider name:
  `gemini`, `openai`, `groq`, or `cerebras`. Gemini remains the default when
  no provider is set.
- Selection happens at the existing environment-backed LLM module. Its public
  `call_llm` interface does not change. Agent modules, CaseFile schemas,
  evidence collection, analysis, Skeptic review, revision rounds, verdicts,
  and human decisions stay provider-agnostic.
- A provider is never chosen by key availability, model availability, cost, or
  automatic fallback. The configured provider is called or the investigation
  stops with a visible error.
- Each provider reads only its own key and model setting. The accepted
  configuration is: `GEMINI_API_KEY` and optional `GEMINI_MODEL`;
  `OPENAI_API_KEY` and optional `OPENAI_MODEL`; `GROQ_API_KEY` and required
  `GROQ_MODEL`; `CEREBRAS_API_KEY` and required `CEREBRAS_MODEL`.
- The local `.env` file is ignored by Git and may contain all four keys. It
  sets one active provider. A tracked `.env.example` documents blank
  placeholders and safe model examples only.
- The application does not load `.env` implicitly in this slice. The launch
  guide explains loading it into the process environment before Gradio starts.
- Configuration errors name the provider and missing variable but never show a
  credential value, raw provider response, or traceback.
- The UI exposes selected provider and model as safe run metadata. It does not
  render, persist, or accept API keys through Gradio controls.
- Provider-native JSON modes remain an optimization only. The shared LLM
  module remains the authority for JSON parsing, schema validation, one retry,
  and the safe failure returned to the investigation pipeline.

## Testing Decisions

- Test selection at `EnvLLMClient.call_llm`, the highest existing provider
  seam. Mock each provider transport and exercise observable completion or
  configuration-failure behavior.
- Use the public streamed investigation pipeline to prove that a provider
  configuration failure produces a visible error and prevents downstream
  detective work.
- Test every supported provider's explicit selection, model selection,
  missing/blank key, model requirement, unsupported value, JSON retry, and
  second-failure behavior.
- Test that inactive-provider keys are neither required nor used.
- Test UI metadata and transcript text without asserting secret values,
  prompts, SDK calls, or private adapter classes.
- Follow the existing mocked LLM-boundary and deterministic pipeline tests.
  No test may load `.env`, make a network call, or use a real credential.

## Out of Scope

- Automatic cheapest-provider routing, failover, load balancing, or provider
  comparison during an investigation.
- Entering, saving, or rotating credentials in Gradio.
- Deployment secret management, user accounts, billing, quotas, or usage
  dashboards.
- Adding OpenRouter, Mistral, Hugging Face, Together, or arbitrary endpoints.
- Changing the CaseFile, evidence IDs, claim citations, revision-round limit,
  verdict behavior, or human decision workflow.

## Further Notes

- Add keys only in ignored local configuration. If a key reaches a chat,
  commit, issue, screenshot, or recording, revoke it in the provider console.
- Use `set -a; source .env; set +a` before starting the app until a deliberate
  local configuration loader is introduced.
- Official key locations: [Google AI Studio](https://aistudio.google.com/app/apikey),
  [OpenAI API keys](https://platform.openai.com/api-keys),
  [Groq Console](https://console.groq.com/keys), and
  [Cerebras API keys](https://cloud.cerebras.ai/platform/). Free-tier limits
  and available models can change.
