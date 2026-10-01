"""Testa o retry automático de _generate_from_contents em timeout de leitura
e em 429/503 (sobrecarga temporária) do Gemini (ver nota em gemini.py: os
dois costumam ser passageiros, não uma falha de infra de verdade, então vale
uma segunda tentativa antes de desistir). O caso real que motivou o retry de
429/503: day_topup.try_day_topup engolia esse erro calado (ai.suggest_day_topup
captura AIError e devolve None) e desistia de fechar a meta de
calorias/proteína sem nem tentar de novo."""
import httpx
import pytest

from backend.app.services.ai import AIError, gemini


class _FakeSettings:
    gemini_api_key = "fake-key"
    gemini_model = "gemini-fake"


class _FakeResponse:
    def __init__(self, status_code: int = 200):
        self.status_code = status_code
        self.text = '{"error": "fake"}'

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


def test_retries_once_after_503_then_succeeds(monkeypatch):
    calls = {"n": 0}

    def fake_post(*args, **kwargs):
        calls["n"] += 1
        return _FakeResponse(503) if calls["n"] == 1 else _FakeResponse(200)

    monkeypatch.setattr(httpx, "post", fake_post)
    text = gemini._generate_from_contents([{"parts": [{"text": "oi"}]}], schema=None)
    assert text == "ok"
    assert calls["n"] == 2


def test_retries_once_after_429_then_succeeds(monkeypatch):
    calls = {"n": 0}

    def fake_post(*args, **kwargs):
        calls["n"] += 1
        return _FakeResponse(429) if calls["n"] == 1 else _FakeResponse(200)

    monkeypatch.setattr(httpx, "post", fake_post)
    text = gemini._generate_from_contents([{"parts": [{"text": "oi"}]}], schema=None)
    assert text == "ok"
    assert calls["n"] == 2


def test_raises_after_two_consecutive_503(monkeypatch):
    calls = {"n": 0}

    def fake_post(*args, **kwargs):
        calls["n"] += 1
        return _FakeResponse(503)

    monkeypatch.setattr(httpx, "post", fake_post)
    with pytest.raises(AIError, match="Gemini 503"):
        gemini._generate_from_contents([{"parts": [{"text": "oi"}]}], schema=None)
    assert calls["n"] == 2


def test_does_not_retry_on_non_retryable_status(monkeypatch):
    # 400 (pedido invalido) nao e um erro passageiro, repetir nao ajudaria.
    calls = {"n": 0}

    def fake_post(*args, **kwargs):
        calls["n"] += 1
        return _FakeResponse(400)

    monkeypatch.setattr(httpx, "post", fake_post)
    with pytest.raises(AIError, match="Gemini 400"):
        gemini._generate_from_contents([{"parts": [{"text": "oi"}]}], schema=None)
    assert calls["n"] == 1
