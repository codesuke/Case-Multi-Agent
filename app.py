"""Gradio presentation layer.

Renders mystery input, streams pipeline progress, and displays the
resulting case file. Contains no provider calls or investigation
reasoning; all of that lives behind `orchestrator.stream_investigation`.
"""

from __future__ import annotations

from collections.abc import Callable, Iterator
from dataclasses import dataclass
import os

import gradio as gr

from case_file import (
    CaseFile,
    Claim,
    ClaimStatus,
    Specialist,
    VerdictReviewError,
    VerdictReviewStatus,
)
from llm_client import EnvLLMClient, load_local_environment
from orchestrator import (
    InvestigationEvent,
    InvestigationEventKind,
    stream_investigation,
    stream_reinvestigation,
)

# Shell-provided values win because the loader never overrides existing keys.
load_local_environment()

SUPPORTED_PROVIDERS = ("gemini", "openai", "groq")


def default_provider() -> str:
    """Return a supported environment choice without exposing configuration values."""
    provider = os.environ.get("LLM_PROVIDER", "gemini").strip().lower()
    return provider if provider in SUPPORTED_PROVIDERS else "gemini"


def _configured_llm(provider: str | None = None) -> EnvLLMClient:
    return EnvLLMClient() if provider is None else EnvLLMClient(provider=provider)


@dataclass(frozen=True)
class ReinvestigationRequest:
    note: str
    provider: str | None = None


def prepare_reinvestigation_request(note: str, provider: str) -> ReinvestigationRequest:
    return ReinvestigationRequest(note=note, provider=provider)

SPECIALIST_LABELS = {
    Specialist.SUSPECT_ANALYST: "Suspect Analyst",
    Specialist.TIMELINE_RECONCILER: "Timeline Reconciler",
}

PROGRESS_LABELS = {
    InvestigationEventKind.CASE_MATERIAL_CURATION_STARTED: (
        "📚 Case File Curator is normalizing case material..."
    ),
    InvestigationEventKind.CASE_MATERIAL_CURATION_COMPLETED: "✅ Case File Curator finished.",
    InvestigationEventKind.EVIDENCE_COLLECTION_STARTED: (
        "🔎 Evidence Collector is reading the case..."
    ),
    InvestigationEventKind.EVIDENCE_COLLECTION_COMPLETED: "✅ Evidence Collector finished.",
    InvestigationEventKind.SUSPECT_ANALYSIS_STARTED: "🕵️ Suspect Analyst is building profiles...",
    InvestigationEventKind.SUSPECT_ANALYSIS_COMPLETED: "✅ Suspect Analyst finished.",
    InvestigationEventKind.TIMELINE_RECONCILIATION_STARTED: (
        "🕰️ Timeline Reconciler is ordering events..."
    ),
    InvestigationEventKind.TIMELINE_RECONCILIATION_COMPLETED: "✅ Timeline Reconciler finished.",
    InvestigationEventKind.SKEPTIC_REVIEW_STARTED: (
        "🧐 Skeptic is reviewing the specialists' claims..."
    ),
    InvestigationEventKind.SKEPTIC_REVIEW_APPROVED: "✅ Skeptic approved the specialist claims.",
    InvestigationEventKind.SKEPTIC_REVIEW_REVISION_REQUESTED: (
        "⚠️ Skeptic requested a revision."
    ),
    InvestigationEventKind.SKEPTIC_REVIEW_EXHAUSTED: (
        "❌ Skeptic review exhausted; unresolved findings remain."
    ),
    InvestigationEventKind.LEAD_DETECTIVE_STARTED: (
        "🧑‍💼 Lead Detective is drafting the verdict..."
    ),
    InvestigationEventKind.LEAD_DETECTIVE_COMPLETED: "✅ Lead Detective finished.",
}


def _progress_label(event: InvestigationEvent) -> str:
    if event.kind is InvestigationEventKind.CONFIGURATION_VALIDATED:
        return f"ℹ️ {event.message}"
    if event.kind is InvestigationEventKind.STEP_FAILED:
        return f"❌ {event.agent_name} step failed: {event.message}"
    if event.kind is InvestigationEventKind.SPECIALIST_REVISION_STARTED:
        name = SPECIALIST_LABELS[event.specialist]
        return f"🔁 {name} is revising with reviewer feedback..."
    if event.kind is InvestigationEventKind.SPECIALIST_REVISION_COMPLETED:
        name = SPECIALIST_LABELS[event.specialist]
        return f"✅ {name} revision finished."
    if event.kind is InvestigationEventKind.REINVESTIGATION_REQUESTED:
        return f"🔁 Re-investigation requested: {event.message}"
    return PROGRESS_LABELS[event.kind]


