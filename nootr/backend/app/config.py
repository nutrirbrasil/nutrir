"""Configuração do backend (variáveis de ambiente)."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Origens extras de CORS além de localhost (separadas por vírgula). Em
    # produção, o browser chama a API diretamente, então o domínio do frontend
    # precisa entrar aqui. Ex: "https://nootr.nutrirpicarras.com.br"
    extra_cors_origins: str = ""

    telegram_bot_token: str = ""
    telegram_admin_chat_id: str = ""

    @property
    def extra_cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.extra_cors_origins.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
