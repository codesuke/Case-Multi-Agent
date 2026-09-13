# README Claims Ledger

| Claim | Status | Evidence | Notes |
| --- | --- | --- | --- |
| The deployable application is self-contained in `sherlok-nextjs/`. | VERIFIED | `sherlok-nextjs/Dockerfile`; `agent-orchestration/`; `docker/start.sh` | One image starts the public Next.js server and private Python adapter. |
| The workspace uses one local configuration file. | VERIFIED | `sherlok-nextjs/.env.example`; `agent-orchestration/api.py` | Provider keys remain server-side; deployment variables are entered once. |
| Python owns orchestration and Next.js owns presentation. | VERIFIED | `Architecture.md`; transport routes; application-interface tests | Browser requests stay behind same-origin Next.js routes. |
| Verdict claims remain evidence-linked and subject to Human Decision. | VERIFIED | `agent-orchestration/case_file.py`; orchestration tests; browser journey | No verdict is auto-finalized. |