def render_case_file(case_file: CaseFile) -> str:
    if not case_file.evidence:
        return "_No evidence collected yet._"
    lines = ["| ID | Statement | Classification |", "| --- | --- | --- |"]
    lines.extend(
        f"| {item.id} | {item.statement} | {item.classification.value} |"
        for item in case_file.evidence
    )
    return "\n".join(lines)


def render_case_material(case_file: CaseFile) -> str:
    """Render the inspectable canonical material supplied to the agents."""
    if not case_file.material_blocks:
        return ""
    lines = [
        f"**Normalized case material: {', '.join(case_file.source_text)}**",
        "",
        case_file.canonical_material or case_file.mystery_text,
    ]
    if case_file.material_warnings:
        lines.extend(
            [
                "",
                "**Material warnings**",
                *(f"- ⚠️ {warning}" for warning in case_file.material_warnings),
            ]
        )
    return "\n".join(lines)


def _render_claim(claim: Claim) -> str:
    if claim.status is ClaimStatus.UNKNOWN:
        return f"  - _unknown:_ {claim.statement}"
    citations = ", ".join(claim.evidence_ids)
    return f"  - {claim.statement} ({citations})"


def render_suspect_profiles(case_file: CaseFile) -> str:
    if not case_file.suspect_profiles:
        return "_No suspect profiles yet._"
    lines: list[str] = []
    for profile in case_file.suspect_profiles:
        lines.append(f"**{profile.suspect}**")
        lines.append("- Motive")
        lines.extend(_render_claim(claim) for claim in profile.motive)
        lines.append("- Opportunity")
        lines.extend(_render_claim(claim) for claim in profile.opportunity)
    return "\n".join(lines)


def render_timeline(case_file: CaseFile) -> str:
    if case_file.timeline.is_empty:
        return "_No timeline analysis yet._"

    lines = ["**Events**"]
    for event in case_file.timeline.events:
        citations = ", ".join(event.evidence_ids)
        if event.status is ClaimStatus.UNKNOWN:
            lines.append(
                f"- _uncertain / unordered:_ {event.statement} ({citations})"
            )
        else:
            lines.append(f"- {event.time} — {event.statement} ({citations})")

    lines.append("**Gaps and contradictions**")
    for issue in case_file.timeline.issues:
        citations = ", ".join(issue.evidence_ids)
        lines.append(f"- {issue.kind.value.title()}: {issue.statement} ({citations})")
    return "\n".join(lines)


def render_skeptic_reviews(case_file: CaseFile) -> str:
    if not case_file.skeptic_reviews:
        return "_No Skeptic review yet._"
    lines: list[str] = []
    for round_number, review in enumerate(case_file.skeptic_reviews, start=1):
        outcome_label = review.outcome.value.replace("_", " ").title()
        lines.append(f"**Round {round_number}: {outcome_label}**")
        if not review.findings:
            lines.append("- No findings.")
            continue
        for finding in review.findings:
            specialist_name = SPECIALIST_LABELS[finding.specialist]
            kind_label = finding.kind.value.replace("_", " ")
            lines.append(
                f"- {specialist_name} — {kind_label}: {finding.claim!r} — {finding.explanation}"
            )
    return "\n".join(lines)


REVIEW_STATUS_MESSAGES = {
    VerdictReviewStatus.AWAITING_REVIEW: "_This verdict is a proposal pending human review._",
    VerdictReviewStatus.ACCEPTED: "_Human decision: Accepted._",
    VerdictReviewStatus.REJECTED: "_Human decision: Rejected._",
    VerdictReviewStatus.REINVESTIGATION_REQUESTED: "_Human decision: Re-investigation requested._",
}


def render_verdict(case_file: CaseFile) -> str:
    if case_file.verdict is None:
        return "_No verdict yet._"
    verdict = case_file.verdict
    lines = [f"**Confidence: {verdict.confidence}/100**", "", "**Ranked conclusions**"]
    for conclusion in verdict.conclusions:
        citations = ", ".join(conclusion.evidence_ids)
        lines.append(
            f"{conclusion.rank}. **{conclusion.suspect}** — {conclusion.explanation} ({citations})"
        )

    lines.append("")
    lines.append("**Limitations**")
    if verdict.limitations:
        lines.extend(f"- {limitation}" for limitation in verdict.limitations)
    else:
        lines.append("- None noted.")

    lines.append("")
    lines.append(REVIEW_STATUS_MESSAGES[verdict.review_status])
    return "\n".join(lines)


