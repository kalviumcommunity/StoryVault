"""Unit tests for prompt construction, role separation, and comparison runners.

Kalvium Module 3.13: Prompt Construction and System/User Message Roles.
Validates:
- Strict role separation (system vs user)
- System prompt governance (role, scope, constraints, fallback, tone/format)
- Comparison behavior between Prompt A and Prompt B
- Fallback enforcement on out-of-context queries
- Safe handling when live API credentials are not configured
"""

from unittest.mock import MagicMock
import pytest
from src.prompts import (
    STAFF_ASSISTANT_SYSTEM_PROMPT,
    UNCONSTRAINED_SYSTEM_PROMPT,
    DEFAULT_FALLBACK_PHRASE,
    CONTROLLED_CONTEXT,
    CONTROLLED_QUESTION,
    validate_message_roles,
    build_prompt_a,
    build_prompt_b,
    build_staff_qa_messages,
)
from src.prompt_comparison import run_prompt_comparison, format_comparison_markdown


# ==============================================================================
# Task 1 & 2: System Role & Governance Tests
# ==============================================================================

def test_system_prompt_governance_rules():
    """Verify system prompt contains all required enterprise constraints."""
    prompt = STAFF_ASSISTANT_SYSTEM_PROMPT.lower()

    # 1. Role
    assert "staff support assistant" in prompt, "System prompt must define staff assistant role"
    # 2. Scope
    assert "only the information" in prompt or "supplied context" in prompt, "System prompt must constrain scope"
    # 3. Constraints (anti-hallucination)
    assert "do not invent" in prompt, "System prompt must prohibit inventing facts"
    # 4. Fallback
    assert DEFAULT_FALLBACK_PHRASE.lower() in prompt, "System prompt must specify fallback phrase"
    # 5. Tone & Format
    assert "concise" in prompt, "System prompt must enforce concise tone"


def test_validate_message_roles():
    """Verify message structure role validator."""
    valid_msgs = [
        {"role": "system", "content": "System instructions."},
        {"role": "user", "content": "User question."},
    ]
    assert validate_message_roles(valid_msgs) is True

    # Missing system role
    assert validate_message_roles([{"role": "user", "content": "Question"}]) is False

    # Missing user role
    assert validate_message_roles([{"role": "system", "content": "Rules"}]) is False

    # Empty content
    assert validate_message_roles([
        {"role": "system", "content": ""},
        {"role": "user", "content": "Hi"}
    ]) is False


# ==============================================================================
# Task 3: Prompt Variations & Comparison Tests
# ==============================================================================

def test_prompt_a_structure():
    """Verify Prompt A is ambiguous, unconstrained, yet role-separated."""
    msgs = build_prompt_a(context=CONTROLLED_CONTEXT, query="Explain our refund policy.")
    assert validate_message_roles(msgs) is True
    assert msgs[0]["role"] == "system"
    assert msgs[0]["content"] == UNCONSTRAINED_SYSTEM_PROMPT
    assert msgs[1]["role"] == "user"
    assert CONTROLLED_CONTEXT in msgs[1]["content"]
    assert "Explain our refund policy." in msgs[1]["content"]

    # Prompt A lacks strict boundary instructions
    assert DEFAULT_FALLBACK_PHRASE not in msgs[1]["content"]
    assert "one sentence" not in msgs[1]["content"]


def test_prompt_b_structure():
    """Verify Prompt B includes strict context bounds, length constraints, and fallback."""
    msgs = build_prompt_b(
        context=CONTROLLED_CONTEXT,
        question=CONTROLLED_QUESTION,
        fallback_phrase=DEFAULT_FALLBACK_PHRASE,
    )
    assert validate_message_roles(msgs) is True
    assert msgs[0]["role"] == "system"
    assert msgs[0]["content"] == STAFF_ASSISTANT_SYSTEM_PROMPT

    user_text = msgs[1]["content"]
    assert CONTROLLED_CONTEXT in user_text
    assert CONTROLLED_QUESTION in user_text
    assert "one sentence" in user_text
    assert "in days" in user_text
    assert DEFAULT_FALLBACK_PHRASE in user_text
    assert "Do not invent information" in user_text


