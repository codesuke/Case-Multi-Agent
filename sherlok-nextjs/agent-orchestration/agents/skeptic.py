"""Skeptic: challenges specialist claims the cited evidence does not support.

Reads `case_file.evidence`, `case_file.suspect_profiles`, and
`case_file.timeline`. Writes only `case_file.skeptic_reviews`, appending one
`SkepticReview` per call. A required citation and citing only existing
evidence IDs are already enforced when each specialist parses its own
output; the Skeptic's job is to also challenge claims whose cited evidence
does not actually establish the stated conclusion.
"""

from __future__ import annotations

from agents._shared import (
    format_evidence_prompt,
    format_human_guidance,
    format_specialist_claims_prompt,
)
from case_file import (
    CaseFile,
    SkepticFinding,
    SkepticFindingKind,
    SkepticReview,
    SkepticReviewOutcome,
    Specialist,
)
from llm_client import LLMClient

SYSTEM_PROMPT = (
    "You are the Skeptic on a mystery investigation team. Review every "
    "motive, opportunity, timeline event, and timeline issue claim made by "
    "the Suspect Analyst and Timeline Reconciler. Challenge a claim whose "
    "cited evidence does not actually establish the stated conclusion -- "
    "for example, evidence that a credential or card was used does not by "
    "itself establish who held it, an item's presence does not by itself "
    "establish its contents, and a shared physical trait alone does not "
    "establish how an item was transferred. When evidence could plausibly "
    "have an innocent explanation, require the claim to acknowledge that "
    "alternative instead of presenting one explanation as certain. Also "
    "flag any claim that cites no evidence ID where one is required, or "
    "cites an evidence ID absent from the case file. Do not flag a claim "
    "already marked unknown, and do not flag a claim the cited evidence "
    "reasonably supports. Quote each flagged claim's statement exactly as "
    "given so it can be matched back to its source. If human "
    "re-investigation guidance is included below, flag any claim that "
    "still relies on evidence the guidance says is unavailable."
)

_FINDING_SCHEMA = {
    "type": "object",
    "required": ["specialist", "claim", "kind", "explanation"],
    "properties": {
        "specialist": {"enum": [specialist.value for specialist in Specialist]},
        "claim": {"type": "string"},
        "kind": {"enum": [kind.value for kind in SkepticFindingKind]},
        "explanation": {"type": "string"},
    },
}

RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["findings"],
    "properties": {
        "findings": {"type": "array", "items": _FINDING_SCHEMA},
    },
}


class Skeptic:
    """Reads specialist claims and appends a review to `case_file.skeptic_reviews`."""

    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm

    def run(self, case_file: CaseFile) -> CaseFile:
        prompt = _build_prompt(case_file)
        response = self._llm.call_llm(
            prompt=prompt,
            system=SYSTEM_PROMPT,
            response_schema=RESPONSE_SCHEMA,
        )
        known_claims = _known_claims_by_specialist(case_file)
        try:
            findings = _parse_findings(response, known_claims)
        except ValueError:
            response = self._llm.call_llm(
                prompt=_build_correction_prompt(prompt),
                system=SYSTEM_PROMPT,
                response_schema=RESPONSE_SCHEMA,
            )
            findings = _parse_findings(response, known_claims)
        outcome = (
            SkepticReviewOutcome.APPROVED
            if not findings
            else SkepticReviewOutcome.REVISION_REQUESTED
        )
        case_file.skeptic_reviews = [
            *case_file.skeptic_reviews,
            SkepticReview(outcome=outcome, findings=findings),
        ]
        return case_file


def _build_prompt(case_file: CaseFile) -> str:
    lines = [format_evidence_prompt(case_file), "", format_specialist_claims_prompt(case_file)]
    guidance = format_human_guidance(case_file)
    if guidance:
        lines.extend(["", guidance])
    return "\n".join(lines)


def _build_correction_prompt(prompt: str) -> str:
    return (
        f"{prompt}\n\nYour previous Skeptic JSON failed validation. Return the full review JSON "
        "again. For every finding, copy the exact statement text from the specialist claims "
        "above; do not include bullet labels or evidence citations in the claim field."
    )


def _known_claims_by_specialist(case_file: CaseFile) -> dict[Specialist, set[str]]:
    suspect_claims = {
        claim.statement
        for profile in case_file.suspect_profiles
        for claim in (*profile.motive, *profile.opportunity)
    }
    timeline_claims = {event.statement for event in case_file.timeline.events} | {
        issue.statement for issue in case_file.timeline.issues
    }
    return {
        Specialist.SUSPECT_ANALYST: suspect_claims,
        Specialist.TIMELINE_RECONCILER: timeline_claims,
    }


def _parse_findings(
    response: dict, known_claims: dict[Specialist, set[str]]
) -> tuple[SkepticFinding, ...]:
    return tuple(
        _parse_finding(raw_finding, known_claims)
        for raw_finding in response["findings"]
    )


def _parse_finding(
    raw_finding: dict, known_claims: dict[Specialist, set[str]]
) -> SkepticFinding:
    try:
        specialist = Specialist(raw_finding["specialist"])
    except ValueError as error:
        raise ValueError(
            f"Unknown specialist in Skeptic finding: {raw_finding['specialist']!r}"
        ) from error
    try:
        kind = SkepticFindingKind(raw_finding["kind"])
    except ValueError as error:
        raise ValueError(
            f"Unknown Skeptic finding kind: {raw_finding['kind']!r}"
        ) from error

    claim = _resolve_claim_reference(raw_finding["claim"], known_claims[specialist])
    if claim not in known_claims[specialist]:
        raise ValueError(
            f"Skeptic finding cites a claim not made by {specialist.value}: {claim!r}"
        )
    return SkepticFinding(
        specialist=specialist,
        claim=claim,
        kind=kind,
        explanation=raw_finding["explanation"],
    )


def _resolve_claim_reference(raw_claim: str, known_claims: set[str]) -> str:
    """Accept a claim statement rendered by this application's specialist view."""
    if raw_claim in known_claims:
        return raw_claim
    rendered_claim = _normalize_apostrophes(raw_claim.removeprefix("- "))
    matching_claims = []
    for claim in known_claims:
        normalized_claim = _normalize_apostrophes(claim)
        if rendered_claim == normalized_claim:
            matching_claims.append(claim)
            continue
        rendered_prefixes = (
            f"Motive: {normalized_claim}",
            f"Opportunity: {normalized_claim}",
            f"Event: {normalized_claim}",
            f"Issue (gap): {normalized_claim}",
            f"Issue (contradiction): {normalized_claim}",
        )
        if any(
            _has_rendered_claim_suffix(rendered_claim, prefix)
            for prefix in rendered_prefixes
        ):
            matching_claims.append(claim)
    if len(matching_claims) == 1:
        return matching_claims[0]
    return raw_claim


def _normalize_apostrophes(value: str) -> str:
    return value.replace("‘", "'").replace("’", "'")


def _has_rendered_claim_suffix(raw_claim: str, prefix: str) -> bool:
    suffix = raw_claim.removeprefix(prefix)
    return suffix.startswith(" (") and suffix.endswith(")")
