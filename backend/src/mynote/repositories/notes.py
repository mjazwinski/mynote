"""All MongoDB access for the `notes` collection."""

from typing import Any

from bson import ObjectId
from pymongo import ReturnDocument, UpdateOne

from mynote.db import Database
from mynote.schemas.common import utcnow


class NoteRepository:
    def __init__(self, db: Database) -> None:
        self.collection = db.notes

    async def insert(self, category_id: ObjectId, content: str, position: int) -> dict[str, Any]:
        now = utcnow()
        doc = {
            "category_id": category_id,
            "content": content,
            "position": position,
            "created_at": now,
            "updated_at": now,
        }
        result = await self.collection.insert_one(doc)
        return {**doc, "_id": result.inserted_id}

    async def list_by_category(self, category_id: ObjectId) -> list[dict[str, Any]]:
        cursor = self.collection.find({"category_id": category_id}).sort(
            [("position", 1), ("_id", 1)]
        )
        return await cursor.to_list()

    async def get(self, note_id: ObjectId) -> dict[str, Any] | None:
        return await self.collection.find_one({"_id": note_id})

    async def update_content(self, note_id: ObjectId, content: str) -> dict[str, Any] | None:
        return await self.collection.find_one_and_update(
            {"_id": note_id},
            {"$set": {"content": content, "updated_at": utcnow()}},
            return_document=ReturnDocument.AFTER,
        )

    async def count_by_category(self, category_id: ObjectId) -> int:
        return await self.collection.count_documents({"category_id": category_id})

    async def delete(self, note: dict[str, Any]) -> bool:
        """Delete a note and close the gap so positions stay contiguous (0..n-1)."""
        result = await self.collection.delete_one({"_id": note["_id"]})
        if result.deleted_count != 1:
            return False
        await self.collection.update_many(
            {"category_id": note["category_id"], "position": {"$gt": note["position"]}},
            {"$inc": {"position": -1}},
        )
        return True

    async def delete_by_category(self, category_id: ObjectId) -> int:
        result = await self.collection.delete_many({"category_id": category_id})
        return result.deleted_count

    async def set_positions(self, category_id: ObjectId, ordered_ids: list[ObjectId]) -> None:
        if not ordered_ids:
            return
        await self.collection.bulk_write(
            [
                UpdateOne({"_id": note_id, "category_id": category_id}, {"$set": {"position": i}})
                for i, note_id in enumerate(ordered_ids)
            ],
            ordered=False,
        )
