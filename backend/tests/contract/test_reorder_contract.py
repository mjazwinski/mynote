import pytest

from tests.contract.openapi_validator import assert_list_of

UNKNOWN_ID = "0" * 24


@pytest.fixture
async def seeded(client):
    work = (await client.post("/categories", json={"name": "Work"})).json()
    other = (await client.post("/categories", json={"name": "Other"})).json()
    notes = [
        (await client.post(f"/categories/{work['id']}/notes", json={"content": t})).json()
        for t in ["a", "b", "c"]
    ]
    other_note = (await client.post(f"/categories/{other['id']}/notes")).json()
    return work, notes, other_note


def _order_url(category_id: str) -> str:
    return f"/categories/{category_id}/notes/order"


async def test_reorder_returns_new_order(client, seeded):
    work, notes, _ = seeded
    new_order = [notes[2]["id"], notes[0]["id"], notes[1]["id"]]
    response = await client.put(_order_url(work["id"]), json={"note_ids": new_order})
    assert response.status_code == 200
    body = response.json()
    assert_list_of("Note", body)
    assert [n["id"] for n in body] == new_order
    assert [n["position"] for n in body] == [0, 1, 2]

    listed = (await client.get(f"/categories/{work['id']}/notes")).json()
    assert [n["content"] for n in listed] == ["c", "a", "b"]


@pytest.mark.parametrize(
    "build",
    [
        pytest.param(lambda n, o: [n[0]["id"], n[1]["id"]], id="missing"),
        pytest.param(lambda n, o: [x["id"] for x in n] + [o["id"]], id="extra-other-category"),
        pytest.param(lambda n, o: [n[0]["id"], n[1]["id"], o["id"]], id="other-category"),
        pytest.param(lambda n, o: [n[0]["id"], n[0]["id"], n[1]["id"]], id="duplicate"),
    ],
)
async def test_invalid_orders_are_rejected(client, seeded, build):
    work, notes, other_note = seeded
    response = await client.put(_order_url(work["id"]), json={"note_ids": build(notes, other_note)})
    assert response.status_code == 422
    assert response.json()["code"] == "invalid_note_order"
    listed = (await client.get(f"/categories/{work['id']}/notes")).json()
    assert [n["content"] for n in listed] == ["a", "b", "c"]


async def test_reorder_unknown_category_returns_404(client):
    response = await client.put(_order_url(UNKNOWN_ID), json={"note_ids": []})
    assert response.status_code == 404


async def test_reorder_empty_category(client):
    empty = (await client.post("/categories", json={"name": "Empty"})).json()
    response = await client.put(_order_url(empty["id"]), json={"note_ids": []})
    assert response.status_code == 200
    assert response.json() == []
