"""Tokenizer and token-counting utilities for StoryVault.

Kalvium Module 3.14: Tokens, Tokenization & Cost Estimation.
Implements token counting and subword analysis using tiktoken (cl100k_base),
handling empty strings, Unicode characters, and multi-lingual text safely.
"""

import os
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional
import tiktoken
from src.config import BASE_DIR, load_environment

# Ensure tiktoken uses local offline cache directory if available
_PROJECT_CACHE = BASE_DIR / ".cache" / "tiktoken"
_TEMP_CACHE = Path(tempfile.gettempdir()) / "data-gym-cache"
if "TIKTOKEN_CACHE_DIR" not in os.environ and "DATA_GYM_CACHE_DIR" not in os.environ:
    if _PROJECT_CACHE.is_dir():
        os.environ["TIKTOKEN_CACHE_DIR"] = str(_PROJECT_CACHE)
    elif _TEMP_CACHE.is_dir():
        os.environ["TIKTOKEN_CACHE_DIR"] = str(_TEMP_CACHE)

# Cache for loaded tiktoken encodings to avoid repeated lookups
_ENCODING_CACHE: Dict[str, tiktoken.Encoding] = {}


def get_tokenizer(encoding_name: Optional[str] = None) -> tiktoken.Encoding:
    """Retrieve or cache a tiktoken Encoding instance.

    Args:
        encoding_name: Name of encoding (e.g., 'cl100k_base', 'o200k_base').
                       Defaults to TOKEN_ENCODING_NAME from config ('cl100k_base').

    Returns:
        tiktoken.Encoding: Cached or newly loaded tokenizer encoding.

    Raises:
        ValueError: If the requested encoding name is invalid or unsupported.
    """
    if encoding_name is None:
        env = load_environment()
        encoding_name = env.get("TOKEN_ENCODING_NAME", "cl100k_base")

    if not isinstance(encoding_name, str) or not encoding_name.strip():
        raise ValueError("Encoding name must be a non-empty string.")

    cleaned_name = encoding_name.strip()
    if cleaned_name not in _ENCODING_CACHE:
        try:
            _ENCODING_CACHE[cleaned_name] = tiktoken.get_encoding(cleaned_name)
        except Exception as e:
            raise ValueError(f"Failed to load tokenizer encoding '{cleaned_name}': {e}") from e

    return _ENCODING_CACHE[cleaned_name]


def count_tokens(text: str, encoding_name: Optional[str] = None) -> int:
    """Count the exact number of tokens in a string using tiktoken.

    Args:
        text: Input string to tokenize.
        encoding_name: Optional tokenizer encoding name (defaults to 'cl100k_base').

    Returns:
        int: Number of tokens (returns 0 for empty strings).

    Raises:
        TypeError: If input text is not a string.
    """
    if not isinstance(text, str):
        raise TypeError(f"Expected str input for token counting, got {type(text).__name__}.")

    if not text:
        return 0

    tokenizer = get_tokenizer(encoding_name)
    tokens = tokenizer.encode(text)
    return len(tokens)


def tokenize_text(text: str, encoding_name: Optional[str] = None) -> List[int]:
    """Encode input text into its integer token ID sequence.

    Args:
        text: Input string.
        encoding_name: Optional tokenizer encoding name.

    Returns:
        List[int]: List of token IDs.
    """
    if not isinstance(text, str):
        raise TypeError(f"Expected str input, got {type(text).__name__}.")

    if not text:
        return []

    tokenizer = get_tokenizer(encoding_name)
    return tokenizer.encode(text)


def decode_tokens(tokens: List[int], encoding_name: Optional[str] = None) -> str:
    """Decode an integer token ID sequence back into text.

    Args:
        tokens: List of token IDs.
        encoding_name: Optional tokenizer encoding name.

    Returns:
        str: Decoded string.
    """
    if not isinstance(tokens, list):
        raise TypeError(f"Expected list of token IDs, got {type(tokens).__name__}.")

    if not tokens:
        return ""

    tokenizer = get_tokenizer(encoding_name)
    return tokenizer.decode(tokens)


def analyze_text_tokens(
    text: str,
    sample_name: str = "Sample",
    encoding_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Calculate character, word, token metrics, and ratios for a text sample.

    Args:
        text: Input text sample.
        sample_name: Descriptive name or label for the sample.
        encoding_name: Tokenizer encoding name.

    Returns:
        Dict[str, Any]: Dictionary of calculated metrics.
    """
    if not isinstance(text, str):
        raise TypeError(f"Expected str input, got {type(text).__name__}.")

    char_count = len(text)
    word_count = len(text.split())
    token_count = count_tokens(text, encoding_name=encoding_name)

    chars_per_token = round(char_count / token_count, 3) if token_count > 0 else 0.0
    tokens_per_word = round(token_count / word_count, 3) if word_count > 0 else 0.0

    preview = (text[:60] + "...") if len(text) > 63 else text

    return {
        "sample_name": sample_name,
        "char_count": char_count,
        "word_count": word_count,
        "token_count": token_count,
        "chars_per_token": chars_per_token,
        "tokens_per_word": tokens_per_word,
        "preview": preview,
    }
