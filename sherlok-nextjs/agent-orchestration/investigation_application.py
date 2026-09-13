"""Application interface for starting and observing an investigation."""

from __future__ import annotations

from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from threading import Condition, RLock, Thread
from uuid import uuid4

from pydantic import BaseModel, Field

from case_file import CaseFile, Specialist
from case_material import CaseMaterialInput
from llm_client import LLMClient
from orchestrator import (
    EMPTY_GUIDANCE_MESSAGE,
    InvestigationEvent,
    InvestigationEventKind,
    stream_investigation,
    stream_reinvestigation,
)


class InvestigationApplicationError(ValueError):
    """Raised when the application interface cannot fulfill a request."""


class StartInvestigationRequest(BaseModel):
    """Participant material and provider selection for one new case file."""

    pasted_material: str = ""
    uploads: tuple[CaseMaterialInput, ...] = ()
    provider: str | None = None


class StartedInvestigation(BaseModel):
    """The stable handle returned after accepted case material starts a run."""

    investigation_id: str


class HumanDecision(str, Enum):
    """The review decisions a User may record for a proposed verdict."""

    ACCEPT = "accept"
    REJECT = "reject"


class DecisionRequest(BaseModel):
    """One human decision for a verdict that awaits review."""

    action: HumanDecision


class ReinvestigationRequest(BaseModel):
    """Guidance and provider selection for one re-investigation."""

    note: str
    provider: str | None = None


class InvestigationSnapshot(BaseModel):
    """The displayable projection of one case file at its current state."""

    investigation_id: str
    case_file: CaseFile | None = None
    is_complete: bool


class InvestigationStatus(str, Enum):
    """Public workflow statuses understood by the investigation workspace."""

    QUEUED = "queued"
    WORKING = "working"
    COMPLETED = "completed"
    REVISING = "revising"
    FAILED = "failed"
    AWAITING_REVIEW = "awaiting_review"


class PublicInvestigationEvent(BaseModel):
    """One safe, ordered event that a presentation adapter can expose."""

    event_id: int = Field(ge=1)
    investigation_id: str
    event_type: str
    stage: str
    status: InvestigationStatus
    timestamp: datetime
    message: str | None = None
    evidence_ids: tuple[str, ...] = ()
    specialist: Specialist | None = None


@dataclass
class _InvestigationRecord:
    case_file: CaseFile | None = None
    events: list[PublicInvestigationEvent] = field(default_factory=list)
    is_complete: bool = False


