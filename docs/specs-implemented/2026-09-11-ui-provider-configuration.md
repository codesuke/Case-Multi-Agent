# Spec: UI Provider Configuration

> **Implementation status:** Shipped in the session provider configuration
> slice. This specification is retained as a historical record; active
> provider work requires a new planned spec.
>
> **Current product note:** Cerebras support was removed after its live probe
> returned a billing/quota failure. Current provider selection supports Gemini,
> OpenAI, and Groq only; the Cerebras references below describe the historical
> implementation.

## Problem Statement

A learner must edit shell variables before every investigation to select an
LLM provider. They cannot see which provider the Gradio app will use. They
also cannot try a different supported key without changing their terminal or
local `.env` file.

## Solution

Add an **LLM provider** section to the Gradio interface. A learner selects one
supported provider, enters an API key and model for the current browser
session, then starts an investigation. The section works with local `.env`
and shell configuration.

The supported providers are OpenAI, Gemini, Cerebras, and Groq. The section
does not accept arbitrary provider names or endpoints.

The UI key is a session-only override. It is never written to `.env`, a case
file, a transcript, logs, or Git. This keeps secret persistence deliberate and
local to the learner.

## User Stories

1. As a learner, I want to select Gemini in the UI, so that I can use its
   configured adapter without editing application code.
2. As a learner, I want to select OpenAI in the UI, so that I can use its
   configured adapter without editing application code.
3. As a learner, I want to select Groq in the UI, so that I can use its fixed
   compatible adapter without editing application code.
4. As a learner, I want to select Cerebras in the UI, so that I can use its
   fixed compatible adapter without editing application code.
5. As a learner, I want a masked API-key field, so that a person beside me
   cannot read the key while I type it.
6. As a learner, I want to enter a key for only this browser session, so that
   I can try a provider without changing my durable local configuration.
7. As a learner, I want to enter a model name when a provider needs one, so
   that I can select a model supported by my account.
8. As a learner, I want provider-specific help text, so that I know which
   key and model variables the selected adapter uses.
9. As a learner, I want the app to use my shell configuration when I leave a
   UI field blank, so that shell setup remains the highest durable source.
10. As a learner, I want the app to use my local `.env` configuration when a
    shell value and UI value are both absent, so that I can keep setup local.
11. As a learner, I want a non-secret configuration status message, so that I
    can tell whether local configuration is available without seeing its value.
12. As a learner, I want a safe, clear error before an investigation begins,
    so that I can correct a missing key or model without seeing a traceback.
13. As a learner, I want changing a provider to clear visible credentials, so
    that a key is not accidentally sent to a different provider.
14. As a learner, I want the same configuration to apply to a re-investigation,
    so that the revised pass uses the provider I selected for the case.
15. As a learner, I want to know that a UI key is not saved to `.env`, a case
    file, or Git, so that I control durable secret storage.
16. As a developer, I want agents to keep using the same provider-neutral LLM
    interface, so that provider selection does not change investigation logic.
17. As a developer, I want offline tests at the existing LLM and Gradio seams,
    so that configuration behavior does not consume quota or expose keys.

## Interface and Seams

The Gradio provider section is the user-facing interface. It contains:

- a provider dropdown with `gemini`, `openai`, `groq`, and `cerebras`;
- a masked API-key textbox;
- a model textbox;
- provider-specific help text that names the matching environment variables;
- a non-secret configuration status message.

`EnvLLMClient` remains the configuration seam between the UI and all agents.
The public `LLMClient.call_llm(prompt, system, response_schema) -> dict`
interface does not change. Agent modules and the orchestrator receive the same
provider-neutral client interface they use today.

Add an internal, typed runtime configuration value to `llm_client.py`. It
contains provider, optional session key, and optional session model. It hides
precedence and validation behind `EnvLLMClient` so the Gradio callback stays
thin. This is a deep module: callers select a provider and supply optional
overrides; the module resolves fields, validates them, and creates the correct
adapter.

## Configuration Rules

Load a local `.env` file at application startup with a safe loader that does
not override shell environment variables. Add `.env.example` with variable
names and empty values only. Keep `.env` ignored by Git.

For each investigation, resolve each setting in this order:

1. A non-blank value entered in the UI for this browser session.
2. A shell environment variable.
3. A value loaded from local `.env`.

