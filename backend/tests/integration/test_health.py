async def test_health_ok(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers.get("x-request-id")


async def test_incoming_request_id_is_echoed(client):
    response = await client.get("/health", headers={"X-Request-ID": "abc-123"})
    assert response.headers["x-request-id"] == "abc-123"
