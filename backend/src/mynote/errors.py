"""Domain exceptions and their mapping to HTTP error responses."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("mynote.errors")


class DomainError(Exception):
    status_code = 400
    default_code = "error"

    def __init__(self, detail: str, code: str | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        self.code = code or self.default_code


class NotFoundError(DomainError):
    status_code = 404
    default_code = "not_found"


class ConflictError(DomainError):
    status_code = 409
    default_code = "conflict"


class DomainValidationError(DomainError):
    status_code = 422
    default_code = "validation_error"


def _error_response(status: int, detail: str, code: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"detail": detail, "code": code})


def _format_validation_errors(exc: RequestValidationError) -> str:
    parts = []
    for err in exc.errors():
        location = ".".join(str(p) for p in err.get("loc", ()) if p != "body")
        parts.append(f"{location}: {err.get('msg')}" if location else str(err.get("msg")))
    return "; ".join(parts) or "Invalid request"


async def _domain_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, DomainError)
    logger.warning(
        "request.rejected",
        extra={"status": exc.status_code, "code": exc.code, "path": request.url.path},
    )
    return _error_response(exc.status_code, exc.detail, exc.code)


async def _validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    detail = _format_validation_errors(exc)
    logger.warning(
        "request.invalid",
        extra={"status": 422, "code": "validation_error", "path": request.url.path},
    )
    return _error_response(422, detail, "validation_error")


async def _unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("request.failed", exc_info=exc, extra={"path": request.url.path})
    return _error_response(500, "Internal server error", "internal_error")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, _domain_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    app.add_exception_handler(Exception, _unhandled_error_handler)
