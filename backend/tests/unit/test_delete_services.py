import logging

import pytest
from bson import ObjectId

from mynote.errors import NotFoundError
from mynote.services.category_service import CategoryService
from mynote.services.note_service import NoteService
from tests.unit.fakes import FakeCategoryRepository, FakeNoteRepository


@pytest.fixture
def repos():
    calls: list[str] = []
    return FakeCategoryRepository(calls), FakeNoteRepository(calls), calls


async def test_cascade_deletes_notes_before_category(repos, caplog):
    categories, notes, calls = repos
    service = CategoryService(categories, notes)
    note_service = NoteService(categories, notes)
    category = await service.create_category("Work")
    for _ in range(3):
        await note_service.create_note(str(category["_id"]), "x")

    with caplog.at_level(logging.INFO, logger="mynote.services"):
        deleted = await service.delete_category(str(category["_id"]))

    assert deleted == 3
    assert calls == ["notes.delete_by_category", "categories.delete"]
    record = next(r for r in caplog.records if r.getMessage() == "category.deleted")
    assert record.notes_deleted == 3
    assert record.category_id == str(category["_id"])


async def test_delete_missing_category_raises(repos):
    categories, notes, calls = repos
    with pytest.raises(NotFoundError):
        await CategoryService(categories, notes).delete_category(str(ObjectId()))
    assert calls == []


async def test_delete_note_compacts_and_missing_raises(repos):
    categories, notes, _ = repos
    service = NoteService(categories, notes)
    category = await categories.insert("Work")
    cid = str(category["_id"])
    a = await service.create_note(cid, "a")
    await service.create_note(cid, "b")
    await service.delete_note(str(a["_id"]))
    remaining = await service.list_notes(cid)
    assert [(n["content"], n["position"]) for n in remaining] == [("b", 0)]
    with pytest.raises(NotFoundError):
        await service.delete_note(str(a["_id"]))
