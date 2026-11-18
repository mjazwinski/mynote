"""Business rules for categories."""

import logging
from typing import Any

from mynote.errors import NotFoundError
from mynote.repositories.categories import CategoryRepository
from mynote.repositories.notes import NoteRepository
from mynote.schemas.common import to_object_id

logger = logging.getLogger("mynote.services.category")


class CategoryService:
    def __init__(self, categories: CategoryRepository, notes: NoteRepository) -> None:
        self.categories = categories
        self.notes = notes

    async def create_category(self, name: str) -> dict[str, Any]:
        doc = await self.categories.insert(name)
        logger.info("category.created", extra={"category_id": str(doc["_id"])})
        return {**doc, "note_count": 0}

    async def list_categories(self) -> list[dict[str, Any]]:
        return await self.categories.list_all()

    async def delete_category(self, category_id: str) -> int:
        """Delete the category and all of its notes; returns the number of notes deleted.

        Notes are deleted first, then the category (research R6): if the process fails in
        between, the category still exists and the user can simply retry — no orphans.
        """
        oid = to_object_id(category_id, "Category")
        if await self.categories.get(oid) is None:
            raise NotFoundError("Category not found")
        notes_deleted = await self.notes.delete_by_category(oid)
        await self.categories.delete(oid)
        logger.info(
            "category.deleted", extra={"category_id": category_id, "notes_deleted": notes_deleted}
        )
        return notes_deleted
