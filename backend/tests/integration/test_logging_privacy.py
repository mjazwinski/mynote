"""Every log line is JSON with a request ID, and note content never appears in logs."""

import io
import json
import logging

import pytest

from mynote.logging_config import JsonFormatter, RequestIdFilter

SECRET = "TOP-SECRET-NOTE-CONTENT-4711"


@pytest.fixture
def json_log_stream():
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RequestIdFilter())
    root = logging.getLogger()
    root.addHandler(handler)
    previous = root.level
    root.setLevel(logging.DEBUG)  # worst case: LOG_LEVEL=DEBUG
    yield stream
    root.removeHandler(handler)
    root.setLevel(previous)


async def test_logs_are_json_with_request_id_and_never_contain_content(client, json_log_stream):
    category = (await client.post("/categories", json={"name": "Private"})).json()
    note = (
        await client.post(f"/categories/{category['id']}/notes", json={"content": SECRET})
    ).json()
    await client.patch(f"/notes/{note['id']}", json={"content": SECRET + " v2"})
    await client.put(f"/categories/{category['id']}/notes/order", json={"note_ids": [note["id"]]})
    await client.patch(f"/notes/{note['id']}", json={"content": "x" * 20001})  # rejected
    await client.delete(f"/notes/{note['id']}")
    await client.delete(f"/categories/{category['id']}")

    lines = [line for line in json_log_stream.getvalue().splitlines() if line]
    records = [json.loads(line) for line in lines]
    # Only our own request-scoped loggers are checked for request IDs; httpx (the test client)
    # logs outside the ASGI request context.
    app_records = [r for r in records if r["logger"].startswith("mynote.")]
    messages = {r["message"] for r in records}

    assert {
        "note.created",
        "note.updated",
        "note.reordered",
        "note.deleted",
        "category.deleted",
        "request.completed",
        "request.invalid",
    } <= messages
    assert all(r["request_id"] for r in app_records), "every request-scoped line has a request_id"
    assert SECRET not in json_log_stream.getvalue()
    updated = next(r for r in records if r["message"] == "note.updated")
    assert updated["content_length"] == len(SECRET + " v2")
