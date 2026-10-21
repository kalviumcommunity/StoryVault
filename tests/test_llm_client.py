"""Unit tests for src/llm_client.py (Module 3.12: LLM API Access & First Completion Call)."""

from unittest.mock import MagicMock, patch
import pytest
from openai import AuthenticationError, RateLimitError
import httpx

from src.llm_client import get_llm_client, generate_chat_completion


def test_get_llm_client_default():
    """Verify get_llm_client initializes with environment variables."""
    with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key-123", "OPENAI_BASE_URL": "https://api.openai.com/v1"}):
        client = get_llm_client()
        assert client.api_key == "test-key-123"
        assert "api.openai.com" in str(client.base_url)


def test_get_llm_client_custom_provider():
    """Verify get_llm_client respects custom base_url (e.g. Ollama or local LLM)."""
    client = get_llm_client(base_url="http://localhost:11434/v1", api_key="ollama")
    assert "localhost:11434" in str(client.base_url)
    assert client.api_key == "ollama"


def test_generate_chat_completion_success():
    """Verify generate_chat_completion correctly parses content and usage."""
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Hello from StoryVault!"
    
    mock_usage = MagicMock()
    mock_usage.prompt_tokens = 15
    mock_usage.completion_tokens = 5
    mock_usage.total_tokens = 20

    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    mock_resp.usage = mock_usage

    mock_client.chat.completions.create.return_value = mock_resp

    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"},
    ]

    content, usage = generate_chat_completion(messages, model="gpt-4o-mini", client=mock_client)

    assert content == "Hello from StoryVault!"
    assert usage == mock_usage
    mock_client.chat.completions.create.assert_called_once_with(
        model="gpt-4o-mini",
        messages=messages,
    )


def test_generate_chat_completion_authentication_error(capsys):
    """Verify graceful handling of 401 AuthenticationError."""
    mock_client = MagicMock()
    req = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
    mock_client.chat.completions.create.side_effect = AuthenticationError(
        message="Incorrect API key provided",
        response=httpx.Response(status_code=401, request=req),
        body=None,
    )

    messages = [{"role": "user", "content": "Hi"}]
    content, usage = generate_chat_completion(messages, client=mock_client)

    assert content is None
    assert usage is None
    captured = capsys.readouterr()
    assert "Auth failed (401)" in captured.out


def test_generate_chat_completion_rate_limit_error(capsys):
    """Verify graceful handling of 429 RateLimitError."""
    mock_client = MagicMock()
    req = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
    mock_client.chat.completions.create.side_effect = RateLimitError(
        message="You exceeded your current quota",
        response=httpx.Response(status_code=429, request=req),
        body=None,
    )

    messages = [{"role": "user", "content": "Hi"}]
    content, usage = generate_chat_completion(messages, client=mock_client)

    assert content is None
    assert usage is None
    captured = capsys.readouterr()
    assert "Rate limited (429)" in captured.out
