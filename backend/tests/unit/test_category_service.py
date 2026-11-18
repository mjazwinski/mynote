import pytest

from mynote.errors import ConflictError
from mynote.services.category_service import CategoryService
from tests.unit.fakes import FakeCategoryRepository, FakeNoteRepository


@pytest.fixture
def service() -> CategoryService:
    calls: list[str] = []
    return CategoryService(FakeCategoryRepository(calls), FakeNoteRepository(calls))


async def test_create_returns_category_with_zero_notes(service):
    created = await service.create_category("Work")
    assert created["name"] == "Work"
    assert created["note_count"] == 0


async def test_name_key_is_casefolded(service):
    await service.create_category("Straße")
    stored = next(iter(service.categories.docs.values()))
    assert stored["name_key"] == "strasse"


async def test_conflict_propagates(service):
    await service.create_category("Work")
    with pytest.raises(ConflictError) as info:
        await service.create_category("WORK")
    assert info.value.code == "category_name_conflict"


async def test_list_in_creation_order(service):
    await service.create_category("b")
    await service.create_category("a")
    assert [c["name"] for c in await service.list_categories()] == ["b", "a"]
