"""Shared schema helpers."""

import re
from datetime import UTC, datetime
from typing import Annotated

from bson import ObjectId
from pydantic import StringConstraints

from mynote.errors import NotFoundError

OBJECT_ID_PATTERN = r"^[a-f0-9]{24}$"
_OBJECT_ID_RE = re.compile(OBJECT_ID_PATTERN)

PyObjectId = Annotated[str, StringConstraints(pattern=OBJECT_ID_PATTERN)]


def to_object_id(value: str, resource: str = "Resource") -> ObjectId:
    """Convert a path/body ID to ObjectId; malformed IDs are treated as 'not found'."""
    if not isinstance(value, str) or not _OBJECT_ID_RE.match(value):
        raise NotFoundError(f"{resource} not found")
    return ObjectId(value)


def utcnow() -> datetime:
    return datetime.now(UTC)
