# Spec: Environment-Backed Provider Selector

## Problem Statement

The current Gradio provider panel asks a learner to enter API keys and model
names in the browser. This duplicates local configuration, creates competing
precedence rules, and makes provider setup harder to understand.

The learner wants local `.env` and shell configuration to remain the only
place that holds credentials and model choices. They only want to choose which
already configured provider runs an investigation.

## Solution

Keep credentials and model settings in the local environment. The Gradio UI
shows one provider dropdown and no other provider configuration controls.

Selecting a provider changes only the provider used for the next
investigation or re-investigation. It does not write to `.env`, mutate process
environment variables, expose a credential, or override a model.

The selected provider reads only its own existing environment-backed key and
model configuration. A missing or invalid configuration stops before evidence
collection with a safe error that names the required setting but never reveals
its value.

## User Stories

1. As a learner, I want to select Gemini, OpenAI, or Groq in the UI, so that
   I can switch among my locally configured providers.
2. As a learner, I want keys and model names to stay in `.env` or my shell,
   so that the browser never receives or displays them.
3. As a learner, I want a provider selection to affect re-investigation too,
   so that I can deliberately change providers for a new pass.
4. As a learner, I want an unavailable selected provider to fail safely,
   so that I can repair local configuration without exposing a secret.
5. As a developer, I want agents to retain the existing provider-neutral LLM
   interface, so that provider selection stays outside detective behavior.

## Interface and Seams

The Gradio provider dropdown is the sole user-facing provider interface. Its
allowed values are `gemini`, `openai`, and `groq`.

`EnvLLMClient(provider=selected_provider)` is the configuration seam. The UI
passes only the selected provider to that module. The module resolves keys and
models from the already loaded local environment and validates the selected
provider before the Evidence Collector starts.

This is a deep module: the UI has one non-secret value to manage while the LLM
module retains provider adapters, model defaults, credential lookup, schema
validation, and safe errors.

## Configuration Rules

Load local `.env` once at app startup without replacing a shell value. Do not
write `.env` from the application.

The UI-selected provider takes precedence over `LLM_PROVIDER` for that run.
The key and model always come from the environment for the selected provider.
Shell values continue to take precedence over values loaded from `.env`.

| Provider | Key variable | Model variable | Model rule |
| --- | --- | --- | --- |
| Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` | Optional; application default applies. |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` | Optional; application default applies. |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` | Required. |

The dropdown initially reflects `LLM_PROVIDER` when it is supported; otherwise
it defaults to Gemini. A user selection exists only in current Gradio state.
It is not stored in a case file, transcript, browser storage, or `.env`.

## Implementation Decisions

- Decision: Remove the API-key textbox, model textbox, provider help text,
  session configuration status, and all session credential/model state.
  - Rationale: Keys and models have one durable configuration mechanism.
- Decision: Keep only the supported-provider dropdown in the UI.
  - Rationale: It is the one configuration choice the learner needs at run
    time.
- Decision: Build an `EnvLLMClient` with the selected provider and no UI
  key/model overrides.
  - Rationale: The existing LLM seam already owns environment resolution and
    safe provider errors.
- Decision: Pass the current selected provider into a re-investigation.
  - Rationale: A re-investigation is a new run and should respect the visible
    selection without retaining secrets on the case file.
- Decision: Keep the selected provider in safe run metadata only.
  - Rationale: The transcript can identify the adapter without recording a
    credential or model value.

## Acceptance Criteria

- [ ] The UI contains one provider dropdown with Gemini, OpenAI, and Groq.
- [ ] The UI contains no API-key input, model input, provider help text, or
  session-only credential/model configuration state.
- [ ] Selecting a provider starts the next investigation with that provider
  and environment-backed settings only.
- [ ] The selected provider is also used for a requested re-investigation.
- [ ] `.env` and shell values are never displayed, changed, or copied into a
  case file, transcript, or Gradio state.
- [ ] A missing selected-provider key or required model yields a visible safe
  failure before evidence collection.
- [ ] The LLM client public interface and every agent module remain unchanged.
- [ ] Existing provider-specific model defaults remain in the LLM module.

## Testing Decisions

Test public behavior through these seams with mocked transport and no real
credentials or network calls:

1. `EnvLLMClient(provider=...)`: each selected provider uses its matching
   environment configuration and rejects a missing required value safely.
2. `build_interface()`: the provider dropdown exists and credential/model UI
   controls do not exist.
3. `run_investigation(...)` and `run_reinvestigation(...)`: the selected
   provider reaches the public pipeline while agent interfaces do not change.
4. Transcript and case-file rendering: a test-only credential/model marker
   never appears.

## Dependencies

- The existing local `.env` loader must continue to load before interface
  construction.
- `EnvLLMClient` must continue to support explicit provider selection.
- The planned work depends on the current provider adapters for Gemini,
  OpenAI, and Groq; it does not add an adapter.

## Implementation Slices

1. Remove session key/model controls and simplify Gradio provider state to one
   selected provider. Cover the rendered interface.
2. Route the selected provider into new investigations and re-investigations.
   Cover provider selection at both public pipeline seams.
3. Remove obsolete session-override behavior and tests. Update README,
   Architecture, `.env.example`, and the provider configuration guidance.

## Out of Scope

- Editing `.env` through the UI.
- Displaying, storing, rotating, validating, or testing a credential in the
  browser.
- Choosing a model in the UI.
- Automatic provider fallback, routing, model discovery, billing checks, or
  arbitrary endpoints.
- Changes to agent prompts, case material, evidence citations, orchestration,
  verdicts, or human review.

## Further Notes

- A provider selector is not a secret-management feature. The learner edits
  `.env` or shell configuration before launching Sherlok.
