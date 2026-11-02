"""Unit tests for Python requests to StoryVault's centralized AI service."""

from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

import pytest

from src.llm_client import (
    BACKEND_REQUEST_TIMEOUT_SECONDS,
    BackendRequestError,
    generate_chat_completion,
    get_backend_client,
)


def test_get_backend_client_uses_storyvault_url_and_jwt():
    """The Python client sends authenticated requests to StoryVault, not a provider."""
    with patch(
        "src.llm_client.load_environment",
        return_value={
            "STORYVAULT_API_URL": "https://storyvault.example",
            "STORYVAULT_API_TOKEN": "test-jwt-token",
        },
    ):
        client = get_backend_client()

    assert client.api_url == "https://storyvault.example"
    assert client.api_token == "test-jwt-token"


def test_get_backend_client_requires_authentication(monkeypatch):
    """No provider API key or unauthenticated generic-completion request is used."""
    monkeypatch.setattr(
        "src.llm_client.load_environment",
        lambda: {"STORYVAULT_API_URL": "http://localhost:5000", "STORYVAULT_API_TOKEN": ""},
    )

    with pytest.raises(ValueError, match="STORYVAULT_API_TOKEN"):
        get_backend_client()


def test_generate_chat_completion_success():
    """Completion messages and usage metadata flow through the backend client."""
    mock_client = MagicMock()
    usage = {"promptTokens": 15, "completionTokens": 5, "totalTokens": 20}
    mock_client.generate_completion.return_value = {
        "text": "Hello from StoryVault!",
        "usage": usage,
    }
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"},
    ]

    content, returned_usage = generate_chat_completion(messages, client=mock_client)

    assert content == "Hello from StoryVault!"
    assert returned_usage == usage
    mock_client.generate_completion.assert_called_once_with(messages)


def test_backend_client_sanitizes_http_errors():
    """Backend errors retain only their status code, not response bodies."""
    client = get_backend_client("http://localhost:5000", "test-jwt")
    response = MagicMock()
    response.read.return_value = b'{"error":"private response"}'
    error = HTTPError(
        "http://localhost:5000/api/ai/completion",
        401,
        "Unauthorized",
        {},
        None,
    )

    with patch("src.llm_client.urlopen", side_effect=error):
        with pytest.raises(BackendRequestError) as raised:
            client.generate_completion([{"role": "user", "content": "private journalist query"}])

    assert raised.value.status_code == 401
    assert "private response" not in str(raised.value)


def test_backend_client_timeout_covers_bounded_gemini_retries():
    """The client allows time for the backend's bounded retries and per-attempt timeout."""
    client = get_backend_client("http://localhost:5000", "test-jwt")
    response = MagicMock()
    response.__enter__.return_value = response
    response.read.return_value = b'{"text":"Completed."}'

    with patch("src.llm_client.urlopen", return_value=response) as urlopen_mock:
        client.generate_completion([{"role": "user", "content": "test"}])

    assert urlopen_mock.call_args.kwargs["timeout"] == BACKEND_REQUEST_TIMEOUT_SECONDS


def test_generate_chat_completion_does_not_log_private_query(caplog):
    """Backend failures do not expose prompt content or fabricate a response."""
    mock_client = MagicMock()
    mock_client.generate_completion.side_effect = BackendRequestError(401)

    content, usage = generate_chat_completion(
        [{"role": "user", "content": "private journalist query"}],
        client=mock_client,
    )

    assert content is None
    assert usage is None
    assert "HTTP 401" in caplog.text
    assert "private journalist query" not in caplog.text
