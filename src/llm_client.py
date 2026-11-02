"""Authenticated Python client for StoryVault's centralized backend AI service."""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from src.config import load_environment

logger = logging.getLogger(__name__)

BACKEND_REQUEST_TIMEOUT_SECONDS = 125


class BackendRequestError(Exception):
    """A sanitized failure from StoryVault's authenticated backend endpoint."""

    def __init__(self, status_code: Optional[int] = None) -> None:
        super().__init__("StoryVault backend request failed.")
        self.status_code = status_code


class BackendResponseError(Exception):
    """The backend response did not match the completion response contract."""


class StoryVaultBackendClient:
    def __init__(self, api_url: str, api_token: str) -> None:
        self.api_url = api_url.rstrip('/')
        self.api_token = api_token

    def generate_completion(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        request = Request(
            f"{self.api_url}/api/ai/completion",
            data=json.dumps({"messages": messages}).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=BACKEND_REQUEST_TIMEOUT_SECONDS) as response:
                body = response.read().decode("utf-8")
        except HTTPError as error:
            raise BackendRequestError(error.code) from None
        except (URLError, TimeoutError):
            raise BackendRequestError() from None

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            raise BackendResponseError("StoryVault returned invalid JSON.") from None
        if not isinstance(payload, dict) or not isinstance(payload.get("text"), str):
            raise BackendResponseError("StoryVault returned an invalid completion payload.")
        usage = payload.get("usage")
        if usage is not None and (
            not isinstance(usage, dict)
            or any(type(usage.get(key)) is not int for key in ("promptTokens", "completionTokens", "totalTokens"))
        ):
            raise BackendResponseError("StoryVault returned invalid usage metadata.")
        return payload


def get_backend_client(
    api_url: Optional[str] = None,
    api_token: Optional[str] = None,
) -> StoryVaultBackendClient:
    """Create a client using the backend URL and an authenticated StoryVault JWT."""
    environment = load_environment()
    resolved_url = api_url or environment["STORYVAULT_API_URL"]
    resolved_token = api_token if api_token is not None else environment["STORYVAULT_API_TOKEN"]
    if not resolved_token:
        raise ValueError("STORYVAULT_API_TOKEN is required to call the authenticated AI endpoint.")
    return StoryVaultBackendClient(resolved_url, resolved_token)


def generate_chat_completion(
    messages: List[Dict[str, str]],
    client: Optional[Any] = None,
) -> Tuple[Optional[str], Optional[Dict[str, int]]]:
    """Request a Gemini completion through StoryVault's authenticated backend."""
    try:
        backend_client = client if client is not None else get_backend_client()
        response = backend_client.generate_completion(messages)
        text = response.get("text")
        if not isinstance(text, str):
            raise BackendResponseError()
        text = text.strip()
        if not text:
            logger.error("StoryVault backend returned an empty completion.")
            return None, None
        usage = response.get("usage")
        if usage is not None and (
            not isinstance(usage, dict)
            or any(type(usage.get(key)) is not int for key in ("promptTokens", "completionTokens", "totalTokens"))
        ):
            raise BackendResponseError()
        return text, usage
    except ValueError as error:
        logger.error("StoryVault backend configuration error: %s", error)
        return None, None
    except BackendRequestError as error:
        logger.error("StoryVault backend request failed (HTTP %s).", error.status_code or "unavailable")
        return None, None
    except BackendResponseError:
        logger.error("StoryVault backend returned an invalid completion response.")
        return None, None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    sample_messages = [
        {"role": "system", "content": "You are a concise assistant."},
        {"role": "user", "content": "Say hello in one sentence."},
    ]

    print("=== StoryVault Gemini Completion Call ===")
    response_text, usage = generate_chat_completion(sample_messages)

    if response_text:
        print("\n[Generated Response]:")
        print(response_text)
        if usage:
            print(f"\n[Usage]: {usage}")
    else:
        print(
            "\n[Notice]: No response was returned. Verify the backend is running and "
            "STORYVAULT_API_TOKEN contains a valid StoryVault JWT."
        )
