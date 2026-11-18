from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, StringConstraints

# "Trimmed; length 1–50" (data-model.md)
CategoryName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class CategoryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: CategoryName


class CategoryOut(BaseModel):
    id: str
    name: str
    created_at: datetime
    note_count: int

    @classmethod
    def from_doc(cls, doc: dict[str, Any]) -> "CategoryOut":
        return cls(
            id=str(doc["_id"]),
            name=doc["name"],
            created_at=doc["created_at"],
            note_count=doc.get("note_count", 0),
        )
