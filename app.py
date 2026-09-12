"""Gradio presentation layer.

Renders mystery input, streams pipeline progress, and displays the
resulting case file. Contains no provider calls or investigation
reasoning; all of that lives behind `orchestrator.stream_investigation`.
"""

from __future__ import annotations

from collections.abc import Callable, Iterator
from dataclasses import dataclass
import os
from pathlib import Path

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
APP_TITLE = "Sherlok — Multi-agent case investigator"
LOGO_PATH = Path(__file__).parent / "assets" / "sherlok-logo-minimal.png"


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
        "Case File Curator is normalizing the supplied material."
    ),
    InvestigationEventKind.CASE_MATERIAL_CURATION_COMPLETED: "Case File Curator finished.",
    InvestigationEventKind.EVIDENCE_COLLECTION_STARTED: (
        "Evidence Collector is reading the case."
    ),
    InvestigationEventKind.EVIDENCE_COLLECTION_COMPLETED: "Evidence Collector finished.",
    InvestigationEventKind.SUSPECT_ANALYSIS_STARTED: "Suspect Analyst is building profiles.",
    InvestigationEventKind.SUSPECT_ANALYSIS_COMPLETED: "Suspect Analyst finished.",
    InvestigationEventKind.TIMELINE_RECONCILIATION_STARTED: (
        "Timeline Reconciler is ordering events."
    ),
    InvestigationEventKind.TIMELINE_RECONCILIATION_COMPLETED: "Timeline Reconciler finished.",
    InvestigationEventKind.SKEPTIC_REVIEW_STARTED: (
        "Skeptic is reviewing the specialists' claims."
    ),
    InvestigationEventKind.SKEPTIC_REVIEW_APPROVED: "Skeptic approved the specialist claims.",
    InvestigationEventKind.SKEPTIC_REVIEW_REVISION_REQUESTED: (
        "Skeptic requested a revision."
    ),
    InvestigationEventKind.SKEPTIC_REVIEW_EXHAUSTED: (
        "Skeptic review exhausted; unresolved findings remain."
    ),
    InvestigationEventKind.LEAD_DETECTIVE_STARTED: (
        "Lead Detective is drafting the verdict."
    ),
    InvestigationEventKind.LEAD_DETECTIVE_COMPLETED: "Lead Detective finished.",
}


def _progress_label(event: InvestigationEvent) -> str:
    if event.kind is InvestigationEventKind.CONFIGURATION_VALIDATED:
        return event.message or "Configuration validated."
    if event.kind is InvestigationEventKind.STEP_FAILED:
        return f"ERROR — {event.agent_name} step failed: {event.message}"
    if event.kind is InvestigationEventKind.SPECIALIST_REVISION_STARTED:
        name = SPECIALIST_LABELS[event.specialist]
        return f"{name} is revising with reviewer feedback."
    if event.kind is InvestigationEventKind.SPECIALIST_REVISION_COMPLETED:
        name = SPECIALIST_LABELS[event.specialist]
        return f"{name} revision finished."
    if event.kind is InvestigationEventKind.REINVESTIGATION_REQUESTED:
        return f"🔁 Re-investigation requested: {event.message}"
    return PROGRESS_LABELS[event.kind]


def render_agent_activity(transcript: str) -> str:
    """Render the current and completed agent work apart from the raw event log."""
    stage_names = (
        "Case File Curator",
        "Evidence Collector",
        "Suspect Analyst",
        "Timeline Reconciler",
        "Skeptic",
        "Lead Detective",
        "LLM configuration",
        "Re-investigation",
    )
    event_lines = [
        line
        for line in transcript.splitlines()
        if line
        and not line.startswith("ERROR —")
        and any(stage_name in line for stage_name in stage_names)
    ]
    if not event_lines:
        return "_Waiting for an investigation to start._"
    latest = event_lines[-1]
    completed = [line for line in event_lines if "finished." in line or "approved" in line]
    lines = ["**Latest update**", latest]
    if completed:
        lines.extend(["", "**Completed stages**", *(f"- {line}" for line in completed)])
    return "\n".join(lines)


def render_investigation_errors(transcript: str) -> str:
    """Render actionable failures separately so they are not buried in progress."""
    errors = [line.removeprefix("ERROR — ") for line in transcript.splitlines() if line.startswith("ERROR —")]
    if not errors:
        return "_No errors reported. If a stage cannot continue, its name and reason appear here._"
    return "\n".join(["**Investigation stopped**", *(f"- {error}" for error in errors)])


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


