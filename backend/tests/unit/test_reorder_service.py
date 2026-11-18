import pytest
from bson import ObjectId

from mynote.errors import DomainValidationError, NotFoundError
from mynote.services.note_service import NoteService
from tests.unit.fakes import FakeCategoryRepository, FakeNoteRepository


@pytest.fixture
async def setup():
    calls: list[str] = []
    categories = FakeCategoryRepository(calls)
    notes = FakeNoteRepository(calls)
    service = NoteService(categories, notes)
    work = str((await categories.insert("Work"))["_id"])
    other = str((await categories.insert("Other"))["_id"])
    ids = [str((await service.create_note(work, t))["_id"]) for t in "abc"]
    other_id = str((await service.create_note(other, "o"))["_id"])
    return service, work, ids, other_id


async def test_reorder_applies_new_order(setup):
    service, work, ids, _ = setup
    result = await service.reorder_notes(work, [ids[1], ids[2], ids[0]])
    assert [n["content"] for n in result] == ["b", "c", "a"]
    assert [n["position"] for n in result] == [0, 1, 2]


@pytest.mark.parametrize(
    "build",
    [
        lambda ids, other: ids[:2],
        lambda ids, other: [*ids, other],
        lambda ids, other: [ids[0], ids[1], other],
        lambda ids, other: [ids[0], ids[0], ids[1]],
        lambda ids, other: [ids[0], ids[1], "not-an-object-id"],
    ],
)
async def test_list_must_equal_category_note_set(setup, build):
    service, work, ids, other = setup
    with pytest.raises(DomainValidationError) as info:
        await service.reorder_notes(work, build(ids, other))
    assert info.value.code == "invalid_note_order"


async def test_unknown_category(setup):
    service, *_ = setup
    with pytest.raises(NotFoundError):
        await service.reorder_notes(str(ObjectId()), [])
