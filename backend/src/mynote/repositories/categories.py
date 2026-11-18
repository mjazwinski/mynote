"""All MongoDB access for the `categories` collection."""

from typing import Any

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from mynote.db import Database
from mynote.errors import ConflictError
from mynote.schemas.common import utcnow

_NOTE_COUNT_PIPELINE: list[dict[str, Any]] = [
    {"$sort": {"created_at": 1, "_id": 1}},
    {
        "$lookup": {
            "from": "notes",
            "localField": "_id",
            "foreignField": "category_id",
            "pipeline": [{"$project": {"_id": 1}}],
            "as": "_notes",
        }
    },
    {"$addFields": {"note_count": {"$size": "$_notes"}}},
    {"$project": {"_notes": 0}},
]


class CategoryRepository:
    def __init__(self, db: Database) -> None:
        self.collection = db.categories

    async def insert(self, name: str) -> dict[str, Any]:
        doc = {"name": name, "name_key": name.casefold(), "created_at": utcnow()}
        try:
            result = await self.collection.insert_one(doc)
        except DuplicateKeyError as exc:
            raise ConflictError(
                "A category with this name already exists", "category_name_conflict"
            ) from exc
        return {**doc, "_id": result.inserted_id}

    async def list_all(self) -> list[dict[str, Any]]:
        cursor = await self.collection.aggregate(_NOTE_COUNT_PIPELINE)
        return await cursor.to_list()

    async def get(self, category_id: ObjectId) -> dict[str, Any] | None:
        return await self.collection.find_one({"_id": category_id})

    async def delete(self, category_id: ObjectId) -> bool:
        result = await self.collection.delete_one({"_id": category_id})
        return result.deleted_count == 1
