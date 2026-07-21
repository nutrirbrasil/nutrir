"""
Cliente Supabase para o backend do Nootr.

Estratégia de segurança: o backend NÃO usa a service key. Cada request do
frontend traz o `access_token` do usuário (Bearer). O backend repassa esse
token ao GoTrue (para identificar o usuário) e ao PostgREST (para ler/gravar
dados). Assim, todas as operações rodam sob o RLS do Postgres com
`auth.uid() = user_id`, o backend nunca consegue acessar dados de outro
usuário mesmo que houvesse um bug. A `anon key` (pública) entra só como
`apikey`, exigida pelo PostgREST/GoTrue.
"""
from typing import Any

import httpx

from backend.app.config import get_settings


class SupabaseError(RuntimeError):
    """Erro vindo do PostgREST/GoTrue (status != 2xx)."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Supabase {status_code}: {detail}")


def _base_url() -> str:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise SupabaseError(500, "Supabase não configurado (defina SUPABASE_URL e SUPABASE_ANON_KEY em nootr/.env).")
    return settings.supabase_url.rstrip("/")


def _headers(user_token: str, extra: dict[str, str] | None = None) -> dict[str, str]:
    settings = get_settings()
    headers = {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {user_token}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def get_user(access_token: str) -> dict[str, Any]:
    """Valida o token junto ao GoTrue e devolve o usuário (inclui `id`)."""
    url = f"{_base_url()}/auth/v1/user"
    resp = httpx.get(url, headers=_headers(access_token), timeout=10.0)
    if resp.status_code != 200:
        raise SupabaseError(401, "Token inválido ou expirado")
    return resp.json()


def select(table: str, user_token: str, params: dict[str, str]) -> list[dict[str, Any]]:
    url = f"{_base_url()}/rest/v1/{table}"
    resp = httpx.get(url, headers=_headers(user_token), params=params, timeout=15.0)
    if resp.status_code >= 300:
        raise SupabaseError(resp.status_code, resp.text)
    return resp.json()


def insert(table: str, user_token: str, row: dict[str, Any]) -> dict[str, Any]:
    url = f"{_base_url()}/rest/v1/{table}"
    resp = httpx.post(
        url,
        headers=_headers(user_token, {"Prefer": "return=representation"}),
        json=row,
        timeout=15.0,
    )
    if resp.status_code >= 300:
        raise SupabaseError(resp.status_code, resp.text)
    data = resp.json()
    return data[0] if isinstance(data, list) else data


def upsert(table: str, user_token: str, row: dict[str, Any], on_conflict: str) -> dict[str, Any]:
    """Insert com merge no conflito (PostgREST resolution=merge-duplicates)."""
    url = f"{_base_url()}/rest/v1/{table}"
    resp = httpx.post(
        url,
        headers=_headers(
            user_token,
            {"Prefer": "return=representation,resolution=merge-duplicates"},
        ),
        params={"on_conflict": on_conflict},
        json=row,
        timeout=15.0,
    )
    if resp.status_code >= 300:
        raise SupabaseError(resp.status_code, resp.text)
    data = resp.json()
    return data[0] if isinstance(data, list) else data


def delete(table: str, user_token: str, params: dict[str, str]) -> None:
    url = f"{_base_url()}/rest/v1/{table}"
    resp = httpx.delete(url, headers=_headers(user_token), params=params, timeout=15.0)
    if resp.status_code >= 300:
        raise SupabaseError(resp.status_code, resp.text)


def update(table: str, user_token: str, params: dict[str, str], patch: dict[str, Any]) -> dict[str, Any]:
    url = f"{_base_url()}/rest/v1/{table}"
    resp = httpx.patch(
        url,
        headers=_headers(user_token, {"Prefer": "return=representation"}),
        params=params,
        json=patch,
        timeout=15.0,
    )
    if resp.status_code >= 300:
        raise SupabaseError(resp.status_code, resp.text)
    data = resp.json()
    return data[0] if isinstance(data, list) else data