def _verdict_awaiting_review(case_file: CaseFile | None) -> bool:
    return bool(case_file is not None and case_file.verdict is not None and case_file.verdict.is_awaiting_review)


def sync_review_controls(case_file: CaseFile | None) -> tuple[dict, dict, dict]:
    """Enable Accept/Reject/Request re-investigation only while awaiting review."""
    interactive = _verdict_awaiting_review(case_file)
    # Component-update dictionaries are accepted by Gradio callbacks across
    # supported releases; the old module-level ``gr.update`` helper is not.
    update = {"interactive": interactive}
    return update, update, update


def disable_review_controls() -> tuple[dict, dict, dict]:
    """Disable the review controls immediately when a new pass starts.

    Without this, buttons left enabled by a prior verdict would stay
    clickable for the whole duration of a new run, before any new verdict
    exists to review.
    """
    return sync_review_controls(None)


def _handle_review_decision(
    case_file: CaseFile | None, decide: Callable[[CaseFile], None]
) -> tuple[str, CaseFile | None, dict, dict, dict]:
    """Apply a human decision, ignoring one that no longer applies.

    A decision on a missing verdict, or a repeat decision on a verdict that
    already has one, raises `VerdictReviewError`; that is a predictable
    no-op here rather than a crash or a silently overwritten decision.
    """
    if case_file is not None:
        try:
            decide(case_file)
        except VerdictReviewError:
            pass
    verdict_markdown = render_verdict(case_file) if case_file else "_No verdict yet._"
    accept_update, reject_update, reinvestigate_update = sync_review_controls(case_file)
    return verdict_markdown, case_file, accept_update, reject_update, reinvestigate_update


def handle_accept_verdict(
    case_file: CaseFile | None,
) -> tuple[str, CaseFile | None, dict, dict, dict]:
    return _handle_review_decision(case_file, CaseFile.accept_verdict)


def handle_reject_verdict(
    case_file: CaseFile | None,
) -> tuple[str, CaseFile | None, dict, dict, dict]:
    return _handle_review_decision(case_file, CaseFile.reject_verdict)


def _render_panels(case_file: CaseFile | None) -> tuple[str, str, str, str, str]:
    if case_file is None:
        return "", "", "", "", ""
    return (
        render_case_file(case_file),
        render_suspect_profiles(case_file),
        render_timeline(case_file),
        render_skeptic_reviews(case_file),
        render_verdict(case_file),
    )


def run_investigation(
    mystery_text: str,
    provider: str | None = None,
    uploaded_files: list[str] | None = None,
) -> Iterator[tuple[str, str, str, str, str, str, CaseFile | None]]:
    llm = _configured_llm(provider)
    transcript_lines: list[str] = []
    material_preview_rendered = False
    for event in stream_investigation(mystery_text, llm, uploaded_files):
        if event.kind is InvestigationEventKind.VALIDATION_ERROR:
            yield event.message or "", "", "", "", "", "", None
            return
        transcript_lines.append(_progress_label(event))
        if not material_preview_rendered and event.case_file is not None:
            preview = render_case_material(event.case_file)
            if preview:
                transcript_lines.append(preview)
                material_preview_rendered = True
        yield ("\n".join(transcript_lines), *_render_panels(event.case_file), event.case_file)


def run_reinvestigation(
    case_file: CaseFile | None,
    transcript_markdown: str,
    request: ReinvestigationRequest | str,
) -> Iterator[tuple[str, str, str, str, str, str, CaseFile | None]]:
    """Continue the live transcript into a guided re-investigation pass.

    The previous verdict is rendered into the transcript at the moment the
    request is recorded, before the pipeline restarts from suspect
    analysis, so the prior run and the new pass stay distinguishable. A
    verdict that no longer awaits review (e.g. a stale click racing a
    decision already recorded elsewhere) is a predictable no-op here, same
    as `_handle_review_decision` for Accept/Reject.
    """
    if isinstance(request, str):
        request = ReinvestigationRequest(note=request)
    llm = _configured_llm(request.provider)
    transcript_lines = [transcript_markdown] if transcript_markdown else []
    if case_file is None:
        yield "\n".join(transcript_lines), "", "", "", "", "_No verdict yet._", None
        return

    try:
        for event in stream_reinvestigation(case_file, request.note, llm):
            if event.kind is InvestigationEventKind.VALIDATION_ERROR:
                transcript_lines.append(event.message or "")
                yield ("\n".join(transcript_lines), *_render_panels(case_file), case_file)
                return
            if event.kind is InvestigationEventKind.REINVESTIGATION_REQUESTED:
                transcript_lines.append(render_verdict(event.case_file))
            transcript_lines.append(_progress_label(event))
            yield ("\n".join(transcript_lines), *_render_panels(event.case_file), event.case_file)
    except VerdictReviewError:
        yield ("\n".join(transcript_lines), *_render_panels(case_file), case_file)


