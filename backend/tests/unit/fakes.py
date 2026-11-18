"""In-memory fakes of the repositories, recording call order for unit tests."""

from typing import Any

from bson import ObjectId

from mynote.errors import ConflictError
from mynote.schemas.common import utcnow


class FakeCategoryRepository:
    def __init__(self, calls: list[str]) -> None:
        self.docs: dict[ObjectId, dict[str, Any]] = {}
        self.calls = calls

    async def insert(self, name: str) -> dict[str, Any]:
        key = name.casefold()
        if any(d["name_key"] == key for d in self.docs.values()):
            raise ConflictError(
                "A category with this name already exists", "category_name_conflict"
            )
        doc = {"_id": ObjectId(), "name": name, "name_key": key, "created_at": utcnow()}
        self.docs[doc["_id"]] = doc
        return dict(doc)

    async def list_all(self) -> list[dict[str, Any]]:
        return [
            dict(d, note_count=0) for d in sorted(self.docs.values(), key=lambda d: d["created_at"])
        ]

    async def get(self, category_id: ObjectId) -> dict[str, Any] | None:
        doc = self.docs.get(category_id)
        return dict(doc) if doc else None

    async def delete(self, category_id: ObjectId) -> bool:
        self.calls.append("categories.delete")
        return self.docs.pop(category_id, None) is not None


class FakeNoteRepository:
    def __init__(self, calls: list[str]) -> None:
        self.docs: dict[ObjectId, dict[str, Any]] = {}
        self.calls = calls

    async def insert(self, category_id: ObjectId, content: str, position: int) -> dict[str, Any]:
        now = utcnow()
        doc = {
            "_id": ObjectId(),
            "category_id": category_id,
            "content": content,
            "position": position,
            "created_at": now,
            "updated_at": now,
        }
        self.docs[doc["_id"]] = doc
        return dict(doc)

    async def list_by_category(self, category_id: ObjectId) -> list[dict[str, Any]]:
        notes = [d for d in self.docs.values() if d["category_id"] == category_id]
        return [dict(d) for d in sorted(notes, key=lambda d: d["position"])]

    async def get(self, note_id: ObjectId) -> dict[str, Any] | None:
        doc = self.docs.get(note_id)
        return dict(doc) if doc else None

    async def update_content(self, note_id: ObjectId, content: str) -> dict[str, Any] | None:
        doc = self.docs.get(note_id)
        if doc is None:
            return None
        doc.update(content=content, updated_at=utcnow())
        return dict(doc)

    async def count_by_category(self, category_id: ObjectId) -> int:
        return sum(1 for d in self.docs.values() if d["category_id"] == category_id)

    async def delete(self, note: dict[str, Any]) -> bool:
        removed = self.docs.pop(note["_id"], None)
        if removed is None:
            return False
        for d in self.docs.values():
            if d["category_id"] == removed["category_id"] and d["position"] > removed["position"]:
                d["position"] -= 1
        return True

    async def delete_by_category(self, category_id: ObjectId) -> int:
        self.calls.append("notes.delete_by_category")
        ids = [k for k, d in self.docs.items() if d["category_id"] == category_id]
        for k in ids:
            del self.docs[k]
        return len(ids)

    async def set_positions(self, category_id: ObjectId, ordered_ids: list[ObjectId]) -> None:
        for index, note_id in enumerate(ordered_ids):
            self.docs[note_id]["position"] = index
