import pytest

from tests.contract.openapi_validator import assert_list_of, assert_matches


async def test_create_category_returns_201_matching_schema(client):
    response = await client.post("/categories", json={"name": "Work"})
    assert response.status_code == 201
    body = response.json()
    assert_matches("Category", body)
    assert body["name"] == "Work"
    assert body["note_count"] == 0


async def test_name_is_trimmed(client):
    response = await client.post("/categories", json={"name": "  Ideas  "})
    assert response.status_code == 201
    assert response.json()["name"] == "Ideas"


async def test_list_categories_in_creation_order_with_note_count(client):
    first = (await client.post("/categories", json={"name": "B first"})).json()
    await client.post("/categories", json={"name": "A second"})
    await client.post(f"/categories/{first['id']}/notes", json={"content": "x"})

    response = await client.get("/categories")
    assert response.status_code == 200
    body = response.json()
    assert_list_of("Category", body)
    assert [c["name"] for c in body] == ["B first", "A second"]
    assert [c["note_count"] for c in body] == [1, 0]


@pytest.mark.parametrize("name", ["", "   ", "x" * 51])
async def test_invalid_names_are_rejected(client, name):
    response = await client.post("/categories", json={"name": name})
    assert response.status_code == 422
    assert_matches("Error", response.json())


async def test_fifty_character_name_is_accepted(client):
    response = await client.post("/categories", json={"name": "x" * 50})
    assert response.status_code == 201


async def test_duplicate_name_case_insensitive_conflict(client):
    assert (await client.post("/categories", json={"name": "Work"})).status_code == 201
    response = await client.post("/categories", json={"name": "work"})
    assert response.status_code == 409
    body = response.json()
    assert_matches("Error", body)
    assert body["code"] == "category_name_conflict"


async def test_extra_fields_are_rejected(client):
    response = await client.post("/categories", json={"name": "A", "color": "red"})
    assert response.status_code == 422
