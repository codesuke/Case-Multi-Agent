# syntax=docker/dockerfile:1

# Build the Next.js standalone server with its pinned Node.js toolchain.
FROM node:24-bookworm-slim AS web-builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# Build Python dependencies separately so source edits do not invalidate them.
FROM python:3.12-slim AS python-builder

ENV PIP_NO_CACHE_DIR=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

RUN python -m venv "$VIRTUAL_ENV"

WORKDIR /build

COPY python/requirements.txt ./
RUN python -m pip install --upgrade pip \
  && python -m pip install -r requirements.txt

# One image runs the private Python orchestration adapter and the public Next.js
# server. Next.js is the only exposed port; it reaches FastAPI over loopback.
FROM python:3.12-slim AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    SHERLOK_PYTHON_API_URL=http://127.0.0.1:8000 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

RUN apt-get update \
  && apt-get install --yes --no-install-recommends bash tini \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 sherlok \
  && useradd --system --uid 1001 --gid sherlok sherlok

# The Node binary is self-contained on the shared Debian base; the standalone
# output already includes every JavaScript module required at runtime.
COPY --from=web-builder /usr/local/bin/node /usr/local/bin/node
COPY --from=python-builder /opt/venv /app/.venv
COPY --from=web-builder --chown=sherlok:sherlok /app/public ./public
COPY --from=web-builder --chown=sherlok:sherlok /app/.next/standalone ./
COPY --from=web-builder --chown=sherlok:sherlok /app/.next/static ./.next/static
COPY --chown=sherlok:sherlok python ./python
COPY --chown=sherlok:sherlok docker/start.sh ./bin/start

RUN chmod 0555 ./bin/start

USER sherlok

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--", "/app/bin/start"]
