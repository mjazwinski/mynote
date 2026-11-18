"""Validate API payloads against specs/001-category-notes-canvas/contracts/openapi.yaml."""

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator
from referencing import Registry
from referencing.jsonschema import DRAFT202012

_SPEC_PATH = (
    Path(__file__).resolve().parents[3]
    / "specs"
    / "001-category-notes-canvas"
    / "contracts"
    / "openapi.yaml"
)
_SPEC_URI = "urn:mynote-openapi"


@lru_cache
def _spec() -> dict[str, Any]:
    return yaml.safe_load(_SPEC_PATH.read_text(encoding="utf-8"))


@lru_cache
def _validator(schema_name: str) -> Draft202012Validator:
    if schema_name not in _spec()["components"]["schemas"]:
        raise KeyError(f"Unknown schema {schema_name!r}")
    registry = Registry().with_resource(_SPEC_URI, DRAFT202012.create_resource(_spec()))
    schema = {"$ref": f"{_SPEC_URI}#/components/schemas/{schema_name}"}
    return Draft202012Validator(schema, registry=registry)


def assert_matches(schema_name: str, payload: Any) -> None:
    _validator(schema_name).validate(payload)


def assert_list_of(schema_name: str, payload: Any) -> None:
    assert isinstance(payload, list), f"expected a list, got {type(payload).__name__}"
    for item in payload:
        _validator(schema_name).validate(item)


__all__ = ["assert_list_of", "assert_matches"]