class InvestigationApplication:
    """Run the existing pipeline behind a compact, presentation-safe interface."""

    def __init__(self, llm_factory: Callable[[str | None], LLMClient]) -> None:
        self._llm_factory = llm_factory
        self._records: dict[str, _InvestigationRecord] = {}
        self._changes = Condition(RLock())

    def start(self, request: StartInvestigationRequest) -> StartedInvestigation:
        """Curate supplied material, run the investigation, and retain its public record."""
        investigation_id = uuid4().hex
        with self._changes:
            self._records[investigation_id] = _InvestigationRecord()
        Thread(
            target=self._run_pipeline,
            args=(
                investigation_id,
                stream_investigation(
                    request.pasted_material,
                    self._llm_factory(request.provider),
                    list(request.uploads),
                ),
            ),
            daemon=True,
        ).start()
        return StartedInvestigation(investigation_id=investigation_id)

    def snapshot(self, investigation_id: str) -> InvestigationSnapshot:
        """Return the current displayable state for a started investigation."""
        record = self._record_for(investigation_id)
        return InvestigationSnapshot(
            investigation_id=investigation_id,
            case_file=record.case_file.model_copy(deep=True) if record.case_file else None,
            is_complete=record.is_complete,
        )

    def events(
        self, investigation_id: str, after_event_id: int = 0
    ) -> Iterator[PublicInvestigationEvent]:
        """Return public events after an optional last-seen event ID."""
        if after_event_id < 0:
            raise InvestigationApplicationError("The last-seen event ID cannot be negative.")
        self._record_for(investigation_id)
        return self._events_after(investigation_id, after_event_id)

    def decide(
        self, investigation_id: str, request: DecisionRequest
    ) -> InvestigationSnapshot:
        """Record an Accept or Reject decision for the current proposed verdict."""
        with self._changes:
            record = self._record_for(investigation_id)
            case_file = self._completed_case_file(record)
            if request.action is HumanDecision.ACCEPT:
                case_file.accept_verdict()
            else:
                case_file.reject_verdict()
            event = PublicInvestigationEvent(
                event_id=len(record.events) + 1,
                investigation_id=investigation_id,
                event_type="human_decision_recorded",
                stage="human_review",
                status=InvestigationStatus.COMPLETED,
                timestamp=datetime.now(UTC),
                message=request.action.value,
                evidence_ids=tuple(item.id for item in case_file.evidence),
            )
            record.case_file = case_file
            record.events.append(event)
            self._changes.notify_all()
        return self.snapshot(investigation_id)

    def reinvestigate(
        self, investigation_id: str, request: ReinvestigationRequest
    ) -> InvestigationSnapshot:
        """Rerun downstream specialists while retaining the original evidence."""
        if not request.note.strip():
            raise InvestigationApplicationError(EMPTY_GUIDANCE_MESSAGE)
        with self._changes:
            record = self._record_for(investigation_id)
            case_file = self._completed_case_file(record)
            record.is_complete = False
            Thread(
                target=self._run_pipeline,
                args=(
                    investigation_id,
                    stream_reinvestigation(
                        case_file,
                        request.note,
                        self._llm_factory(request.provider),
                    ),
                ),
                daemon=True,
            ).start()
        return self.snapshot(investigation_id)

    def _record_for(self, investigation_id: str) -> _InvestigationRecord:
        with self._changes:
            record = self._records.get(investigation_id)
        if record is None:
            raise InvestigationApplicationError("The investigation was not found.")
        return record

    def _run_pipeline(
        self, investigation_id: str, pipeline: Iterator[InvestigationEvent]
    ) -> None:
        try:
            for event in pipeline:
                self._record_event(investigation_id, event)
        except Exception:
            self._record_unexpected_failure(investigation_id)
        finally:
            with self._changes:
                self._record_for(investigation_id).is_complete = True
                self._changes.notify_all()

    def _record_event(self, investigation_id: str, event: InvestigationEvent) -> None:
        with self._changes:
            record = self._record_for(investigation_id)
            if event.case_file is not None:
                record.case_file = event.case_file.model_copy(deep=True)
            record.events.append(_public_event(len(record.events) + 1, investigation_id, event))
            self._changes.notify_all()

    def _record_unexpected_failure(self, investigation_id: str) -> None:
        with self._changes:
            record = self._record_for(investigation_id)
            record.events.append(
                PublicInvestigationEvent(
                    event_id=len(record.events) + 1,
                    investigation_id=investigation_id,
                    event_type="investigation_failed",
                    stage="investigation",
                    status=InvestigationStatus.FAILED,
                    timestamp=datetime.now(UTC),
                    message="The investigation stopped. Review the supplied material and try again.",
                )
            )
            self._changes.notify_all()

    def _events_after(
        self, investigation_id: str, after_event_id: int
    ) -> Iterator[PublicInvestigationEvent]:
        last_seen = after_event_id
        while True:
            with self._changes:
                record = self._record_for(investigation_id)
                pending = tuple(event for event in record.events if event.event_id > last_seen)
                complete = record.is_complete
                if not pending and not complete:
                    self._changes.wait()
                    continue
            for event in pending:
                last_seen = event.event_id
                yield event
            if complete:
                return

    @staticmethod
    def _completed_case_file(record: _InvestigationRecord) -> CaseFile:
        if record.case_file is None or not record.is_complete:
            raise InvestigationApplicationError(
                "The investigation is still preparing. Wait for completion and try again."
            )
        return record.case_file.model_copy(deep=True)

def _public_event(
    event_id: int, investigation_id: str, event: InvestigationEvent
) -> PublicInvestigationEvent:
    """Project an internal orchestrator event into a presentation-safe record."""
    return PublicInvestigationEvent(
        event_id=event_id,
        investigation_id=investigation_id,
        event_type=event.kind.name.lower(),
        stage=_stage_for(event.kind),
        status=_status_for(event.kind),
        timestamp=datetime.now(UTC),
        message=event.message,
        evidence_ids=tuple(item.id for item in event.case_file.evidence)
        if event.case_file is not None
        else (),
        specialist=event.specialist,
    )


def _stage_for(kind: InvestigationEventKind) -> str:
    return kind.name.lower().replace("_started", "").replace("_completed", "")


def _status_for(kind: InvestigationEventKind) -> InvestigationStatus:
    if kind in {InvestigationEventKind.VALIDATION_ERROR, InvestigationEventKind.STEP_FAILED}:
        return InvestigationStatus.FAILED
    if kind in {
        InvestigationEventKind.SKEPTIC_REVIEW_REVISION_REQUESTED,
        InvestigationEventKind.SPECIALIST_REVISION_STARTED,
        InvestigationEventKind.SPECIALIST_REVISION_COMPLETED,
        InvestigationEventKind.REINVESTIGATION_REQUESTED,
    }:
        return InvestigationStatus.REVISING
    if kind is InvestigationEventKind.LEAD_DETECTIVE_COMPLETED:
        return InvestigationStatus.AWAITING_REVIEW
    if kind.name.endswith("_STARTED"):
        return InvestigationStatus.WORKING
    return InvestigationStatus.COMPLETED