def test_both_prompts_share_identical_context():
    """Ensure fair benchmarking: both variants reference identical source context."""
    msgs_a = build_prompt_a(context=CONTROLLED_CONTEXT)
    msgs_b = build_prompt_b(context=CONTROLLED_CONTEXT)

    assert CONTROLLED_CONTEXT in msgs_a[1]["content"]
    assert CONTROLLED_CONTEXT in msgs_b[1]["content"]


def test_generic_staff_qa_builder():
    """Verify custom context and query building."""
    custom_context = "StoryVault stores metadata in JSON format."
    custom_q = "What format is used for metadata?"
    msgs = build_staff_qa_messages(context=custom_context, question=custom_q, length_limit="10 words")

    assert validate_message_roles(msgs) is True
    assert custom_context in msgs[1]["content"]
    assert custom_q in msgs[1]["content"]
    assert "10 words" in msgs[1]["content"]


# ==============================================================================
# Comparison Runner Mock Tests
# ==============================================================================

def test_run_prompt_comparison_with_mock_client():
    """Verify run_prompt_comparison behavior when model responses succeed."""
    mock_client = MagicMock()

    resp_a = MagicMock()
    resp_a.choices = [MagicMock(message=MagicMock(content="We offer refunds within 14 days of purchase under standard terms."))]
    resp_a.usage = MagicMock(total_tokens=30)

    resp_b = MagicMock()
    resp_b.choices = [MagicMock(message=MagicMock(content="The standard refund window is 14 days."))]
    resp_b.usage = MagicMock(total_tokens=22)

    resp_fb = MagicMock()
    resp_fb.choices = [MagicMock(message=MagicMock(content="I don't know from the provided context."))]
    resp_fb.usage = MagicMock(total_tokens=20)

    mock_client.chat.completions.create.side_effect = [resp_a, resp_b, resp_fb]

    results = run_prompt_comparison(client=mock_client)

    assert results["live_executed"] is True
    assert "The standard refund window is 14 days." in results["prompt_b"]["response"]
    assert DEFAULT_FALLBACK_PHRASE in results["fallback_test"]["response"]
    assert mock_client.chat.completions.create.call_count == 3


def test_run_prompt_comparison_unverified_fallback():
    """Verify runner handles unconfigured API credentials without crashing."""
    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = Exception("No credentials available")

    results = run_prompt_comparison(client=mock_client)

    assert results["live_executed"] is False
    assert "unverified" in results["execution_note"].lower()
    assert results["prompt_a"]["response"] is None
    assert results["prompt_b"]["response"] is None


def test_format_comparison_markdown():
    """Verify markdown report generation formatting."""
    mock_results = {
        "context": CONTROLLED_CONTEXT,
        "question": CONTROLLED_QUESTION,
        "prompt_a": {
            "messages": build_prompt_a(),
            "response": "Refunds are allowed within 14 days.",
            "usage": None,
        },
        "prompt_b": {
            "messages": build_prompt_b(),
            "response": "The refund window is 14 days.",
            "usage": None,
        },
        "fallback_test": {
            "messages": build_prompt_b(question="Other question"),
            "response": DEFAULT_FALLBACK_PHRASE,
            "usage": None,
        },
        "live_executed": True,
        "execution_note": "Verified live API completion.",
    }
    md = format_comparison_markdown(mock_results)

    assert "# StoryVault Prompt Comparison & Evaluation" in md
    assert "Prompt A: Ambiguous & Open-Ended" in md
    assert "Prompt B: Specific, Grounded & Constrained" in md
    assert "Why Prompt B is the Superior Choice" in md
    assert "14 days" in md
