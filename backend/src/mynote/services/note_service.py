"""Business rules for notes. Note content is never logged — only IDs and lengths."""

import logging
from typing import Any

from bson import ObjectId

from mynote.errors import DomainValidationError, NotFoundError
from mynote.repositories.categories import CategoryRepository
from mynote.repositories.notes import NoteRepository
from mynote.schemas.common import to_object_id

logger = logging.getLogger("mynote.services.note")

_INVALID_ORDER = "note_ids must contain every note of the category exactly once"


class NoteService:
    def __init__(self, categories: CategoryRepository, notes: NoteRepository) -> None:
        self.categories = categories
        self.notes = notes

    async def _require_category(self, category_id: str) -> ObjectId:
        oid = to_object_id(category_id, "Category")
        if await self.categories.get(oid) is None:
            raise NotFoundError("Category not found")
        return oid

    async def _require_note(self, note_id: str) -> dict[str, Any]:
        note = await self.notes.get(to_object_id(note_id, "Note"))
        if note is None:
            raise NotFoundError("Note not found")
        return note

    async def create_note(self, category_id: str, content: str) -> dict[str, Any]:
        oid = await self._require_category(category_id)
        position = await self.notes.count_by_category(oid)  # new note appended at the end
        note = await self.notes.insert(oid, content, position)
        logger.info(
            "note.created",
            extra={
                "note_id": str(note["_id"]),
                "category_id": category_id,
                "position": position,
                "content_length": len(content),
            },
        )
        return note

    async def list_notes(self, category_id: str) -> list[dict[str, Any]]:
        oid = await self._require_category(category_id)
        return await self.notes.list_by_category(oid)

    async def update_note(self, note_id: str, content: str) -> dict[str, Any]:
        updated = await self.notes.update_content(to_object_id(note_id, "Note"), content)
        if updated is None:
            raise NotFoundError("Note not found")
        logger.info("note.updated", extra={"note_id": note_id, "content_length": len(content)})
        return updated

    async def delete_note(self, note_id: str) -> None:
        note = await self._require_note(note_id)
        if not await self.notes.delete(note):
            raise NotFoundError("Note not found")
        logger.info(
            "note.deleted",
            extra={"note_id": note_id, "category_id": str(note["category_id"])},
        )

    async def reorder_notes(self, category_id: str, note_ids: list[str]) -> list[dict[str, Any]]:
        oid = await self._require_category(category_id)
        current = await self.notes.list_by_category(oid)
        current_ids = {str(n["_id"]) for n in current}
        # The request MUST equal the category's note-ID set exactly (no cross-category moves).
        if len(note_ids) != len(set(note_ids)) or set(note_ids) != current_ids:
            raise DomainValidationError(_INVALID_ORDER, "invalid_note_order")
        await self.notes.set_positions(oid, [ObjectId(i) for i in note_ids])
        logger.info("note.reordered", extra={"category_id": category_id, "count": len(note_ids)})
        return await self.notes.list_by_category(oid)
