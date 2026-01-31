"""Application settings via Pydantic (env validation)."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: Literal["dev", "staging", "prod"] = "dev"
    debug: bool = False

    # PostgreSQL (use postgresql+asyncpg for async)
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/churn"

    # Artifacts (churn model) — default: project_root/artifacts
    artifacts_dir: Path = Path(__file__).resolve().parent.parent.parent / "artifacts"

    # CORS settings (can be overridden via CORS_ORIGINS env var, comma-separated)
    # Store as string to avoid JSON parsing issues, then compute as list
    cors_origins_str: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001",
        validation_alias=AliasChoices("CORS_ORIGINS", "cors_origins"),
    )

    @computed_field
    @property
    def cors_origins(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        v_str = self.cors_origins_str.strip()
        if not v_str:
            return ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"]
        # Split by comma and clean
        origins = [origin.strip() for origin in v_str.split(",") if origin.strip()]
        return origins if origins else ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"]

    @field_validator("database_url")
    @classmethod
    def must_be_postgres(cls, v: str) -> str:
        if not v.startswith("postgresql"):
            raise ValueError("database_url must be a PostgreSQL URL")
        return v

    @field_validator("artifacts_dir", mode="before")
    @classmethod
    def resolve_artifacts_dir(cls, v: str | Path) -> Path:
        return Path(v).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
