"""FastAPI transport adapter for the investigation application interface."""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated, TypeVar

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from case_file import VerdictReviewError
from case_material import CaseMaterialInput
from investigation_application import (
    DecisionRequest,
    InvestigationApplication,
    InvestigationApplicationError,
    InvestigationSnapshot,
    PublicInvestigationEvent,
    ReinvestigationRequest,
    StartedInvestigation,
    StartInvestigationRequest,
    TRANSPORT_VERSION,
)
from orchestrator import EMPTY_GUIDANCE_MESSAGE
from llm_client import EnvLLMClient, load_local_environment

_Result = TypeVar("_Result")


class TransportError(BaseModel):
    """A safe error that identifies the failed stage and a recovery action."""

    stage: str
    message: str
    recovery_action: str


class TransportFailure(BaseModel):
    """The documented response envelope for all safe transport failures."""

    detail: TransportError


_SAFE_FAILURE_RESPONSE = {status.HTTP_400_BAD_REQUEST: {"model": TransportFailure}}


def create_api(application: InvestigationApplication | None = None) -> FastAPI:
    """Create the HTTP adapter without adding transport concerns to domain modules."""
    load_local_environment()
    investigation_application = application or InvestigationApplication(EnvLLMClient)
    api = FastAPI(title="Sherlok Investigation API", version=TRANSPORT_VERSION)

    @api.exception_handler(RequestValidationError)
    async def handle_invalid_request(_, __) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=TransportFailure(
                detail=TransportError(
                    stage="request_validation",
                    message="The request is incomplete or has an invalid value.",
                    recovery_action="Correct the highlighted request fields and try again.",
                )
            ).model_dump(),
        )

    @api.post(
        "/v1/investigations",
        response_model=StartedInvestigation,
        status_code=status.HTTP_201_CREATED,
        responses=_SAFE_FAILURE_RESPONSE,
    )
    async def start_investigation(
        pasted_material: Annotated[str, Form()] = "",
        provider: Annotated[str | None, Form()] = None,
        files: Annotated[list[UploadFile] | None, File()] = None,
    ) -> StartedInvestigation:
        uploads: list[CaseMaterialInput] = []
        for upload in files or []:
            uploads.append(
                CaseMaterialInput(
                    display_name=upload.filename or "uploaded-material",
                    content=await _read_upload(upload),
                    media_type=upload.content_type,
                )
            )
        return _call_application(
            lambda: investigation_application.start(
                StartInvestigationRequest(
                    pasted_material=pasted_material,
                    uploads=tuple(uploads),
                    provider=provider,
                )
            )
        )

    @api.get(
        "/v1/investigations/{investigation_id}",
        response_model=InvestigationSnapshot,
        responses=_SAFE_FAILURE_RESPONSE,
    )
    def read_snapshot(investigation_id: str) -> InvestigationSnapshot:
        return _call_application(lambda: investigation_application.snapshot(investigation_id))

    @api.get(
        "/v1/investigations/{investigation_id}/events",
        response_model=PublicInvestigationEvent,
        responses={
            **_SAFE_FAILURE_RESPONSE,
            status.HTTP_200_OK: {
                "description": "Ordered public investigation events.",
                "content": {
                    "text/event-stream": {
                        "schema": {
                            "$ref": "#/components/schemas/PublicInvestigationEvent"
                        }
                    }
                },
            },
        },
    )
    def stream_events(
        investigation_id: str,
        after_event_id: Annotated[int, Query(ge=0)] = 0,
    ) -> StreamingResponse:
        events = _call_application(
            lambda: investigation_application.events(investigation_id, after_event_id)
        )
        return StreamingResponse(
            (_sse_record(event.event_id, event.event_type, event.model_dump_json()) for event in events),
            media_type="text/event-stream",
        )

    @api.post(
        "/v1/investigations/{investigation_id}/decision",
        response_model=InvestigationSnapshot,
        responses=_SAFE_FAILURE_RESPONSE,
    )
    def record_decision(
        investigation_id: str, request: DecisionRequest
    ) -> InvestigationSnapshot:
        return _call_application(
            lambda: investigation_application.decide(investigation_id, request)
        )

    @api.post(
        "/v1/investigations/{investigation_id}/reinvestigation",
        response_model=InvestigationSnapshot,
        responses=_SAFE_FAILURE_RESPONSE,
    )
    def request_reinvestigation(
        investigation_id: str, request: ReinvestigationRequest
    ) -> InvestigationSnapshot:
        return _call_application(
            lambda: investigation_application.reinvestigate(investigation_id, request)
        )

    _configure_openapi(api)
    return api


def _configure_openapi(api: FastAPI) -> None:
    """Describe only the safe errors and SSE media type this adapter returns."""
    def openapi() -> dict:
        if api.openapi_schema:
            return api.openapi_schema
        schema = get_openapi(title=api.title, version=api.version, routes=api.routes)
        for path in schema["paths"].values():
            for operation in path.values():
                if isinstance(operation, dict):
                    operation.get("responses", {}).pop("422", None)
        event_content = schema["paths"]["/v1/investigations/{investigation_id}/events"]["get"]["responses"]["200"]["content"]
        event_content.pop("application/json", None)
        api.openapi_schema = schema
        return schema

    api.openapi = openapi


def _call_application(action: Callable[[], _Result]) -> _Result:
    """Map application-level safe failures into transport-level safe failures."""
    try:
        return action()
    except (InvestigationApplicationError, VerdictReviewError) as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_safe_error(error).model_dump(),
        ) from error


async def _read_upload(upload: UploadFile) -> bytes:
    """Read an HTTP upload without exposing filesystem or parser failures."""
    try:
        return await upload.read()
    except OSError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=TransportError(
                stage="case_material",
                message="One uploaded file could not be read.",
                recovery_action="Upload the file again or paste its text and try again.",
            ).model_dump(),
        ) from error


def _safe_error(error: Exception) -> TransportError:
    message = str(error)
    if message == "The investigation was not found.":
        return TransportError(
            stage="case_file",
            message=message,
            recovery_action="Start a new investigation or verify the investigation ID.",
        )
    if isinstance(error, VerdictReviewError):
        recovery_action = "Wait for a verdict, then record one review decision."
        if message.startswith("This verdict already has a recorded human decision"):
            recovery_action = (
                "Review the recorded decision; request re-investigation if further work is needed."
            )
        return TransportError(
            stage="human_review",
            message=message,
            recovery_action=recovery_action,
        )
    if message == EMPTY_GUIDANCE_MESSAGE:
        return TransportError(
            stage="reinvestigation",
            message=message,
            recovery_action="Enter a non-empty guidance note and try again.",
        )
    if message == "The investigation is still preparing. Wait for completion and try again.":
        return TransportError(
            stage="investigation",
            message=message,
            recovery_action="Wait for the investigation to complete, then try again.",
        )
    return TransportError(
        stage="investigation",
        message=message,
        recovery_action="Review the supplied participant material and try again.",
    )


def _sse_record(event_id: int, event_type: str, payload: str) -> str:
    """Format one public event using the Server-Sent Events wire format."""
    return f"id: {event_id}\nevent: {event_type}\ndata: {payload}\n\n"
