# Self-contained Next.js and Python Runtime Image

Sherlok's deployment target builds `sherlok-nextjs/` as its Docker context,
but its Python orchestration runtime previously lived outside that context.
Keep Python orchestration and Next.js presentation as separate runtime
processes while making the workspace directory sufficient to build and run the
whole application with one Dockerfile.

## Status

accepted — 2026-09-13

## Considered Options

- Build only the Next.js standalone server and require a separately deployed
  Python adapter. This leaves the user-facing application unavailable unless
  both deployments are configured together.
- Move orchestration into Next.js. This would violate the established Python
  ownership seam and duplicate a tested domain pipeline.
- Build two containers with Docker Compose. This separates processes but does
  not meet the deployment target's one-Dockerfile, one-image requirement.
- Build one image that starts the private FastAPI adapter and the public
  Next.js standalone server. This keeps the application interface unchanged
  while allowing the configured workspace build context to contain all runtime
  inputs.

## Decision

- `sherlok-nextjs/python/` contains the Python application interface, domain
  modules, agents, and production Python requirements used by the image.
- `sherlok-nextjs/Dockerfile` builds the Next.js standalone output and Python
  virtual environment in separate stages, then combines their runtime artifacts
  in one non-root image.
- The container starts Uvicorn on `127.0.0.1:8000` and the Next.js standalone
  server on the public `PORT` (default `3000`).
- `SHERLOK_PYTHON_API_URL` defaults to the private loopback URL. Browser code
  continues to call only same-origin Next.js routes.
- If either runtime exits, the entrypoint stops the other and exits the
  container rather than serving a UI with a failed orchestration adapter.

## Consequences

- Deployment needs one image, one exposed port, and provider credentials only;
  it does not need Docker Compose or a second service URL.
- Local development may still run the two processes separately for faster
  feedback, using `python/requirements.txt` and `SHERLOK_PYTHON_API_URL`.
- The bundled Python runtime is a deployment source snapshot. Until the
  migration removes the former root-level runtime, changes to either copy must
  be mirrored and verified for parity.
- A single container runs two processes, which is intentionally scoped to this
  beginner-friendly demonstration and its requested deployment constraint.
