"""Keep the generated Next.js transport contract aligned with Python OpenAPI."""

from __future__ import annotations

import json
from pathlib import Path
import subprocess

from api import create_api


def test_generated_nextjs_openapi_contract_matches_the_python_adapter() -> None:
    contract_path = (
        Path(__file__).resolve().parents[1]
        / "sherlok-nextjs/lib/generated/investigation-openapi.v1.json"
    )

    generated_contract = json.loads(contract_path.read_text())

    assert generated_contract == create_api().openapi()


def test_generated_typescript_contract_matches_the_openapi_snapshot(tmp_path: Path) -> None:
    root = Path(__file__).resolve().parents[1]
    schema = root / "sherlok-nextjs/lib/generated/investigation-openapi.v1.json"
    generated = root / "sherlok-nextjs/lib/generated/investigation-api.v1.ts"
    fresh = tmp_path / "investigation-api.v1.ts"

    subprocess.run(
        [
            "pnpm",
            "dlx",
            "openapi-typescript@7.13.0",
            str(schema),
            "-o",
            str(fresh),
        ],
        check=True,
        cwd=root,
    )

    assert fresh.read_text() == generated.read_text()