The UI must not prefill or display a value read from the environment. It may
say that the selected provider is configured through local environment
settings, without revealing the value.

| Provider | Key variable | Model variable | Model rule |
| --- | --- | --- | --- |
| Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` | Optional; existing default applies. |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` | Optional; existing default applies. |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` | Required. |
| Cerebras | `CEREBRAS_API_KEY` | `CEREBRAS_MODEL` | Required. |

Changing the provider updates labels and help text. It clears only the visible
key and model fields; it does not modify environment settings or a prior case
file. A key is required only when neither the UI nor local configuration
provides one. A model is required for Groq and Cerebras only when neither the
UI nor local configuration provides one.

## Implementation Decisions

- Decision: Use a fixed dropdown for the four supported providers.
  - Rationale: The LLM module has fixed adapters and fixed endpoint rules.
    A free-text provider field would create an unsupported arbitrary-endpoint
    feature.
- Decision: Keep UI-entered keys in Gradio session state only.
  - Rationale: A shared process must not mutate `os.environ` for one browser
    session. That could expose one learner's key to another session.
- Decision: Load `.env` only at application startup and never write it from
  the UI.
  - Rationale: The learner controls durable secret storage. Automatic writes
    would create an unexpected persistence and secret-management feature.
- Decision: Pass typed runtime configuration into `EnvLLMClient`.
  - Rationale: This preserves the existing agent-facing interface and puts
    provider validation, precedence, and safe errors in one module.
- Decision: Disable Start until the selected configuration is valid, and also
  validate again at the LLM boundary.
  - Rationale: The UI gives immediate feedback, while the LLM boundary stays
    safe for non-UI callers and direct tests.

## Acceptance Criteria

- [ ] The Gradio interface shows a provider dropdown, masked API-key input,
  model input, provider help text, and a configuration status message.
- [ ] The dropdown contains only Gemini, OpenAI, Cerebras, and Groq.
- [ ] A UI key or model overrides the corresponding shell or `.env` setting
  for only the current browser session.
- [ ] Shell values override values loaded from `.env`.
- [ ] Blank UI fields use configured shell or `.env` values without displaying
  them in the UI.
- [ ] Gemini and OpenAI retain their optional-model behavior.
- [ ] Groq and Cerebras require a non-blank key and model from either the UI
  or local configuration.
- [ ] Invalid configuration produces a safe, actionable UI message and does
  not start an investigation or reveal a traceback.
- [ ] No API key or model secret appears in a transcript, case file, rendered
  panel, log, test assertion output, or committed file.
- [ ] `.env.example` contains no values, `.env` is ignored, and the app loads
  `.env` without overriding shell values.
- [ ] The public `LLMClient` interface and all agent code remain unchanged.

## Testing Decisions

Test the following public seams with mocked LLM transport and no real keys or
network calls:

1. `EnvLLMClient` configuration resolution: UI override, shell-over-`.env`
   precedence, required Groq/Cerebras models, and safe errors.
2. The Gradio provider section: provider labels, masked key input, field
   clearing on provider changes, status messages, and a valid Start flow.
3. The public investigation pipeline: each supported provider runs with a
   typed runtime configuration and mocked transport, with no agent change.

Add a regression test that scans rendered transcript and case-file values for
the test-only key marker. It must never appear.

## Implementation Slices

1. Add the typed runtime configuration module behavior and `.env` startup
   loader. Cover precedence and secret-safe errors at the LLM seam.
2. Add the Gradio provider section and session-only state. Cover validation
   and secret-safe rendering.
3. Connect the selected configuration to new and re-investigation runs. Cover
   all four mocked adapters through the public pipeline.
4. Add `.env.example`, README instructions, and a short update to the
   architecture guide.

## Out of Scope

- Arbitrary provider names, base URLs, models discovered from a remote API, or
  custom endpoint fields.
- Writing keys to `.env`, a browser's persistent storage, a database, or any
  remote secret manager.
- Deployment configuration, account provisioning, billing, or quota tracking.
- Changing agent prompts, evidence rules, orchestration order, or verdict
  review behavior.

## Further Notes

- The app currently supports the four providers named in this specification.
  New providers require a separate adapter specification and implementation
  slice.
- `.env` is a local convenience file. If a key is exposed, revoke it through
  the provider console and create a replacement.
