# Architecture Decisions

Use `../templates/ADR.md` for decisions that are difficult to reverse and have
meaningful alternatives. Name records `NNNN-short-title.md`.

- [`0001-nextjs-presentation-python-orchestration.md`](0001-nextjs-presentation-python-orchestration.md)
  — Next.js owns presentation; Python retains orchestration behind a typed
  HTTP and event-stream seam.
- [`0002-single-image-nextjs-python-runtime.md`](0002-single-image-nextjs-python-runtime.md)
  — One self-contained image runs the private Python adapter and public
  Next.js server from the `sherlok-nextjs/` build context.
