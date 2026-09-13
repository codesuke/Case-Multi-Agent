# Sherlok

Sherlok is a beginner-friendly, multi-agent investigation workspace for
fictional mysteries. Next.js presents the Case File and human-review workflow;
Python runs case-material curation, evidence-led orchestration, and LLM calls.

## Run the application

The deployable application lives in `sherlok-nextjs/`. Copy its environment
template, configure one provider, then build and run one image:

```bash
cd sherlok-nextjs
cp .env.example .env
# Set one provider's credentials in .env.
docker build -t sherlok .
docker run --rm -p 3000:3000 --env-file .env sherlok
```

Open `http://localhost:3000`.

For local development, start the orchestration module and Next.js separately:

```bash
cd sherlok-nextjs/agent-orchestration
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn api:create_api --factory --host 127.0.0.1 --port 8000
```

In a second terminal:

```bash
cd sherlok-nextjs
pnpm install
pnpm dev
```

## What it does

- Accepts pasted text and PDF, DOCX, Markdown, or plain-text case material.
- Preserves safe source references while producing canonical case material.
- Collects evidence before parallel suspect and timeline analysis.
- Uses a Skeptic to challenge weak claims and allow one bounded revision round.
- Produces evidence-cited verdict proposals for human Accept, Reject, or
  guided Re-investigation decisions.
- Supports Gemini, OpenAI, and Groq through a provider-agnostic LLM module.

Sherlok is a learning demonstration for fictional mysteries, not a tool for
real-world investigative or legal decisions.

## Configuration

`sherlok-nextjs/.env.example` lists every supported variable. The ignored
`.env` file is the one local configuration source for both runtime processes.
Only values prefixed with `NEXT_PUBLIC_` may reach browser code; provider keys
remain server-side. In deployment, enter the same variables once in the
platform's environment settings rather than uploading `.env`.

## Documentation

| Resource | Purpose |
| --- | --- |
| [Architecture](Architecture.md) | Current module layout and runtime flow. |
| [Current implementation record](docs/specs-implemented/2026-09-13-nextjs-python-single-image.md) | Delivered presentation, orchestration, and container design. |
| [Domain glossary](CONTEXT.md) | Project-specific language. |
| [Frontend screen contracts](sherlok-nextjs/public/Mock-Up/README.md) | Workspace views and interaction rules. |
| [Agent guide](AGENTS.md) | Working rules and project conventions. |

The Aurora Diamond case is an acceptance fixture, not built-in input. Agents
receive only its participant material; the sealed facilitator solution remains
an evaluation oracle.
