"""LLM Client configuration and first completion call module.

StoryVault - Module 3.12: LLM API Access & First Completion Call.
Provides OpenAI-compatible client initialization, completion generation,
structured payload logging, and graceful error handling.
"""

import os
import logging
from typing import Optional, Dict, Any, List, Tuple
from dotenv import load_dotenv
from openai import OpenAI, AuthenticationError, RateLimitError, APIError

# Configure module-level logger
logger = logging.getLogger(__name__)


def get_llm_client(
    base_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> OpenAI:
    """Initialize and return an OpenAI-compatible client.

    Args:
        base_url: Custom base URL (e.g., for Ollama, LM Studio, Groq, OpenRouter).
                  Defaults to OPENAI_BASE_URL from env if set.
        api_key: API key. Defaults to OPENAI_API_KEY from env if set.

    Returns:
        OpenAI: Configured client instance.
    """
    load_dotenv()

    resolved_base_url = base_url if base_url is not None else os.getenv("OPENAI_BASE_URL")
    resolved_api_key = api_key if api_key is not None else os.getenv("OPENAI_API_KEY", "")

    client_kwargs: Dict[str, Any] = {
        "api_key": resolved_api_key or "placeholder_key",
    }
    if resolved_base_url and resolved_base_url.strip():
        client_kwargs["base_url"] = resolved_base_url.strip()

    return OpenAI(**client_kwargs)


def generate_chat_completion(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    client: Optional[OpenAI] = None,
) -> Tuple[Optional[str], Optional[Any]]:
    """Send a chat completion request, log payload and usage, and handle errors.

    Args:
        messages: List of message dictionaries with 'role' and 'content'.
        model: Model name. Defaults to CHAT_MODEL or LLM_MODEL_NAME from env.
        client: Optional pre-configured OpenAI client instance.

    Returns:
        Tuple[Optional[str], Optional[Any]]: (response_text, usage_metadata)
    """
    load_dotenv()

    if client is None:
        client = get_llm_client()

    resolved_model = model or os.getenv("CHAT_MODEL") or os.getenv("LLM_MODEL_NAME", "gpt-4o-mini")

    logger.info("REQUEST: %s", messages)

    try:
        resp = client.chat.completions.create(
            model=resolved_model,
            messages=messages,  # type: ignore[arg-type]
        )
        content = resp.choices[0].message.content
        logger.info("RESPONSE: %s", content)
        logger.info("USAGE: %s", resp.usage)
        return content, resp.usage

    except AuthenticationError as e:
        logger.error("Auth failed (401): check OPENAI_API_KEY in your .env (%s)", e)
        print("Auth failed (401): check OPENAI_API_KEY in your .env")
        return None, None

    except RateLimitError as e:
        logger.error("Rate limited (429): slow down and retry with backoff (%s)", e)
        print("Rate limited (429): slow down and retry with backoff")
        return None, None

    except APIError as e:
        logger.error("API error (%s): %s", getattr(e, "status_code", "unknown"), e)
        print(f"API error: {e}")
        return None, None

    except Exception as e:
        logger.error("Unexpected error (%s): %s", type(e).__name__, e)
        print(f"Unexpected error: {e}")
        return None, None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    sample_messages = [
        {"role": "system", "content": "You are a concise assistant."},
        {"role": "user", "content": "Say hello in one sentence."},
    ]

    print("=== StoryVault LLM Completion Call (Module 3.12) ===")
    response_text, usage = generate_chat_completion(sample_messages)

    if response_text:
        print("\n[Generated Response]:")
        print(response_text)
        if usage:
            print(f"\n[Usage]: {usage}")
    else:
        print("\n[Notice]: Completion was not returned due to missing/invalid API credentials or network configuration.")
        print("Ensure OPENAI_API_KEY is configured in your .env file.")
