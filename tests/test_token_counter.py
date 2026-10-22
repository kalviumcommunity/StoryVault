"""Unit tests for token counter utilities (Module 3.14).

Validates:
- Empty and non-empty strings
- Unicode, emoji, and non-Latin character handling
- Three distinct sample lengths
- Subword vs word count divergence
- Round-trip tokenization and decoding
- Type and value error validation
- Offline execution without API keys
"""

import os
from unittest.mock import patch
import pytest
from src.token_counter import (
    count_tokens,
    tokenize_text,
    decode_tokens,
    analyze_text_tokens,
    get_tokenizer,
)


def test_count_tokens_empty_string():
    """Verify that empty strings produce 0 tokens."""
    assert count_tokens("") == 0
    assert tokenize_text("") == []
    assert decode_tokens([]) == ""


def test_count_tokens_non_empty_strings():
    """Verify token counts on standard English sentences."""
    text = "Hello, world!"
    tokens = count_tokens(text)
    assert tokens > 0
    assert tokens == 4  # ['Hello', ',', ' world', '!'] in cl100k_base


def test_count_tokens_unicode_and_multilingual():
    """Verify safe handling of Unicode, emojis, and non-Latin scripts."""
    emoji_text = "✨ StoryVault 📚"
    hindi_text = "नमस्ते दुनिया"
    japanese_text = "こんにちは世界"

    assert count_tokens(emoji_text) > 0
    assert count_tokens(hindi_text) > 0
    assert count_tokens(japanese_text) > 0


def test_token_encode_decode_roundtrip():
    """Verify that encode followed by decode restores the original text."""
    sample = "The Whispering Vault preserves 4,000 ancient manuscripts."
    token_ids = tokenize_text(sample)
    assert isinstance(token_ids, list)
    assert all(isinstance(t, int) for t in token_ids)
    restored = decode_tokens(token_ids)
    assert restored == sample


def test_three_distinct_sample_lengths():
    """Verify metrics across short, medium, and long text samples."""
    short_q = "What is our refund window?"
    paragraph = (
        "StoryVault is an AI-powered story knowledge exploration, archiving, and "
        "retrieval-augmented generation platform engineered for enterprise corpora."
    )
    long_doc = (paragraph + " ") * 6

    analysis_short = analyze_text_tokens(short_q, sample_name="Short")
    analysis_paragraph = analyze_text_tokens(paragraph, sample_name="Paragraph")
    analysis_long = analyze_text_tokens(long_doc, sample_name="Long")

    # Strict monotonic growth in character and token counts
    assert analysis_short["char_count"] < analysis_paragraph["char_count"] < analysis_long["char_count"]
    assert analysis_short["token_count"] < analysis_paragraph["token_count"] < analysis_long["token_count"]

    assert analysis_short["token_count"] > 0
    assert analysis_paragraph["token_count"] > 0
    assert analysis_long["token_count"] > 0


def test_word_count_vs_token_count_divergence():
    """Verify that token count does not equal word count for complex terms."""
    # Complex/technical words split into multiple subwords
    text = "Aethelgardian cryptozoologist"
    words = len(text.split())
    tokens = count_tokens(text)
    assert words == 2
    assert tokens > 2  # Subwords split into > 2 tokens


def test_count_tokens_type_error():
    """Verify TypeError when non-string input is provided."""
    with pytest.raises(TypeError, match="Expected str"):
        count_tokens(None)  # type: ignore[arg-type]

    with pytest.raises(TypeError, match="Expected str"):
        count_tokens(12345)  # type: ignore[arg-type]

    with pytest.raises(TypeError, match="Expected str"):
        analyze_text_tokens(["not", "a", "string"])  # type: ignore[arg-type]


def test_get_tokenizer_invalid_encoding():
    """Verify ValueError when an invalid encoding name is specified."""
    with pytest.raises(ValueError, match="Failed to load tokenizer encoding"):
        get_tokenizer("invalid_non_existent_encoding_xyz")

    with pytest.raises(ValueError, match="non-empty string"):
        get_tokenizer("")


def test_offline_token_counting_without_api_keys():
    """Verify token counting works offline with zero API credentials."""
    with patch.dict(os.environ, {"OPENAI_API_KEY": "", "ANTHROPIC_API_KEY": "", "GEMINI_API_KEY": ""}, clear=False):
        # Must execute without network calls or credential checks
        count = count_tokens("StoryVault offline token verification.")
        assert count > 0
