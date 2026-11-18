"""Application settings, read from environment variables."""

from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "mynote"
    log_level: str = "INFO"
    # Comma-separated in the environment, e.g. "http://localhost:5173,http://127.0.0.1:5173"
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("log_level")
    @classmethod
    def _upper_level(cls, value: str) -> str:
        return value.upper()


@lru_cache
def get_settings() -> Settings:
    return Settings()
