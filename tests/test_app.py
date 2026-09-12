from __future__ import annotations

import pytest

import gradio as gr

from app import (
    INTERFACE_CSS,
    build_interface,
    default_provider,
    launch_interface,
    render_case_material,
    render_skeptic_reviews,
    render_suspect_profiles,
)


def test_launch_interface_binds_to_all_container_interfaces_and_port_from_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class Interface:
        def __init__(self) -> None:
            self.launch_arguments: dict[str, object] | None = None

        def launch(self, **kwargs: object) -> None:
            self.launch_arguments = kwargs

    interface = Interface()
    monkeypatch.setattr("app.build_interface", lambda: interface)
    monkeypatch.setenv("PORT", "8080")

    launch_interface()

    assert interface.launch_arguments == {
        "server_name": "0.0.0.0",
        "server_port": 8080,
        "css": INTERFACE_CSS,
    }


def test_interface_can_be_constructed_after_declared_dependencies_are_installed() -> None:
    interface = build_interface()

    assert isinstance(interface, gr.Blocks)
    assert interface.title == "Sherlok — Multi-agent case investigator"


def test_interface_header_uses_the_sherlok_logo_and_explains_the_app() -> None:
    interface = build_interface()
    components = interface.get_config_file()["components"]
    props_by_element_id = {
        component["props"].get("elem_id"): component["props"]
        for component in components
        if component["props"].get("elem_id")
    }

    logo = props_by_element_id["sherlok-logo"]
    header_copy = props_by_element_id["sherlok-title"]["value"]

    assert logo["value"]["orig_name"] == "sherlok-logo-minimal.png"
    assert "<h1>Sherlok</h1>" in header_copy
    assert "Multi-agent case investigator" in header_copy


def test_interface_uses_clear_action_labels_and_separates_live_status_from_errors() -> None:
    interface = build_interface()
    components = interface.get_config_file()["components"]
    labels = {
        candidate
        for component in components
        if isinstance(
            (candidate := component["props"].get("value") or component["props"].get("label")),
            str,
        )
    }
    element_ids = {component["props"].get("elem_id") for component in components}

    assert "Run investigation" in labels
    assert "Accept proposed verdict" in labels
    assert "Reject proposed verdict" in labels
    assert "Request a focused re-investigation" in labels
    assert "agent-activity" in element_ids
    assert "investigation-errors" in element_ids


def test_interface_styles_use_a_consistent_dark_palette() -> None:
    assert "color-scheme: dark" in INTERFACE_CSS
    assert "--sherlok-canvas: #07131d" in INTERFACE_CSS
    assert "--sherlok-ink: #f1f7f8" in INTERFACE_CSS
    assert "--sherlok-accent: #20c7bd" in INTERFACE_CSS
from case_file import (
    CaseFile,
    Claim,
    ClaimStatus,
    SkepticFinding,
    SkepticFindingKind,
    SkepticReview,
    SkepticReviewOutcome,
    Specialist,
    SuspectProfile,
)
from case_material import CaseFileCurator, CaseMaterialInput


def test_render_suspect_profiles_displays_supported_and_unknown_claims() -> None:
    case_file = CaseFile(mystery_text="A necklace vanished from the study overnight.")
    case_file.suspect_profiles = [
        SuspectProfile(
            suspect="The Housekeeper",
            motive=(
                Claim(statement="Owed the victim money.", status=ClaimStatus.SUPPORTED, evidence_ids=("E-02",)),
            ),
            opportunity=(
                Claim(statement="No record places her near the study.", status=ClaimStatus.UNKNOWN),
            ),
        )
    ]

    markdown = render_suspect_profiles(case_file)

    assert "The Housekeeper" in markdown
    assert "Owed the victim money. (E-02)" in markdown
    assert "_unknown:_ No record places her near the study." in markdown


def test_provider_dropdown_is_the_only_provider_configuration_control(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "groq")

    interface = build_interface()
    labels = {
        component["props"].get("label")
        for component in interface.get_config_file()["components"]
    }

    assert default_provider() == "groq"
    assert "Provider" in labels
    assert "API key (session only)" not in labels
    assert "Model (optional for Gemini and OpenAI)" not in labels


def test_unsupported_environment_provider_defaults_to_gemini(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "unsupported")

    assert default_provider() == "gemini"


def test_render_suspect_profiles_before_analysis_shows_placeholder() -> None:
    case_file = CaseFile(mystery_text="A necklace vanished from the study overnight.")

    assert render_suspect_profiles(case_file) == "_No suspect profiles yet._"


def test_render_skeptic_reviews_before_review_shows_placeholder() -> None:
    case_file = CaseFile(mystery_text="A necklace vanished from the study overnight.")

    assert render_skeptic_reviews(case_file) == "_No Skeptic review yet._"


def test_render_skeptic_reviews_displays_rounds_and_findings() -> None:
    case_file = CaseFile(mystery_text="A necklace vanished from the study overnight.")
    case_file.skeptic_reviews = [
        SkepticReview(
            outcome=SkepticReviewOutcome.REVISION_REQUESTED,
            findings=(
                SkepticFinding(
                    specialist=Specialist.SUSPECT_ANALYST,
                    claim="The key card proves she was in the study.",
                    kind=SkepticFindingKind.UNSUPPORTED_REASONING,
                    explanation="Card use establishes use of the card, not who held it.",
                ),
            ),
        ),
        SkepticReview(outcome=SkepticReviewOutcome.APPROVED),
    ]

    markdown = render_skeptic_reviews(case_file)

    assert "Round 1: Revision Requested" in markdown
    assert "Suspect Analyst — unsupported reasoning" in markdown
    assert "The key card proves she was in the study." in markdown
    assert "Round 2: Approved" in markdown
    assert "No findings." in markdown


def test_render_case_material_shows_sources_normalized_content_and_warnings() -> None:
    curated = CaseFileCurator().curate(
        [CaseMaterialInput(display_name="report.md", content="# Incident\n\nThe alarm sounded.")]
    )
    case_file = CaseFile(
        mystery_text=curated.canonical_text,
        source_text=curated.source_text,
        material_blocks=curated.blocks,
        material_warnings=["unreadable.txt: The uploaded text is not valid UTF-8."],
    )

    preview = render_case_material(case_file)

    assert "Normalized case material: report.md" in preview
    assert "# Incident" in preview
    assert "The alarm sounded." in preview
    assert "Material warnings" in preview
    assert "unreadable.txt" in preview