def sync_review_controls(
    case_file: CaseFile | None,
) -> tuple[gr.Button, gr.Button, gr.Button]:
    """Enable Accept/Reject/Request re-investigation only while awaiting review."""
    interactive = _verdict_awaiting_review(case_file)
    # Gradio 6 applies component update objects. Plain dictionaries are
    # rendered as button values, which leaves the controls effectively locked.
    return (
        gr.Button("Accept proposed verdict", interactive=interactive),
        gr.Button("Reject proposed verdict", interactive=interactive),
        gr.Button("Request a focused re-investigation", interactive=interactive),
    )


def disable_review_controls() -> tuple[gr.Button, gr.Button, gr.Button]:
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
            message = event.message or "The supplied case material could not be investigated."
            yield f"ERROR — Input validation failed: {message}", "", "", "", "", "", None
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
                message = event.message or "The re-investigation request could not be processed."
                transcript_lines.append(f"ERROR — Input validation failed: {message}")
                yield ("\n".join(transcript_lines), *_render_panels(case_file), case_file)
                return
            if event.kind is InvestigationEventKind.REINVESTIGATION_REQUESTED:
                transcript_lines.append(render_verdict(event.case_file))
            transcript_lines.append(_progress_label(event))
            yield ("\n".join(transcript_lines), *_render_panels(event.case_file), event.case_file)
    except VerdictReviewError:
        yield ("\n".join(transcript_lines), *_render_panels(case_file), case_file)


def run_investigation_view(
    mystery_text: str,
    provider: str | None = None,
    uploaded_files: list[str] | None = None,
) -> Iterator[tuple[str, str, str, str, str, str, str, str, CaseFile | None]]:
    """Adapt pipeline updates to the distinct live UI surfaces."""
    for update in run_investigation(mystery_text, provider, uploaded_files):
        transcript, *panels, case_file = update
        yield (
            render_agent_activity(transcript),
            render_investigation_errors(transcript),
            transcript,
            *panels,
            case_file,
        )


def run_reinvestigation_view(
    case_file: CaseFile | None,
    transcript_markdown: str,
    request: ReinvestigationRequest | str,
) -> Iterator[tuple[str, str, str, str, str, str, str, str, CaseFile | None]]:
    """Adapt re-investigation updates to the distinct live UI surfaces."""
    for update in run_reinvestigation(case_file, transcript_markdown, request):
        transcript, *panels, updated_case_file = update
        yield (
            render_agent_activity(transcript),
            render_investigation_errors(transcript),
            transcript,
            *panels,
            updated_case_file,
        )