def build_interface() -> gr.Blocks:
    with gr.Blocks(title="Sherlok") as interface:
        gr.Markdown("# Sherlok")
        mystery_input = gr.Textbox(
            label="Mystery text",
            placeholder="Paste a fictional mystery to investigate...",
            lines=10,
        )
        material_upload = gr.File(
            label="Case materials (PDF, DOCX, Markdown, or plain text)",
            file_count="multiple",
            file_types=[".pdf", ".docx", ".md", ".markdown", ".txt"],
            type="filepath",
        )
        provider_input = gr.Dropdown(
            choices=list(SUPPORTED_PROVIDERS), value=default_provider(), label="Provider"
        )
        start_button = gr.Button("Start investigation")
        transcript = gr.Markdown(label="Investigation transcript")
        evidence_table = gr.Markdown(label="Collected evidence")
        suspect_profiles = gr.Markdown(label="Suspect profiles")
        timeline = gr.Markdown(label="Timeline analysis")
        skeptic_panel = gr.Markdown(label="Skeptic review")
        verdict_panel = gr.Markdown(label="Verdict")
        with gr.Row():
            accept_button = gr.Button("Accept", interactive=False)
            reject_button = gr.Button("Reject", interactive=False)
        guidance_input = gr.Textbox(
            label="Guidance note for re-investigation",
            placeholder="e.g. Evidence E-03 is unavailable; do not rely on it.",
            lines=3,
        )
        reinvestigate_button = gr.Button("Request re-investigation", interactive=False)
        case_file_state = gr.State(None)
        reinvestigation_request_state = gr.State(
            ReinvestigationRequest(note="", provider=default_provider())
        )

        review_outputs = [accept_button, reject_button, reinvestigate_button]

        provider_input.change(
            fn=prepare_reinvestigation_request,
            inputs=[guidance_input, provider_input],
            outputs=reinvestigation_request_state,
        )
        guidance_input.change(
            fn=prepare_reinvestigation_request,
            inputs=[guidance_input, provider_input],
            outputs=reinvestigation_request_state,
        )

        start_button.click(
            fn=disable_review_controls,
            outputs=review_outputs,
        ).then(
            fn=run_investigation,
            inputs=[mystery_input, provider_input, material_upload],
            outputs=[
                transcript,
                evidence_table,
                suspect_profiles,
                timeline,
                skeptic_panel,
                verdict_panel,
                case_file_state,
            ],
        ).then(
            fn=sync_review_controls,
            inputs=case_file_state,
            outputs=review_outputs,
        )

        accept_button.click(
            fn=handle_accept_verdict,
            inputs=case_file_state,
            outputs=[verdict_panel, case_file_state, *review_outputs],
        )
        reject_button.click(
            fn=handle_reject_verdict,
            inputs=case_file_state,
            outputs=[verdict_panel, case_file_state, *review_outputs],
        )
        reinvestigate_button.click(
            fn=disable_review_controls,
            outputs=review_outputs,
        ).then(
            fn=run_reinvestigation,
            inputs=[case_file_state, transcript, reinvestigation_request_state],
            outputs=[
                transcript,
                evidence_table,
                suspect_profiles,
                timeline,
                skeptic_panel,
                verdict_panel,
                case_file_state,
            ],
        ).then(
            fn=sync_review_controls,
            inputs=case_file_state,
            outputs=review_outputs,
        ).then(
            fn=lambda: "",
            outputs=guidance_input,
        )
    return interface


def launch_interface() -> None:
    """Launch Gradio with a container-safe host and configurable port."""
    port = int(os.environ.get("PORT", "7860"))
    build_interface().launch(server_name="0.0.0.0", server_port=port)


if __name__ == "__main__":
    launch_interface()
