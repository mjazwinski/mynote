import pytest
from bson import ObjectId

from mynote.errors import NotFoundError
from mynote.services.note_service import NoteService
from tests.unit.fakes import FakeCategoryRepository, FakeNoteRepository


@pytest.fixture
async def setup():
    calls: list[str] = []
    categories = FakeCategoryRepository(calls)
    notes = FakeNoteRepository(calls)
    category = await categories.insert("Work")
    return NoteService(categories, notes), str(category["_id"])


async def test_create_appends_at_end(setup):
    service, category_id = setup
    first = await service.create_note(category_id, "a")
    second = await service.create_note(category_id, "b")
    assert (first["position"], second["position"]) == (0, 1)


async def test_create_in_missing_category_raises(setup):
    service, _ = setup
    with pytest.raises(NotFoundError):
        await service.create_note(str(ObjectId()), "")


async def test_list_missing_category_raises(setup):
    service, _ = setup
    with pytest.raises(NotFoundError):
        await service.list_notes(str(ObjectId()))


async def test_update_changes_content_only(setup):
    service, category_id = setup
    note = await service.create_note(category_id, "a")
    updated = await service.update_note(str(note["_id"]), "b")
    assert updated["content"] == "b"
    assert updated["category_id"] == note["category_id"]
    assert updated["updated_at"] >= note["updated_at"]


async def test_update_missing_note_raises(setup):
    service, _ = setup
    with pytest.raises(NotFoundError):
        await service.update_note(str(ObjectId()), "x")


async def test_malformed_id_is_not_found(setup):
    service, _ = setup
    with pytest.raises(NotFoundError):
        await service.update_note("bad", "x")