INTERFACE_CSS = """
:root {
    color-scheme: dark;
    --sherlok-ink: #f1f7f8;
    --sherlok-muted: #9fb2bd;
    --sherlok-line: #294151;
    --sherlok-surface: #0d1c29;
    --sherlok-surface-raised: #122433;
    --sherlok-input: #091722;
    --sherlok-canvas: #07131d;
    --sherlok-accent: #20c7bd;
    --sherlok-accent-hover: #3bd6cc;
    --sherlok-alert: #f19a89;
    --body-background-fill: var(--sherlok-canvas);
    --body-text-color: var(--sherlok-ink);
    --block-background-fill: var(--sherlok-surface);
    --block-border-color: var(--sherlok-line);
    --block-label-text-color: var(--sherlok-ink);
    --input-background-fill: var(--sherlok-input);
    --input-border-color: var(--sherlok-line);
    --input-placeholder-color: var(--sherlok-muted);
    --input-text-color: var(--sherlok-ink);
    --button-primary-background-fill: var(--sherlok-accent);
    --button-primary-text-color: #031817;
    --button-secondary-background-fill: var(--sherlok-surface-raised);
    --button-secondary-text-color: var(--sherlok-ink);
}
.dark, html, body {
    background: var(--sherlok-canvas) !important;
    color: var(--sherlok-ink) !important;
}
body {
    background-image:
        radial-gradient(circle at 12% -10%, rgba(32, 199, 189, .12), transparent 28rem),
        radial-gradient(circle at 92% 12%, rgba(28, 71, 102, .2), transparent 34rem) !important;
    background-attachment: fixed !important;
}
.gradio-container {
    max-width: 1440px !important;
    margin: 0 auto !important;
    padding-top: 1.5rem !important;
    background: transparent !important;
    color: var(--sherlok-ink) !important;
    color-scheme: dark;
    font-family: "Avenir Next", Avenir, "Segoe UI", sans-serif !important;
}
.gradio-container .prose,
.gradio-container .prose *,
.gradio-container label,
.gradio-container p { color: var(--sherlok-ink) !important; }
.gradio-container textarea,
.gradio-container input,
.gradio-container select,
.gradio-container .wrap {
    background-color: var(--sherlok-input) !important;
    border-color: var(--sherlok-line) !important;
    color: var(--sherlok-ink) !important;
}
.gradio-container textarea::placeholder,
.gradio-container input::placeholder { color: var(--sherlok-muted) !important; }
#sherlok-header {
    align-items: center;
    gap: 1.1rem;
    margin-bottom: 1.25rem;
    padding: .35rem .25rem 1.25rem;
    border-bottom: 1px solid var(--sherlok-line);
}
#sherlok-logo {
    flex: 0 0 5.75rem !important;
    width: 5.75rem !important;
    min-width: 5.75rem !important;
    height: 5.75rem !important;
    background: transparent !important;
}
#sherlok-logo img {
    object-fit: contain !important;
    filter: drop-shadow(0 .8rem 1.4rem rgba(0, 7, 14, .38));
}
#sherlok-title { flex: 1 1 32rem; }
#sherlok-title .sherlok-kicker {
    margin: 0 0 .35rem;
    color: var(--sherlok-accent) !important;
    font-size: .76rem;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
}
#sherlok-title h1 {
    margin: 0;
    color: var(--sherlok-ink);
    font-size: clamp(2.1rem, 5vw, 3.65rem);
    font-weight: 700;
    line-height: .98;
    letter-spacing: -.055em;
}
#sherlok-title .sherlok-subtitle {
    max-width: 62ch;
    margin: .65rem 0 0;
    color: var(--sherlok-muted) !important;
    font-size: 1rem;
    line-height: 1.55;
    text-wrap: pretty;
}
#intake-panel, #status-panel, #verdict-panel {
    background: rgba(13, 28, 41, .92);
    border: 1px solid var(--sherlok-line);
    border-radius: 14px;
    box-shadow: 0 1.25rem 3.5rem rgba(0, 8, 15, .2);
    padding: 1.1rem;
}
#agent-activity, #investigation-errors, #investigation-log {
    border-left: 3px solid var(--sherlok-accent);
    padding-left: .85rem;
    overflow-wrap: anywhere;
    word-break: break-word;
}
#agent-activity, #investigation-log { max-height: 17rem; overflow-y: auto; }
#investigation-errors { border-left-color: var(--sherlok-alert); min-height: 3.25rem; }
#review-actions { gap: .65rem; flex-wrap: wrap; }
#review-actions button { min-width: 11rem; }
.gradio-container button {
    background: var(--sherlok-surface-raised) !important;
    border-color: var(--sherlok-line) !important;
    color: var(--sherlok-ink) !important;
    transition: background-color 180ms ease, border-color 180ms ease, transform 180ms ease;
}
.gradio-container button.primary {
    background: var(--sherlok-accent) !important;
    color: #031817 !important;
}
.gradio-container button:hover {
    background: #183144 !important;
    border-color: #3b5b6e !important;
}
.gradio-container button.primary:hover {
    background: var(--sherlok-accent-hover) !important;
}
.gradio-container button:focus-visible,
.gradio-container input:focus-visible,
.gradio-container textarea:focus-visible,
.gradio-container select:focus-visible {
    outline: 3px solid rgba(32, 199, 189, .4) !important;
    outline-offset: 2px;
}
button:active { transform: translateY(1px); }
@media (max-width: 768px) {
    .gradio-container { padding-left: .75rem !important; padding-right: .75rem !important; }
    #sherlok-header { gap: .8rem; }
    #sherlok-logo {
        flex-basis: 4.5rem !important;
        width: 4.5rem !important;
        min-width: 4.5rem !important;
        height: 4.5rem !important;
    }
    #intake-panel, #status-panel, #verdict-panel { padding: .8rem; }
    #review-actions button { width: 100%; }
}
"""


