"""Testa o retry automático de _generate_from_contents em timeout de leitura
do Gemini (ver nota em gemini.py, timeout costuma ser resposta lenta, não
rede fora do ar, então vale uma segunda tentativa antes de desistir)."""
import httpx
import pytest

from backend.app.services.ai import AIError, gemini


class _FakeSettings:
    gemini_api_key = "fake-key"
    gemini_model = "gemini-fake"


class _FakeResponse:
    status_code = 200

    def json(self):
        return {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]}


@pytest.fixture(autouse=True)
def _fake_settings(monkeypatch):
    monkeypatch.setattr(gemini, "get_settings", lambda: _FakeSettings())


def test_retries_once_after_timeout_then_succeeds(monkeypatch):
    calls = {"n": 0}

    def fake_post(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.ReadTimeout("The read operation timed out")
        return _FakeResponse()

    monkeypatch.setattr(httpx, "post", fake_post)
    text = gemini._generate_from_contents([{"parts": [{"text": "oi"}]}], schema=None)
    assert text == "ok"
    assert calls["n"] == 2


def test_raises_after_two_consecutive_timeouts(monkeypatch):
    def fake_post(*args, **kwargs):
        raise httpx.ReadTimeout("The read operation timed out")

    monkeypatch.setattr(httpx, "post", fake_post)
    with pytest.raises(AIError, match="Falha de rede ao chamar o Gemini"):
        gemini._generate_from_contents([{"parts": [{"text": "oi"}]}], schema=None)


def test_does_not_retry_on_non_timeout_error(monkeypatch):
    calls = {"n": 0}

    def fake_post(*args, **kwargs):
        calls["n"] += 1
        raise httpx.ConnectError("connection refused")

    monkeypatch.setattr(httpx, "post", fake_post)
    with pytest.raises(AIError, match="Falha de rede ao chamar o Gemini"):
        gemini._generate_from_contents([{"parts": [{"text": "oi"}]}], schema=None)
    assert calls["n"] == 1
