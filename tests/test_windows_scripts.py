"""Public Windows batch-command behavior for setup and application launch."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _windows_path(path: Path) -> str:
    return subprocess.run(
        ["wslpath", "-w", str(path)], capture_output=True, text=True, check=True
    ).stdout.strip()


def _environment(**overrides: str) -> dict[str, str]:
    return {**os.environ, **overrides}


def test_windows_run_script_explains_how_to_create_a_missing_virtual_environment(
    tmp_path: Path,
) -> None:
    virtual_environment = _windows_path(tmp_path / ".venv")
    result = subprocess.run(
        [
            "cmd.exe",
            "/d",
            "/c",
            f'set "NO_PAUSE=1" && set "VENV_DIR={virtual_environment}" && call scripts\\run.bat',
        ],
        cwd=PROJECT_ROOT,
        env=_environment(),
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 1
    assert r"scripts\setup.bat" in result.stderr


def test_windows_run_script_launches_the_app_with_the_virtual_environment_python(
    tmp_path: Path,
) -> None:
    windows_temp = PROJECT_ROOT / ".pytest-windows-script-probe" / tmp_path.name
    windows_temp.mkdir(parents=True)
    try:
        probe_python = windows_temp / "probe-python.cmd"
        probe_python.write_text(
            '@echo off\r\necho %* > "%PROBE_LOG%"\r\nexit /b 0\r\n', encoding="utf-8"
        )
        log_path = windows_temp / "launch.log"
        launcher = windows_temp / "launch-app.cmd"
        launcher.write_text(
            "@echo off\r\n"
            "set \"NO_PAUSE=1\"\r\n"
            f'set "VENV_PYTHON={_windows_path(probe_python)}"\r\n'
            f'set "PROBE_LOG={_windows_path(log_path)}"\r\n'
            "call scripts\\run.bat\r\n",
            encoding="utf-8",
        )

        result = subprocess.run(
            [
                "cmd.exe",
                "/d",
                "/c",
                _windows_path(launcher),
            ],
            cwd=PROJECT_ROOT,
            env=_environment(),
            capture_output=True,
            text=True,
            check=False,
        )

        assert result.returncode == 0, result.stderr
        assert log_path.read_text(encoding="utf-8").strip().strip('"') == _windows_path(
            PROJECT_ROOT / "app.py"
        )
    finally:
        shutil.rmtree(windows_temp.parent, ignore_errors=True)


def test_windows_run_script_pauses_after_a_setup_error_when_not_opted_out(
    tmp_path: Path,
) -> None:
    result = subprocess.run(
        [
            "cmd.exe",
            "/d",
            "/c",
            f'set "VENV_DIR={_windows_path(tmp_path / ".venv")}" && call scripts\\run.bat',
        ],
        cwd=PROJECT_ROOT,
        env=_environment(),
        input="\n",
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )

    assert result.returncode == 1
    assert "Press any key" in result.stdout


def test_windows_setup_script_pauses_after_an_installation_error_when_not_opted_out(
    tmp_path: Path,
) -> None:
    windows_temp = PROJECT_ROOT / ".pytest-windows-script-probe" / tmp_path.name
    windows_temp.mkdir(parents=True)
    try:
        launcher = windows_temp / "run-setup.cmd"
        launcher.write_text(
            "@echo off\r\n"
            f'set "VENV_DIR={_windows_path(windows_temp / ".venv")}"\r\n'
            'set "PYTHON_BIN=missing-python-command"\r\n'
            "call scripts\\setup.bat\r\n",
            encoding="utf-8",
        )
        result = subprocess.run(
            ["cmd.exe", "/d", "/c", _windows_path(launcher)],
            cwd=PROJECT_ROOT,
            env=_environment(),
            input="\n",
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )

        assert result.returncode != 0
        assert "Press any key" in result.stdout
    finally:
        shutil.rmtree(windows_temp.parent, ignore_errors=True)
