#!/usr/bin/env bash
# Start the Gradio application through the project's local virtual environment.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${VENV_DIR:-$PROJECT_ROOT/.venv}"
VENV_PYTHON="$VENV_DIR/bin/python"

if [[ ! -x "$VENV_PYTHON" ]]; then
  echo "Virtual environment not found. Run ./scripts/setup.sh first." >&2
  exit 1
fi

echo "Starting Sherlok"
exec "$VENV_PYTHON" "$PROJECT_ROOT/app.py"
