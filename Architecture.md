# Architecture

Sherlok has two focused modules in one deployable application:

- `sherlok-nextjs/` is the presentation module. It owns routes, navigation,
  accessibility, interaction state, and rendering.
- `sherlok-nextjs/agent-orchestration/` is the orchestration module. It owns
  case state, material curation, agent workflow, validation, provider
  configuration, and the Python HTTP/event adapter.

## File structure

```text
/
├── sherlok-nextjs/
│   ├── app/                         # Next.js pages and same-origin routes
│   ├── components/                  # Investigation workspace UI
│   ├── lib/                         # Generated contract and server adapter
│   ├── agent-orchestration/         # Python application module
│   │   ├── agents/                  # Specialist responsibilities
│   │   ├── api.py                   # FastAPI HTTP and event adapter
│   │   ├── case_file.py             # Case File schema and rules
│   │   ├── case_material.py         # Source-preserving intake
│   │   ├── orchestrator.py          # Workflow and bounded revision control
│   │   └── llm_client.py            # Provider-agnostic LLM interface
│   ├── docker/start.sh              # Starts both runtime processes
│   ├── .env.example                 # One shared configuration template
│   └── Dockerfile                   # Complete production image
├── tests/                           # Python behavior and contract tests
├── docs/                            # Durable project documentation
└── AGENTS.md                        # Working agreement
```

## Runtime flow

```text
Browser
  │  public HTTP, port 3000
  ▼
Next.js presentation module
  │  same-origin route handlers proxy commands and events
  ▼
Python application interface, 127.0.0.1:8000
  │
  ├── Case File Curator
  └── Orchestrator → specialist agents → provider-agnostic LLM module
```

The browser never receives an internal runtime URL, provider credentials, raw
provider output, hidden reasoning, or filesystem paths. REST carries commands
and snapshots; server-sent events carry ordered, safe investigation progress.

## Deployment and configuration

`sherlok-nextjs/Dockerfile` is the only production Dockerfile. It builds the
Next.js standalone output and Python virtual environment, then starts both
processes in one non-root image. FastAPI binds only to loopback; Next.js is the
sole public service.

The workspace-level `.env` is ignored by Git and excluded from image builds.
For local development, both processes load it. For deployment, configure the
same values once in the platform environment; both child processes inherit
them. `SHERLOK_PYTHON_API_URL` defaults to the container's loopback adapter.

## Dependency rules

- Next.js renders the Investigation Snapshot and ordered public events; it
  does not make provider calls or decide investigation outcomes.
- The Python application interface exposes start, snapshot, events, decision,
  and re-investigation operations.
- Domain modules never depend on FastAPI, Next.js, React, or transport markup.
- `llm_client.py` is the only module permitted to import a provider SDK.
- Every final claim remains traceable to evidence IDs and source references.
