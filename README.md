<p align="center">
  <img src="assets/sherlok-logo-minimal.png" width="180" alt="Sherlok logo — a detective holding a magnifying glass" />
</p>

<h1 align="center">Sherlok</h1>

<p align="center">
  A beginner-friendly multi-agent AI project that turns fictional mysteries
  into evidence-based investigation proposals for human review.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-delivered-16A34A?style=for-the-badge" alt="Status: delivered demonstration" />
  <img src="https://img.shields.io/badge/orchestration-Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python orchestration" />
  <img src="https://img.shields.io/badge/interface-Gradio-F97316?style=for-the-badge" alt="Gradio interface" />
</p>

<p align="center">
  <a href="#the-idea">The idea</a> ·
  <a href="#delivered-experience">Experience</a> ·
  <a href="#design-principles">Principles</a> ·
  <a href="#repository-guide">Docs</a>
</p>

> **Project status:** The deterministic Sherlok demonstration
> is implemented and covered by its full test suite. Live provider calls are
> optional manual checks that require a learner-supplied credential.

Most AI assistants can give an answer; this project is about showing the work
behind one. A team of focused detective agents will extract evidence, inspect
suspects and timelines, challenge unsupported reasoning, and prepare a
cited verdict that a human must explicitly review.

## The idea

Complex mysteries invite confident guesses: clues conflict, timelines have
gaps, and a plausible story can be mistaken for a proven one. Instead of
asking one model to solve everything, this project separates the investigation
into accountable roles.

```text
Mystery text
    |
    v
Evidence Collector
    |
    +----------------------------+
    |                            |
    v                            v
Suspect Analyst          Timeline Reconciler
    |                            |
    +-------------+--------------+
                  v
          Skeptic / Challenger
                  |
          one bounded revision
                  v
            Lead Detective
                  |
                  v
       Human: Accept / Reject / Re-investigate
```

Every downstream claim is intended to cite the evidence IDs that support it.
The final verdict is a proposal, never an automatic decision.

## Delivered experience

The Gradio interface lets a user paste fictional mystery text or add PDF, DOCX,
Markdown, and plain-text case materials, inspect their normalized source-preserving case
file, and follow the investigation as each role completes. It shows:

- a structured, ID-tagged evidence list;
- normalized source material and safe extraction notices;
- motive and opportunity analysis for each suspect;
- timeline gaps and contradictions;
- a Skeptic's challenges to weak or uncited claims;
- a ranked final verdict with evidence citations and a confidence score; and
- human review controls to accept, reject, or request re-investigation with a
  note.

## Design principles

| Principle | What it means here |
| --- | --- |
| Evidence first | Nothing downstream analyzes the raw mystery before evidence is structured. |
| Clear roles | Each agent has one responsibility and an isolated part of the case file to update. |
| Productive skepticism | The Skeptic can request one revision per flagged agent, preventing endless loops. |
| Honest failure | Invalid LLM JSON gets one retry; a second failure is shown instead of being fabricated around. |
| Human authority | A verdict is reviewed by a person rather than self-certified by the system. |
| Provider flexibility | Agent code will depend on one LLM interface, keeping Gemini/GPT selection behind configuration. |

## Technology

- **Orchestration:** Python
- **Interface:** Gradio
- **Model access:** provider-agnostic LLM wrapper
- **Quality approach:** deterministic mocked unit tests plus an
  evidence-citation integration test

## Local setup

From a Bash-compatible terminal (macOS, Linux, WSL, or Git Bash), run one
setup command. It creates or reuses `.venv` and installs every requirement:

```bash
./scripts/setup.sh
```

On Windows Command Prompt, use the matching batch script instead:

```bat
scripts\setup.bat
```

PowerShell users can run `./scripts/setup.bat`. Both setup scripts create or
reuse `.venv` and install the same requirements.

When launched by double-click, the Windows batch scripts print the result and
a visible completion message before returning control to the terminal.

Then set credentials in your shell or ignored local `.env` file and launch
the app with one command. Gemini is the default provider:

```bash
export GEMINI_API_KEY="your-key"
# Optional: export GEMINI_MODEL="gemini-2.5-flash"
./scripts/run.sh
```

In Windows Command Prompt, the equivalent is:

```bat
set GEMINI_API_KEY=your-key
scripts\run.bat
```

