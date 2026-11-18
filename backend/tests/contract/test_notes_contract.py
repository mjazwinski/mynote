import asyncio

import pytest

from tests.contract.openapi_validator import assert_list_of, assert_matches

UNKNOWN_ID = "0" * 24


@pytest.fixture
async def category(client):
    return (await client.post("/categories", json={"name": "Work"})).json()


async def test_create_note_defaults_and_appends(client, category):
    url = f"/categories/{category['id']}/notes"
    first = await client.post(url)
    assert first.status_code == 201
    assert_matches("Note", first.json())
    assert first.json()["content"] == ""
    assert first.json()["position"] == 0

    second = await client.post(url, json={"content": "hello"})
    assert second.json()["position"] == 1
    assert second.json()["category_id"] == category["id"]


async def test_list_notes_ordered_by_position(client, category):
    url = f"/categories/{category['id']}/notes"
    for text in ["a", "b", "c"]:
        await client.post(url, json={"content": text})
    response = await client.get(url)
    assert response.status_code == 200
    assert_list_of("Note", response.json())
    assert [n["content"] for n in response.json()] == ["a", "b", "c"]
    assert [n["position"] for n in response.json()] == [0, 1, 2]


async def test_update_note_content(client, category):
    note = (await client.post(f"/categories/{category['id']}/notes")).json()
    await asyncio.sleep(0.01)
    response = await client.patch(f"/notes/{note['id']}", json={"content": "changed"})
    assert response.status_code == 200
    body = response.json()
    assert_matches("Note", body)
    assert body["content"] == "changed"
    assert body["updated_at"] > note["updated_at"]
    assert body["category_id"] == category["id"]


@pytest.mark.parametrize("category_id", [UNKNOWN_ID, "not-an-id"])
async def test_unknown_category_returns_404(client, category_id):
    assert (await client.get(f"/categories/{category_id}/notes")).status_code == 404
    response = await client.post(f"/categories/{category_id}/notes")
    assert response.status_code == 404
    assert_matches("Error", response.json())


@pytest.mark.parametrize("note_id", [UNKNOWN_ID, "nope"])
async def test_unknown_note_returns_404(client, note_id):
    response = await client.patch(f"/notes/{note_id}", json={"content": "x"})
    assert response.status_code == 404


async def test_content_too_long_is_rejected(client, category):
    url = f"/categories/{category['id']}/notes"
    assert (await client.post(url, json={"content": "x" * 20001})).status_code == 422
    note = (await client.post(url, json={"content": "x" * 20000})).json()
    response = await client.patch(f"/notes/{note['id']}", json={"content": "y" * 20001})
    assert response.status_code == 422


async def test_category_id_cannot_be_changed(client, category):
    other = (await client.post("/categories", json={"name": "Other"})).json()
    note = (await client.post(f"/categories/{category['id']}/notes")).json()
    response = await client.patch(
        f"/notes/{note['id']}", json={"content": "x", "category_id": other["id"]}
    )
    assert response.status_code == 422
    notes = (await client.get(f"/categories/{category['id']}/notes")).json()
    assert [n["id"] for n in notes] == [note["id"]]
