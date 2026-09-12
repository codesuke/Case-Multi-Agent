# Spec: Retire the Gradio Reference Adapter

## Problem Statement

Gradio is a temporary reference adapter. Removing it before the Next.js
critical journey is proved would remove the working fallback without proving
that the new workspace preserves the same observable behavior.

## Solution

Retire Gradio only after the Next.js browser journey is passing against the
Python application interface and the parity checklist below is signed off.
The retirement change removes the adapter and its run scripts in one small,
reversible slice. It does not change orchestration, case-material curation,
provider configuration, or the HTTP/event interface.

## Parity Gate

- A User can submit pasted material and supported files through Next.js.
- The User can observe curation and named workflow states, including failure.
- The User can inspect canonical material, evidence, timeline, analysis, and
  a proposed verdict with evidence IDs and safe source references.
- The User can accept, reject, or request re-investigation with guidance.
- Re-investigation retains evidence and restarts only later workflow stages.
- The deterministic Python suite and the critical browser journey pass with
  no live provider credentials.
- The reference-case participant material and a second unrelated fictional
  case both complete the journey. The sealed facilitator material is never
  supplied to an agent or browser.

## Local Parity Run

From the repository root, install the Python dependencies and start the API:

```bash
./scripts/setup.sh
./.venv/bin/python -m uvicorn api:create_api --factory --host 127.0.0.1 --port 8000
```

In a second terminal, start the workspace with the private server-side API
address:

```bash
cd sherlok-nextjs
pnpm install
SHERLOK_PYTHON_API_URL=http://127.0.0.1:8000 pnpm dev
```

Open `http://localhost:3000`. `SHERLOK_PYTHON_API_URL` is read only by Next.js
route handlers; do not prefix it with `NEXT_PUBLIC_` or put credentials in it.

## Implementation Slices

1. Resolve every unchecked acceptance item in the Next.js migration spec and
   make the browser journey deterministic.
2. Run and record the parity gate above against the Python application
   interface.
3. Remove `app.py`, Gradio-only scripts, Gradio dependencies, and obsolete
   documentation in a dedicated commit. Keep the Python application interface
   and API server.
4. Update Architecture, the root README, and the claims ledger to state that
   Next.js is the only presentation adapter.

## Testing Decisions

Test the public browser-to-Next.js-to-Python seam. Do not test Gradio
implementation details as a substitute for parity. Before removal, run the
full deterministic Python suite and the critical browser journey. After
removal, verify that no production module imports Gradio.

## Out of Scope

- Retiring Gradio in the current migration slice.
- Changing the case file, agents, LLM wrapper, or transport schema.
