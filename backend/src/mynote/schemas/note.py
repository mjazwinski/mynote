from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field

# "Plain text; may be empty; max 20 000 characters" (data-model.md)
NOTE_CONTENT_MAX = 20_000
NoteContent = Annotated[str, Field(max_length=NOTE_CONTENT_MAX)]


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: NoteContent = ""


class NoteUpdate(BaseModel):
    """Only the content can change; `category_id` is immutable (extra fields are rejected)."""

    model_config = ConfigDict(extra="forbid")

    content: NoteContent


class NoteOrder(BaseModel):
    """Complete ordered list of the category's note IDs.

    Format/uniqueness/set-equality are validated by the service so that every invalid order
    is reported with the single code ``invalid_note_order``.
    """

    model_config = ConfigDict(extra="forbid")

    note_ids: list[str]


class NoteOut(BaseModel):
    id: str
    category_id: str
    content: str
    position: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_doc(cls, doc: dict[str, Any]) -> "NoteOut":
        return cls(
            id=str(doc["_id"]),
            category_id=str(doc["category_id"]),
            content=doc["content"],
            position=doc["position"],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )
