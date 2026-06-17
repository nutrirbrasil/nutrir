"""Serviço de notificação de pedidos (Telegram)."""
import httpx

from backend.app.config import get_settings


async def notify_new_order(message: str) -> bool:
    settings = get_settings()
    token = settings.telegram_bot_token
    chat_id = settings.telegram_admin_chat_id

    if not token or not chat_id:
        print(f"[NOTIFY] (Telegram não configurado) {message}")
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"},
            timeout=10.0,
        )
        return resp.is_success