In PowerShell, use `$env:GEMINI_API_KEY = "your-key"` before running
`./scripts/run.bat`. You can also copy `.env.example` to `.env`, fill in one
provider's settings, and use `scripts\run.bat`; the app loads that ignored
local file automatically.

To use OpenAI instead, select it explicitly and provide its key:

```bash
export LLM_PROVIDER="openai"
export OPENAI_API_KEY="your-key"
# Optional: export OPENAI_MODEL="gpt-4o-mini"
./scripts/run.sh
```

Groq uses an OpenAI-compatible API but requires an explicit model name because
free-tier availability changes. Create a key through the
[Groq Console](https://console.groq.com), then select it:

```bash
export LLM_PROVIDER="groq"
export GROQ_API_KEY="your-key"
export GROQ_MODEL="your-supported-model"
./scripts/run.sh
```

Groq's free tier is limited and may change; use it for local learning or
manual demos, never test execution or a guaranteed service level.

Never commit API keys, including in a `.env` file. The app's **LLM provider
configuration** section lets you choose Gemini, OpenAI, or Groq and
enter a masked key for the current browser session. A configured environment
value takes precedence; the session value is used only when that setting is
absent, and is never saved.

The app automatically loads an ignored local `.env` file without overriding
shell values. Copy `.env.example` to `.env`, fill in only the provider you
intend to use, then launch the app:

```bash
./scripts/run.sh
```

The live transcript records the selected provider, never a credential or an
environment-sourced model value.

## Docker deployment

Build the image from the repository root:

```bash
docker build -t sherlok .
```

Run it locally, passing the provider credential only at runtime:

```bash
docker run --rm -p 7860:7860 \
  -e GEMINI_API_KEY="your-key" \
  sherlok
```

Open `http://localhost:7860`. The container listens on `0.0.0.0` and uses
port `7860` by default. Platforms that provide a `PORT` environment variable
can override it without rebuilding the image. Set provider credentials in the
deployment platform's secret manager as environment variables; do not put
them in the Dockerfile, image, or source repository.

## Deterministic verification

The full suite uses mocked LLM transports. It requires neither API keys nor
network calls, and verifies the public investigation and re-investigation
flows, Gradio interface construction, human verdict decisions, safe provider
failures, evidence citations, and both the Aurora participant fixture and an
unrelated fictional fixture.

From a fresh virtual environment, run:

```bash
./scripts/setup.sh
python3 -m pytest -q
```

## Optional live-provider smoke test

This is not part of automated verification. After configuring one supported
provider in your ignored `.env`, shell environment, or the session-only UI
field, launch `./scripts/run.sh`, submit a new fictional mystery, and confirm a
proposal reaches the human review controls. Record only pass/fail and the
provider; never commit credentials, raw provider output, or case data.

## Latest verification record

On 2026-09-11, a clean temporary Python virtual environment completed:

```bash
python3 -m pip install -r requirements.txt
python3 -m pytest -q
```

Result: `154 passed`. No API keys or network calls were used. The optional
live-provider smoke test was not run because it requires a user credential.

## Repository guide

| Location | Purpose |
| --- | --- |
| [GitHub master issue #1](https://github.com/codesuke/Case-Multi-Agent/issues/1) | User stories, behavioral contracts, scope, and work tracking. |
| [Design](docs/specs-implemented/2026-09-11-sherlok-design.md) | Delivered agent pipeline, state model, and test seams. |
| [Architecture](Architecture.md) | Intended code layout and module boundaries. |
| [Domain glossary](CONTEXT.md) | Precise meanings of project-specific terms. |
| [Agent guide](AGENTS.md) | Development rules and the focused local skill set. |
| [Documentation index](docs/README.md) | Durable project documentation structure. |

## Project status

This is a runnable local demonstration, not a deployed service. It includes a
Gradio UI, case-agnostic multi-agent pipeline, provider-neutral LLM boundary,
and deterministic acceptance coverage. A configured provider is needed only
for the optional live smoke test.

## Contributing

Contributions should preserve the project's learning focus: keep agent
responsibilities small, cite evidence end-to-end, test behavior through public
boundaries, and document durable design decisions. See [AGENTS.md](AGENTS.md)
before starting work.

## License

No license has been selected yet. Do not assume permission to reuse or
redistribute this project until a license is added.
