"""Structured (JSON) logging built on the standard-library ``logging`` module.

Every record is emitted as a single JSON object per line on stdout. The current request ID
(set by the request-ID middleware) is injected into every record via a ``logging.Filter``.
"""

import json
import logging
import logging.config
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)

# Attributes present on every LogRecord; anything else was passed via ``extra=`` and is emitted.
_RESERVED_ATTRS = frozenset(
    vars(logging.LogRecord("", 0, "", 0, "", None, None)).keys()
    | {"message", "asctime", "request_id", "taskName", "color_message"}
)


class JsonFormatter(logging.Formatter):
    """Format log records as one-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", None),
        }
        for key, value in record.__dict__.items():
            if key not in _RESERVED_ATTRS and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str, ensure_ascii=False)


class RequestIdFilter(logging.Filter):
    """Copy the current request ID from the context variable onto each record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def build_logging_config(level: str) -> dict[str, Any]:
    handler_cfg = {"handlers": ["stdout"], "level": level, "propagate": False}
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {"request_id": {"()": RequestIdFilter}},
        "formatters": {"json": {"()": JsonFormatter}},
        "handlers": {
            "stdout": {
                "class": "logging.StreamHandler",
                "stream": sys.stdout,
                "formatter": "json",
                "filters": ["request_id"],
            }
        },
        "root": {"handlers": ["stdout"], "level": level},
        "loggers": {
            "uvicorn": handler_cfg,
            "uvicorn.error": handler_cfg,
            # Access logging is done by RequestIdMiddleware; avoid duplicate lines.
            "uvicorn.access": {**handler_cfg, "level": "WARNING"},
            # PyMongo's DEBUG command logs contain full documents (i.e. note content), so they
            # are capped at WARNING even when LOG_LEVEL=DEBUG. Note content must never be logged.
            "pymongo": {"level": "WARNING"},
        },
    }


def configure_logging(level: str = "INFO") -> None:
    logging.config.dictConfig(build_logging_config(level.upper()))
