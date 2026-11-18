"""Shared fixtures: a real MongoDB (env or testcontainers) and an ASGI test client."""

import os
import uuid
from collections.abc import AsyncIterator, Iterator

import httpx
import pytest
from asgi_lifespan import LifespanManager

from mynote.config import Settings
from mynote.main import create_app


@pytest.fixture(scope="session")
def mongo_uri() -> Iterator[str]:
    env_uri = os.environ.get("MONGODB_TEST_URI") or os.environ.get("MONGODB_URI")
    if env_uri:
        yield env_uri
        return
    from testcontainers.community.mongodb import MongoDbContainer

    with MongoDbContainer("mongo:8") as container:
        yield container.get_connection_url()


@pytest.fixture
def settings(mongo_uri: str) -> Settings:
    return Settings(
        mongodb_uri=mongo_uri,
        mongodb_db=f"mynote_test_{uuid.uuid4().hex[:12]}",
        log_level="INFO",
        cors_origins=["http://localhost:5173"],
    )


@pytest.fixture
async def app(settings: Settings) -> AsyncIterator[object]:
    application = create_app(settings)
    async with LifespanManager(application) as manager:
        yield manager.app
        await application.state.mongo_client.drop_database(settings.mongodb_db)


@pytest.fixture
async def client(app: object) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)  # type: ignore[arg-type]
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v1") as c:
        yield c
