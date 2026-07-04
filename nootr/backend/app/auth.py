"""Dependência de autenticação para as rotas Nootr (Supabase Auth)."""
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException

from backend.app import supabase_client


@dataclass
class CurrentUser:
    id: str
    email: str | None
    token: str  # access_token repassado ao PostgREST para respeitar o RLS


def get_current_user(authorization: str = Header(default="")) -> CurrentUser:
    """Extrai o Bearer token, valida no GoTrue e devolve o usuário atual."""
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        user = supabase_client.get_user(token)
    except supabase_client.SupabaseError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return CurrentUser(id=user["id"], email=user.get("email"), token=token)


CurrentUserDep = Depends(get_current_user)
