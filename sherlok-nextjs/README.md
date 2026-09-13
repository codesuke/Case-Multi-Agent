<p align="center">
  <img src="./public/assets/sherlok-logo-minimal-brown.png" alt="Sherlok detective mark" width="128" />
</p>

# Sherlok Next.js Workspace

This directory contains Sherlok's target user-facing investigation workspace.
Python remains responsible for case-material processing, agent orchestration,
validation, case state, and LLM access. Next.js renders that state and makes
the live multi-agent workflow understandable to a human reviewer.

Status: connected to the Python investigation adapter. The browser only calls
same-origin Next.js routes; Python retains all Case File and provider state.
The complete production runtime is self-contained here:
`agent-orchestration/` contains the orchestration module and the single
`Dockerfile` builds and starts both tiers.

## Getting started

Copy [`.env.example`](.env.example) to the ignored `.env` file and set one
provider's credentials. Both the Next.js server and the orchestration module
read that one workspace-level file during local development.

Then start the bundled orchestration module in one terminal:

```bash
cd agent-orchestration
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn api:create_api --factory --host 127.0.0.1 --port 8000
```

In the workspace directory, install dependencies with the pinned package
manager, then start the frontend in a second terminal:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to start an investigation.

`SHERLOK_PYTHON_API_URL` is read only by Next.js server routes and must not be
prefixed with `NEXT_PUBLIC_`. Provider credentials are read by Python only.
Next.js does not expose unprefixed environment values to browser bundles. A
Python-process restart clears the demo's in-memory investigation IDs; open a
new investigation afterward.

If the workspace reports that the investigation service is unavailable, verify
that the adapter is running on the configured URL. If FastAPI fails to start,
recreate `agent-orchestration/.venv`; its `requirements.txt` supplies the compatible
FastAPI and Starlette set.

## Deploy with Dokploy

Dokploy can build this directory directly from the included `Dockerfile`.
Create an **Application** from this repository, set the build context to
`sherlok-nextjs`, and expose container port `3000`. No start command, second
container, or Docker Compose file is needed: the image starts the private
FastAPI orchestration adapter on `127.0.0.1:8000` and the public standalone
Next.js server on port `3000`.

Set the variables from `.env.example` once in Dokploy's environment-variable
settings rather than committing an `.env` file. The single container passes
those variables to both processes. `SHERLOK_PYTHON_API_URL` defaults to the
container's private loopback adapter and should normally remain unchanged.
The public server listens on `0.0.0.0:3000`; leave `PORT` unset unless your
Dokploy configuration requires a different internal port.

## Search and browser metadata

The browser tab uses the Sherlok detective mark from `public/assets/`; it is
compiled into `app/favicon.ico` for browser compatibility. Set these Dokploy
environment variables before deploying so public metadata and crawler routes
use the correct canonical origin:

```bash
NEXT_PUBLIC_SITE_URL=https://your-sherlok-domain.example
GOOGLE_SITE_VERIFICATION=your-google-search-console-token # optional
```

`NEXT_PUBLIC_SITE_URL` must be the final public HTTPS URL, with no trailing
slash. The application serves `/robots.txt` and `/sitemap.xml`; submit the
sitemap URL to the matching Google Search Console property after deployment.
Only the public start page is indexable. User-specific investigation and case
workspace pages are intentionally excluded from search results.

Build and run it locally from this directory:

```bash
docker build -t sherlok .
docker run --rm -p 3000:3000 \
  -e LLM_PROVIDER=openai \
  -e OPENAI_API_KEY=your-provider-key \
  sherlok
```

## Read before implementation

- [`design.md`](design.md) defines the visual system.
- [`public/Mock-Up/README.md`](public/Mock-Up/README.md) defines the seven-screen map and shared interaction rules.
- [`../docs/specs-implemented/2026-09-13-nextjs-python-single-image.md`](../docs/specs-implemented/2026-09-13-nextjs-python-single-image.md) defines the delivered runtime and transport seam.
- [`../docs/adr/0001-nextjs-presentation-python-orchestration.md`](../docs/adr/0001-nextjs-presentation-python-orchestration.md) records the stack decision.

Before changing framework code, also read the version-matched documentation
under `node_modules/next/dist/docs/`, as required by this directory's
`AGENTS.md`.

## Product rules

- Keep evidence IDs beside every displayed agent claim.
- Show observable progress and result summaries, never hidden chain-of-thought.
- Treat the verdict as a proposal until a person records a decision.
- Never expose credentials, raw provider output, upload paths, or facilitator-only material.
- Keep all reusable UI behavior case-agnostic.

## Framework documentation

- [Next.js documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
