import io
import json
import logging

import pytest

from mynote.logging_config import JsonFormatter, RequestIdFilter, request_id_var


@pytest.fixture
def capture() -> tuple[logging.Logger, io.StringIO]:
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RequestIdFilter())
    logger = logging.getLogger("test.logging_config")
    logger.handlers = [handler]
    logger.propagate = False
    logger.setLevel(logging.INFO)
    return logger, stream


def _lines(stream: io.StringIO) -> list[dict]:
    return [json.loads(line) for line in stream.getvalue().splitlines() if line]


def test_output_is_single_line_json_with_core_fields(capture):
    logger, stream = capture
    logger.info("hello %s", "world")
    [record] = _lines(stream)
    assert record["message"] == "hello world"
    assert record["level"] == "INFO"
    assert record["logger"] == "test.logging_config"
    assert record["timestamp"].endswith("+00:00")
    assert record["request_id"] is None


def test_extra_fields_are_included(capture):
    logger, stream = capture
    logger.info("note.updated", extra={"note_id": "abc", "content_length": 5})
    [record] = _lines(stream)
    assert record["note_id"] == "abc"
    assert record["content_length"] == 5


def test_request_id_from_context_var(capture):
    logger, stream = capture
    token = request_id_var.set("req-123")
    try:
        logger.info("inside request")
    finally:
        request_id_var.reset(token)
    assert _lines(stream)[0]["request_id"] == "req-123"


def test_exceptions_are_rendered(capture):
    logger, stream = capture
    try:
        raise ValueError("boom")
    except ValueError:
        logger.exception("failed")
    [record] = _lines(stream)
    assert record["level"] == "ERROR"
    assert "ValueError: boom" in record["exc_info"]


def test_level_is_honoured(capture):
    logger, stream = capture
    logger.setLevel(logging.WARNING)
    logger.info("hidden")
    logger.warning("shown")
    assert [r["message"] for r in _lines(stream)] == ["shown"]


def test_non_serializable_extra_is_stringified(capture):
    logger, stream = capture
    logger.info("obj", extra={"thing": object()})
    assert _lines(stream)[0]["thing"].startswith("<object object")


def test_pymongo_is_capped_at_warning_even_in_debug():
    from mynote.logging_config import build_logging_config

    config = build_logging_config("DEBUG")
    assert config["loggers"]["pymongo"]["level"] == "WARNING"
    assert config["loggers"]["uvicorn.access"]["level"] == "WARNING"
    assert config["root"]["level"] == "DEBUG"
