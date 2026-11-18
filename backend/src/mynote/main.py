"""FastAPI application factory."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mynote import __version__
from mynote.api import categories, health, notes
from mynote.config import Settings, get_settings
from mynote.db import create_client, ensure_indexes
from mynote.errors import register_exception_handlers
from mynote.logging_config import configure_logging
from mynote.middleware import RequestIdMiddleware

API_PREFIX = "/api/v1"
logger = logging.getLogger("mynote.app")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        client = create_client(settings.mongodb_uri)
        app.state.mongo_client = client
        app.state.db = client[settings.mongodb_db]
        try:
            await ensure_indexes(app.state.db)
        except Exception:
            logger.exception("app.index_creation_failed")
        logger.info("app.started", extra={"version": __version__, "database": settings.mongodb_db})
        try:
            yield
        finally:
            await client.close()
            logger.info("app.stopped")

    app = FastAPI(title="MyNote API", version=__version__, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
        allow_headers=["Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    # Added last so it is the outermost middleware and wraps every request.
    app.add_middleware(RequestIdMiddleware)
    register_exception_handlers(app)

    app.include_router(health.router, prefix=API_PREFIX)
    app.include_router(categories.router, prefix=API_PREFIX)
    app.include_router(notes.router, prefix=API_PREFIX)
    return app


app = create_app()
