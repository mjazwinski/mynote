import pytest

UNKNOWN_ID = "0" * 24


@pytest.fixture
async def seeded(client):
    work = (await client.post("/categories", json={"name": "Work"})).json()
    home = (await client.post("/categories", json={"name": "Home"})).json()
    work_notes = [
        (await client.post(f"/categories/{work['id']}/notes", json={"content": t})).json()
        for t in ["a", "b", "c"]
    ]
    home_note = (await client.post(f"/categories/{home['id']}/notes", json={"content": "h"})).json()
    return work, home, work_notes, home_note


async def test_delete_note_compacts_positions(client, seeded):
    work, _home, notes, _ = seeded
    response = await client.delete(f"/notes/{notes[0]['id']}")
    assert response.status_code == 204
    assert response.content == b""
    remaining = (await client.get(f"/categories/{work['id']}/notes")).json()
    assert [n["content"] for n in remaining] == ["b", "c"]
    assert [n["position"] for n in remaining] == [0, 1]


async def test_delete_category_cascades_only_its_notes(client, seeded):
    work, home, _notes, home_note = seeded
    response = await client.delete(f"/categories/{work['id']}")
    assert response.status_code == 204
    assert (await client.get(f"/categories/{work['id']}/notes")).status_code == 404
    home_notes = (await client.get(f"/categories/{home['id']}/notes")).json()
    assert [n["id"] for n in home_notes] == [home_note["id"]]
    categories = (await client.get("/categories")).json()
    assert [c["name"] for c in categories] == ["Home"]


async def test_note_count_reflects_deletions(client, seeded):
    work, _home, notes, _ = seeded
    await client.delete(f"/notes/{notes[1]['id']}")
    categories = {c["name"]: c for c in (await client.get("/categories")).json()}
    assert categories["Work"]["note_count"] == 2
    assert categories["Home"]["note_count"] == 1


async def test_delete_unknown_returns_404(client):
    assert (await client.delete(f"/notes/{UNKNOWN_ID}")).status_code == 404
    assert (await client.delete(f"/categories/{UNKNOWN_ID}")).status_code == 404
    assert (await client.delete("/categories/bad-id")).status_code == 404


async def test_name_can_be_reused_after_delete(client, seeded):
    work, *_ = seeded
    await client.delete(f"/categories/{work['id']}")
    assert (await client.post("/categories", json={"name": "WORK"})).status_code == 201
