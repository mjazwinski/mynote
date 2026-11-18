"""MongoDB access: async client lifecycle, database dependency, indexes."""

import logging
from typing import Any

from fastapi import Request
from pymongo import ASCENDING, AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

logger = logging.getLogger("mynote.db")

Database = AsyncDatabase[dict[str, Any]]


def create_client(uri: str) -> AsyncMongoClient[dict[str, Any]]:
    return AsyncMongoClient(uri, serverSelectionTimeoutMS=5000, tz_aware=True)


async def ensure_indexes(db: Database) -> None:
    await db.categories.create_index([("name_key", ASCENDING)], unique=True, name="name_key_unique")
    await db.categories.create_index([("created_at", ASCENDING)], name="created_at")
    await db.notes.create_index(
        [("category_id", ASCENDING), ("position", ASCENDING)], name="category_position"
    )
    logger.info("db.indexes_ensured", extra={"database": db.name})


async def ping(db: Database) -> bool:
    try:
        await db.command("ping")
    except Exception:  # noqa: BLE001 - any failure means "unavailable"
        logger.exception("db.ping_failed")
        return False
    return True


def get_db(request: Request) -> Database:
    """FastAPI dependency returning the database opened in the app lifespan."""
    return request.app.state.db
