"""Request-ID propagation and structured access logging (pure ASGI middleware)."""

import logging
import time
import uuid

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from mynote.logging_config import request_id_var

logger = logging.getLogger("mynote.access")

REQUEST_ID_HEADER = "x-request-id"
_MAX_REQUEST_ID_LENGTH = 128


def _incoming_request_id(scope: Scope) -> str | None:
    for name, value in scope.get("headers", []):
        if name.decode("latin-1").lower() == REQUEST_ID_HEADER:
            candidate = value.decode("latin-1").strip()
            if 0 < len(candidate) <= _MAX_REQUEST_ID_LENGTH:
                return candidate
    return None


class RequestIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = _incoming_request_id(scope) or uuid.uuid4().hex
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status_holder = {"status": 500}

        async def send_with_request_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                status_holder["status"] = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            logger.info(
                "request.completed",
                extra={
                    "method": scope.get("method"),
                    "path": scope.get("path"),
                    "status": status_holder["status"],
                    "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                },
            )
            request_id_var.reset(token)
