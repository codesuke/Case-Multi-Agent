#!/usr/bin/env bash
set -euo pipefail

stop_services() {
  local process_id

  for process_id in "${python_pid:-}" "${next_pid:-}"; do
    if [[ -n "$process_id" ]] && kill -0 "$process_id" 2>/dev/null; then
      kill -TERM "$process_id" 2>/dev/null || true
    fi
  done
}

on_exit() {
  local status=$?
  stop_services
  wait "${python_pid:-}" 2>/dev/null || true
  wait "${next_pid:-}" 2>/dev/null || true
  exit "$status"
}

trap on_exit EXIT
trap 'exit 0' INT TERM

cd /app/agent-orchestration
python -m uvicorn api:create_api --factory --host 127.0.0.1 --port 8000 &
python_pid=$!

cd /app
node server.js &
next_pid=$!

# If either runtime exits, stop the other so the container never presents a
# healthy UI backed by a failed orchestration process.
wait -n "$python_pid" "$next_pid"
