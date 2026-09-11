# Free LLM API-provider options

> **Historical research note:** Cerebras was evaluated but is no longer a
> supported provider after its live probe returned a billing/quota failure.
> The current application supports Gemini, OpenAI, and Groq only.

## Question

Which API-key providers can support this structured-JSON detective demo at no
cost (or with a clearly limited free allowance), and which are practical to
add behind the existing provider-agnostic LLM boundary?

## Answer

**Cerebras and Groq are the strongest free-provider candidates for development
and classroom demos.** Cerebras documents a $0 Free tier and a free API key;
Groq documents a Free plan, an OpenAI-compatible endpoint, and strict JSON
Schema output on the `openai/gpt-oss-20b` and `openai/gpt-oss-120b` models.
Both are quota-limited, so neither should be presented as a production
guarantee. Start by testing Cerebras with a representative full investigation,
then use Groq where its strict-schema model support is valuable.

**OpenRouter is the easiest no-cost experimentation fallback.** It has free
models and a small new-user allowance, but the documented unpaid limit is 50
free-model requests per day and free-model availability/routing can vary. Use
it for manual exploration, not for deterministic evaluations or a promised
service level.

Hugging Face gives every free user **$0.10 per month**, which is useful only
for a smoke test. Together AI currently requires a **minimum $5 credit
purchase** and says it has no free trial. Mistral's Free mode is its documented
default: it can be used without a payment card, but the included usage and
limits are account-specific and shown in the console rather than published as
a fixed quota. Treat it as a viable third option, not a guaranteed allowance.

## Compatibility with this project

The current `EnvLLMClient` implements only `gemini` and `openai`; setting a
new provider name today raises an unsupported-provider error. Each option
below therefore requires a small adapter in `llm_client.py`, tests using mocked
responses, and documentation before it is offered in the UI. Agent modules
must continue to use `LLMClient`, not a provider SDK.

| Provider | Officially documented no-cost access | Adapter fit | Structured JSON | Recommendation |
| --- | --- | --- | --- | --- |
| Cerebras | $0 Free tier and free API key documented | OpenAI client; `https://api.cerebras.ai/v1` | OpenAI compatibility documented; verify capability for selected model | **Test first** for a free agent-chain demo. |
| Groq | Free plan with published per-model limits | OpenAI client; `https://api.groq.com/openai/v1` | Strict JSON Schema on the two GPT-OSS models documented by Groq | **Add next** for free development/demo use. |
| OpenRouter | Small new-user allowance; free models (`:free`) | OpenAI-compatible `/chat/completions` | Depends on selected model; keep local validation/retry | **Add second** as an explicitly best-effort experimental option. |
| Hugging Face Inference Providers | $0.10/month for free users, subject to change | OpenAI-compatible router is documented | Per model/provider; inspect metadata | Not worthwhile as the primary demo provider. |
| Together AI | **No**: requires $5 minimum credit purchase; no free trial | OpenAI-compatible chat completions | JSON Schema documented | Good paid option, not an answer to free keys. |
| Mistral | Free mode; included allowance and limits are account-specific | OpenAI-compatible endpoint documented | Keep project's validation/retry | Good third free/demo option; inspect the console limit before use. |

## Evidence

- [Groq rate limits](https://console.groq.com/docs/rate-limits) documents a
  Free Plan and its per-model limits. [Groq overview](https://console.groq.com/docs/overview)
  gives the OpenAI-compatible base URL and Python client example. [Groq
  Structured Outputs](https://console.groq.com/docs/structured-outputs)
  documents strict JSON Schema support and its currently supported models.
- [OpenRouter FAQ](https://openrouter.ai/docs/faq) documents the small
  new-user allowance, the unpaid 50-request/day free-model limit, and its
  OpenAI API endpoints. [Free variants](https://openrouter.ai/docs/guides/routing/model-variants/free)
  documents the `:free` model suffix.
- [Cerebras pricing](https://inference-docs.cerebras.ai/support/pricing)
  documents its $0 Free tier, free API key and free-tier context constraint.
  [Cerebras OpenAI compatibility](https://inference-docs.cerebras.ai/resources/openai)
  documents the OpenAI client configuration and base URL.
- [Hugging Face Inference Providers pricing](https://huggingface.co/docs/inference-providers/pricing)
  documents $0.10/month for free users, subject to change. [Its Hub API
  documentation](https://huggingface.co/docs/inference-providers/hub-api)
  documents an OpenAI-compatible endpoint and `is_free` metadata (which it
  notes can reflect a temporary promotion).
- [Together AI credits](https://docs.together.ai/docs/billing-credits) says
  there is no free trial and access requires at least $5 in credits. [Together
  OpenAI compatibility](https://docs.together.ai/docs/inference/openai-compatibility)
  and [structured outputs](https://docs.together.ai/docs/inference/chat/structured-outputs)
  document its technical fit if paid access is desired.
- [Mistral's API-key quickstart](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key)
  documents Free mode as the default and that it can be used without a payment
  card. [Mistral usage limits](https://docs.mistral.ai/admin/billing-usage/usage-limits)
  documents that the applicable limits are shown in the console. [Mistral
  migration guidance](https://docs.mistral.ai/resources/migration-guides)
  documents its OpenAI-compatible endpoint.

## Guardrails

- Do not commit a provider key or put one in test fixtures. Add a placeholder
  only to an ignored local `.env` file and obtain the key in the provider's
  own console.
- Keep all tests offline and mocked. Free tiers are unsuitable for test
  execution because quotas and model availability are external state.
- Recheck the linked pricing and rate-limit pages immediately before adopting
  a provider: offers, model lists, and quotas are changeable.
