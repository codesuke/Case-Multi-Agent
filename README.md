# Sherlok

A beginner-friendly multi-agent investigation of fictional mysteries, with
Python orchestration and a Next.js investigation workspace.

> **Migration status:** the Python pipeline and its Gradio reference UI are
> runnable today. The Next.js workspace has been scaffolded and designed, but
> is not connected to the Python runtime yet. New UI work targets Next.js.

## Quick start

To run the delivered Python/Gradio reference while the Next.js migration is in
progress, use Python 3.12 if possible:

```bash
./scripts/setup.sh
export GEMINI_API_KEY="your-key"
./scripts/run.sh
```

Open the local URL printed by Gradio and submit a fictional mystery. Gemini is the default provider.

## Next.js workspace

The target workspace uses the Python API adapter and Next.js together. From
the repository root, first install the pinned Python requirements and start
the adapter:

```bash
./scripts/setup.sh
./.venv/bin/uvicorn api:create_api --factory --host 127.0.0.1 --port 8000
```

Then, in `sherlok-nextjs/`, start the presentation layer in a second terminal:

```bash
pnpm install
export SHERLOK_PYTHON_API_URL="http://127.0.0.1:8000"
pnpm dev
```

The adapter URL is server-only configuration; do not use a `NEXT_PUBLIC_`
variable. Keep provider credentials in the Python process's shell or ignored
`.env` file. If the workspace cannot reach Python, confirm both processes are
running and the URL matches. Recreate `.venv` with `./scripts/setup.sh` if a
FastAPI dependency mismatch prevents the adapter from starting.

On Windows Command Prompt:

```bat
scripts\setup.bat
set GEMINI_API_KEY=your-key
scripts\run.bat
```

## What it does

- Accepts pasted mystery text and PDF, DOCX, Markdown, or plain-text case material.
- Normalizes source material and preserves safe source references.
- Collects ID-tagged evidence before analysis.
- Runs Suspect Analyst and Timeline Reconciler in parallel.
- Uses a Skeptic to challenge weak claims and request at most one revision per specialist.
- Produces a ranked, evidence-cited verdict proposal for human review.
- Lets a person accept, reject, or request a guided re-investigation.
- Supports Gemini, OpenAI, and Groq through a provider-agnostic LLM boundary.

Sherlok is a learning demonstration for fictional mysteries, not a tool for real-world investigative or legal decisions.

## Target user experience

The Next.js workspace is designed to make the collaboration visible instead
of presenting a generic chatbot transcript. It provides seven connected views:

1. Start Investigation — add participant case material and choose a configured provider.
2. Case Overview — understand the current case and the next useful action.
3. Evidence — inspect facts, inferences, and source references.
4. Timeline — see event order, gaps, and contradictions.
5. Analysis — compare specialist claims and Skeptic challenges.
6. Agent Workspace — watch the pipeline branch, rejoin, revise, and complete.
7. Proposed Verdict — review confidence, uncertainty, citations, and record a human decision.

Live progress will arrive from Python as observable investigation events. The
workspace will show agent status, summaries, and evidence IDs, but never hidden
chain-of-thought.

## Investigation flow

```text
Case material → Case File Curator → Evidence Collector
                                      |
                     +----------------+----------------+
                     v                                 v
             Suspect Analyst                  Timeline Reconciler
                     +----------------+----------------+
                                      v
                                Skeptic review
                                      |
                       one bounded revision round
                                      v
                                Lead Detective
                                      |
                                      v
              Human review: Accept / Reject / Re-investigate
```

The case file retains the material, evidence, specialist outputs, Skeptic feedback, and verdict. A verdict remains a proposal until a person decides. Re-investigation reuses existing evidence and restarts at the parallel specialist stage with the person's guidance note.

## Configuration

Credentials and model settings come only from your shell or an ignored local `.env` file. The UI selects the provider for a run but never displays, stores, or edits credentials.

To use a local file:

```bash
cp .env.example .env
```

Shell values take precedence over `.env`. Never commit API keys or `.env` files.

| Provider | Required settings | Model setting |
| --- | --- | --- |
| Gemini (default) | `GEMINI_API_KEY` | `GEMINI_MODEL` (optional) |
| OpenAI | `LLM_PROVIDER=openai`, `OPENAI_API_KEY` | `OPENAI_MODEL` (optional) |
| Groq | `LLM_PROVIDER=groq`, `GROQ_API_KEY` | `GROQ_MODEL` (required) |

For example, to use OpenAI:

```bash
export LLM_PROVIDER="openai"
export OPENAI_API_KEY="your-key"
./scripts/run.sh
```

Groq uses an OpenAI-compatible API. Choose an available model from the [Groq Console](https://console.groq.com) and set `GROQ_MODEL` explicitly.

## Tests

The deterministic Python test suite mocks LLM transports. It covers agent
contracts, evidence citations, revision and re-investigation, configuration
failures, scripts, and the current reference interface. The migration plan adds
contract tests at the Python/Next.js seam and browser tests for the critical
investigation journey.

```bash
./scripts/setup.sh
./.venv/bin/python -m pytest -q
```

On Windows Command Prompt, run:

```bat
.venv\Scripts\python.exe -m pytest -q
```

For an optional live check, configure a provider, start the app, submit a new fictional mystery, and confirm the verdict reaches human review. Do not commit credentials, raw provider output, or case data.

## Docker

```bash
docker build -t sherlok .
docker run --rm -p 7860:7860 -e GEMINI_API_KEY="your-key" sherlok
```

Open `http://localhost:7860`. The container listens on `0.0.0.0:7860`; set `PORT` to override it on a deployment platform. Use the platform's secret manager for credentials.

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| `Virtual environment not found` | Run `./scripts/setup.sh` or `scripts\setup.bat` first. |
| Provider configuration error | Check the selected provider, its API key, and `GROQ_MODEL` when using Groq. |
| Port 7860 is already in use | Stop the process using it, or set `PORT` to an available port before launch. |
| PDF is rejected | Only text-based PDFs are accepted. Encrypted, malformed, empty, or OCR-required files show a warning. |

## Documentation

| Resource | Purpose |
| --- | --- |
| [Master issue #1](https://github.com/codesuke/Sherlok/issues/1) | Next.js migration requirements, behavior contracts, and implementation slices. |
| [Next.js migration spec](docs/specs-planned/2026-09-12-nextjs-investigation-workspace.md) | Target experience, transport seam, acceptance criteria, and slices. |
| [Frontend screen contracts](sherlok-nextjs/public/Mock-Up/README.md) | The seven views that explain and visualize the investigation. |
| [Delivered design](docs/specs-implemented/2026-09-11-sherlok-design.md) | Agent pipeline, state model, and test seams. |
| [Architecture](Architecture.md) | Code layout and dependency boundaries. |
| [Domain glossary](CONTEXT.md) | Project-specific language. |
| [Example cases](Cases/) | Fictional case material for manual exploration. |
| [Documentation index](docs/README.md) | Durable documentation structure. |
| [Agent guide](AGENTS.md) | Working rules and project conventions. |

The Aurora Diamond case is an acceptance fixture, not built-in input. Agents receive only its participant material; the sealed facilitator solution remains an evaluation oracle.

## Contributing

Keep the project approachable and case-agnostic. Preserve evidence IDs from source to verdict, keep agent responsibilities isolated, add behavior tests for changed product behavior, and read [AGENTS.md](AGENTS.md) before making a change.

## License

No license has been selected. Do not assume permission to reuse or redistribute this project until a license is added.
