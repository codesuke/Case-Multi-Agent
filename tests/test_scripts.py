"""Public command behavior for local setup and app launch scripts."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _environment(**overrides: str) -> dict[str, str]:
    return {**os.environ, **overrides}


def test_run_script_explains_how_to_create_a_missing_virtual_environment(tmp_path: Path) -> None:
    result = subprocess.run(
        ["bash", "scripts/run.sh"],
        cwd=PROJECT_ROOT,
        env=_environment(VENV_DIR=str(tmp_path / ".venv")),
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 1
    assert "./scripts/setup.sh" in result.stderr


def test_setup_script_creates_a_venv_and_installs_declared_requirements(tmp_path: Path) -> None:
    log_path = tmp_path / "calls.log"
    bootstrap = tmp_path / "python3"
    bootstrap.write_text(
        """#!/usr/bin/env bash
set -euo pipefail
if [[ \"${1:-}\" == \"-m\" && \"${2:-}\" == \"venv\" ]]; then
  printf 'bootstrap:%s\\n' \"$*\" >> \"$PROBE_LOG\"
  mkdir -p \"$3/bin\"
  cp \"$0\" \"$3/bin/python\"
  chmod +x \"$3/bin/python\"
  exit 0
fi
printf 'venv:%s\\n' \"$*\" >> \"$PROBE_LOG\"
""",
        encoding="utf-8",
    )
    bootstrap.chmod(0o755)
    virtual_environment = tmp_path / ".venv"

    result = subprocess.run(
        ["bash", "scripts/setup.sh"],
        cwd=PROJECT_ROOT,
        env=_environment(
            PYTHON_BIN=str(bootstrap),
            VENV_DIR=str(virtual_environment),
            PROBE_LOG=str(log_path),
        ),
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert log_path.read_text(encoding="utf-8").splitlines() == [
        f"bootstrap:-m venv {virtual_environment}",
        "venv:-m pip install --upgrade pip",
        f"venv:-m pip install -r {PROJECT_ROOT / 'requirements.txt'}",
    ]


def test_run_script_launches_the_app_with_the_virtual_environment_python(tmp_path: Path) -> None:
    virtual_environment = tmp_path / ".venv"
    python_path = virtual_environment / "bin" / "python"
    python_path.parent.mkdir(parents=True)
    python_path.write_text(
        "#!/usr/bin/env bash\nprintf '%s\\n' \"$*\" > \"$PROBE_LOG\"\n",
        encoding="utf-8",
    )
    python_path.chmod(0o755)
    log_path = tmp_path / "launch.log"

    result = subprocess.run(
        ["bash", "scripts/run.sh"],
        cwd=PROJECT_ROOT,
        env=_environment(VENV_DIR=str(virtual_environment), PROBE_LOG=str(log_path)),
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert log_path.read_text(encoding="utf-8").strip() == str(PROJECT_ROOT / "app.py")
