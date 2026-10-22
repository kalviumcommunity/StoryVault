"""Prompt templates, system roles, and message builders for StoryVault.

Kalvium Module 3.13: Prompt Construction and System/User Message Roles.
Defines role-separated system and user message structures for a staff-facing
Q&A assistant, with grounded scope, strict constraints, and explicit fallbacks.
"""

from typing import List, Dict, Optional

# ==============================================================================
# Reusable System Prompts (Task 2)
# ==============================================================================

STAFF_ASSISTANT_SYSTEM_PROMPT = """You are a concise, factual staff support assistant for StoryVault.

Your operating rules are:
1. Role: Act as a professional, helpful, and factual staff support assistant.
2. Scope: Answer questions using only the information explicitly provided in the supplied context.
3. Constraints: Do not invent policies, dates, figures, procedures, or facts under any circumstances.
4. Fallback: If the context does not contain the answer, explicitly say: "I don't know from the provided context."
5. Tone & Format: Keep responses concise, objective, and strictly adhere to any specified length limits."""

UNCONSTRAINED_SYSTEM_PROMPT = """You are a helpful assistant."""

# Standard Fallback String
DEFAULT_FALLBACK_PHRASE = "I don't know from the provided context."

# Controlled Benchmark Data (Task 3)
CONTROLLED_CONTEXT = "The standard refund window is 14 days after purchase."
CONTROLLED_QUESTION = "What is our refund window?"


# ==============================================================================
# Prompt Builders (Tasks 1 & 3)
# ==============================================================================

def validate_message_roles(messages: List[Dict[str, str]]) -> bool:
    """Validate that messages list properly separates system and user roles.

    Args:
        messages: List of message dictionaries.

    Returns:
        bool: True if structure has distinct system and user messages.
    """
    if not isinstance(messages, list) or len(messages) < 2:
        return False

    roles = [msg.get("role") for msg in messages if isinstance(msg, dict)]
    has_system = roles[0] == "system" and bool(messages[0].get("content", "").strip())
    has_user = any(r == "user" for r in roles[1:]) and all(
        bool(msg.get("content", "").strip()) for msg in messages if msg.get("role") == "user"
    )

    return has_system and has_user


def build_prompt_a(
    context: str = CONTROLLED_CONTEXT,
    query: str = "Explain our refund policy.",
) -> List[Dict[str, str]]:
    """Build Prompt A (Ambiguous baseline).

    Characterized by:
    - Loose system prompt without grounding rules or anti-hallucination guardrails.
    - Open-ended user query without length, source, or unit constraints.

    Args:
        context: The source reference text.
        query: Ambiguous query request.

    Returns:
        List[Dict[str, str]]: Role-separated messages for Prompt A.
    """
    user_content = f"Context:\n{context}\n\nRequest:\n{query}"
    return [
        {"role": "system", "content": UNCONSTRAINED_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def build_prompt_b(
    context: str = CONTROLLED_CONTEXT,
    question: str = CONTROLLED_QUESTION,
    fallback_phrase: str = DEFAULT_FALLBACK_PHRASE,
) -> List[Dict[str, str]]:
    """Build Prompt B (Specific and constrained).

    Characterized by:
    - Dedicated staff assistant system role with scope, grounding, and fallback rules.
    - Constrained user message specifying permitted source, exact task, unit in days,
      single sentence length, and mandatory fallback behavior.

    Args:
        context: The source reference text.
        question: Specific question to answer.
        fallback_phrase: Verbatim sentence required if context is insufficient.

    Returns:
        List[Dict[str, str]]: Role-separated messages for Prompt B.
    """
    user_content = (
        f"Context:\n{context}\n\n"
        f"Question:\n{question}\n\n"
        "Instructions:\n"
        "Using only the provided context, answer the question in one sentence. "
        "State the refund window in days. "
        f"If the context does not contain the answer, say: '{fallback_phrase}' "
        "Do not invent information."
    )
    return [
        {"role": "system", "content": STAFF_ASSISTANT_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def build_staff_qa_messages(
    context: str,
    question: str,
    system_prompt: str = STAFF_ASSISTANT_SYSTEM_PROMPT,
    length_limit: Optional[str] = "one sentence",
    fallback_phrase: str = DEFAULT_FALLBACK_PHRASE,
) -> List[Dict[str, str]]:
    """Generic builder for staff Q&A prompts with role separation and grounding.

    Args:
        context: Information context supplied for answering.
        question: Staff user inquiry.
        system_prompt: Reusable system prompt (defaults to staff assistant).
        length_limit: Optional length constraint description.
        fallback_phrase: Fallback string when answer is not in context.

    Returns:
        List[Dict[str, str]]: System and user message payload.
    """
    constraints = [
        "Using only the provided context, answer the question.",
        f"If the context does not contain the answer, say: '{fallback_phrase}'",
        "Do not invent information or extrapolate beyond the text.",
    ]
    if length_limit:
        constraints.append(f"Keep your response to {length_limit}.")

    instructions_block = " ".join(constraints)
    user_content = (
        f"Context:\n{context}\n\n"
        f"Question:\n{question}\n\n"
        f"Instructions:\n{instructions_block}"
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]