def build_interface() -> gr.Blocks:
    with gr.Blocks(title=APP_TITLE) as interface:
        with gr.Row(equal_height=True, elem_id="sherlok-header"):
            gr.Image(
                value=str(LOGO_PATH),
                format="png",
                image_mode="RGBA",
                height=92,
                width=92,
                show_label=False,
                buttons=[],
                container=False,
                interactive=False,
                alt_text="Sherlok detective logo",
                elem_id="sherlok-logo",
            )
            gr.HTML(
                """
                <header aria-label="Sherlok application">
                    <p class="sherlok-kicker">Multi-agent case investigator</p>
                    <h1>Sherlok</h1>
                    <p class="sherlok-subtitle">
                        Turn fictional case material into traceable evidence, challenged analysis,
                        and a human-reviewed verdict.
                    </p>
                </header>
                """,
                elem_id="sherlok-title",
            )
        with gr.Row(equal_height=False):
            with gr.Column(scale=5, elem_id="intake-panel"):
                gr.Markdown("## 1. Add case material\nPaste text, upload documents, or use both.")
                mystery_input = gr.Textbox(
                    label="Fictional mystery text",
                    placeholder="Paste the fictional mystery that the detectives should investigate...",
                    info="This is the source material for the case file.",
                    lines=10,
                )
                material_upload = gr.File(
                    label="Supporting case files",
                    file_count="multiple",
                    file_types=[".pdf", ".docx", ".md", ".markdown", ".txt"],
                    type="filepath",
                )
                provider_input = gr.Dropdown(
                    choices=list(SUPPORTED_PROVIDERS), value=default_provider(), label="Provider"
                )
                start_button = gr.Button("Run investigation", variant="primary")
            with gr.Column(scale=4, elem_id="status-panel"):
                gr.Markdown("## 2. Follow the investigation")
                gr.Markdown("### Agent activity")
                activity_panel = gr.Markdown(
                    "_Waiting for an investigation to start._", elem_id="agent-activity"
                )
                gr.Markdown("### Errors requiring attention")
                error_panel = gr.Markdown(
                    "_No errors reported. If a stage cannot continue, its name and reason appear here._",
                    elem_id="investigation-errors",
                )
                with gr.Accordion("Full event log", open=False):
                    transcript = gr.Markdown(elem_id="investigation-log")

        with gr.Row(equal_height=False):
            with gr.Column(scale=5):
                with gr.Tabs():
                    with gr.Tab("Evidence"):
                        evidence_table = gr.Markdown("_Evidence will appear after collection._")
                    with gr.Tab("Suspect profiles"):
                        suspect_profiles = gr.Markdown("_Profiles will appear after analysis._")
                    with gr.Tab("Timeline"):
                        timeline = gr.Markdown("_Timeline analysis will appear here._")
                    with gr.Tab("Skeptic review"):
                        skeptic_panel = gr.Markdown("_Skeptic findings will appear here._")
            with gr.Column(scale=4, elem_id="verdict-panel"):
                gr.Markdown("## 3. Review the proposed verdict\nThe detectives propose; you decide.")
                verdict_panel = gr.Markdown("_No verdict yet._")
                gr.Markdown("### Record your decision")
                with gr.Row(elem_id="review-actions"):
                    accept_button = gr.Button("Accept proposed verdict", interactive=False)
                    reject_button = gr.Button("Reject proposed verdict", interactive=False)
                guidance_input = gr.Textbox(
                    label="Guidance for re-investigation",
                    placeholder="Describe the evidence or question the next pass should address.",
                    info="Required only when requesting a focused re-investigation.",
                    lines=3,
                )
                reinvestigate_button = gr.Button(
                    "Request a focused re-investigation", interactive=False
                )
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
            fn=run_investigation_view,
            inputs=[mystery_input, provider_input, material_upload],
            outputs=[
                activity_panel,
                error_panel,
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
            fn=run_reinvestigation_view,
            inputs=[case_file_state, transcript, reinvestigation_request_state],
            outputs=[
                activity_panel,
                error_panel,
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
    build_interface().launch(server_name="0.0.0.0", server_port=port, css=INTERFACE_CSS)


if __name__ == "__main__":
    launch_interface()
