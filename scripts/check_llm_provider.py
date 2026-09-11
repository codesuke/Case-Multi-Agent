"""Run one safe, schema-validated connectivity probe for a configured LLM provider.

The script intentionally reports neither credentials nor generated content. It is
for local diagnostics only and requires the selected provider's credentials in
the environment or ignored local ``.env`` file.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from llm_client import EnvLLMClient, load_local_environment


RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {"status": {"type": "string", "enum": ["ok"]}},
    "required": ["status"],
}


def _redact(message: str) -> str:
    """Remove configured credential values if a provider includes one in an error."""
    redacted = " ".join(message.split())
    for field, value in os.environ.items():
        if field.endswith("_API_KEY") and value:
            redacted = redacted.replace(value, "[redacted]")
    return redacted[:300]


def probe(provider: str) -> dict[str, object]:
    """Call one provider through the production LLM boundary and return safe metadata."""
    started = time.monotonic()
    model: str | None = None
    try:
        client = EnvLLMClient(provider=provider)
        metadata = client.run_metadata()
        model = metadata.model
        response = client.call_llm(
            "Return the required JSON object with status set to ok.",
            "You are a connectivity probe. Return only JSON matching the required schema.",
            RESPONSE_SCHEMA,
        )
        return {
            "provider": provider,
            "model": model,
            "outcome": "pass" if response == {"status": "ok"} else "fail",
            "detail": "schema-valid response" if response == {"status": "ok"} else "unexpected response shape",
            "elapsed_seconds": round(time.monotonic() - started, 1),
        }
    except Exception as error:
        return {
            "provider": provider,
            "model": model,
            "outcome": "fail",
            "detail": f"{type(error).__name__}: {_redact(str(error))}",
            "elapsed_seconds": round(time.monotonic() - started, 1),
        }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("provider", choices=("gemini", "openai", "groq"))
    arguments = parser.parse_args()
    load_local_environment()
    print(json.dumps(probe(arguments.provider), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
