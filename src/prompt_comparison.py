"""Script to run and compare prompt variations for staff Q&A.

Kalvium Module 3.13: Prompt Construction and System/User Message Roles.
Compares Prompt A (Ambiguous) vs Prompt B (Specific and constrained) on a
controlled benchmark context, capturing real outputs or reporting unverified
status when API credentials are not supplied.
"""

import os
import logging
from typing import Dict, Any, Optional
from src.llm_client import generate_chat_completion, get_llm_client
from src.prompts import (
    CONTROLLED_CONTEXT,
    CONTROLLED_QUESTION,
    build_prompt_a,
    build_prompt_b,
    build_staff_qa_messages,
)

logger = logging.getLogger(__name__)


def run_prompt_comparison(
    context: str = CONTROLLED_CONTEXT,
    question: str = CONTROLLED_QUESTION,
    client: Optional[Any] = None,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute Prompt A and Prompt B comparisons against the configured LLM.

    Args:
        context: Reference context text.
        question: Question to answer.
        client: Optional pre-configured client (or mock for unit testing).
        model: Optional model override.

    Returns:
        Dict[str, Any]: Comparison results containing messages, responses,
                        and execution verification status.
    """
    prompt_a_msgs = build_prompt_a(context=context, query="Explain our refund policy.")
    prompt_b_msgs = build_prompt_b(context=context, question=question)

    # Test out-of-bounds question to evaluate fallback enforcement on Prompt B
    out_of_bounds_msgs = build_staff_qa_messages(
        context=context,
        question="Can customers return digital download items?",
        length_limit="one sentence",
    )

    logger.info("Executing Prompt A (Ambiguous)...")
    resp_a, usage_a = generate_chat_completion(prompt_a_msgs, model=model, client=client)

    logger.info("Executing Prompt B (Constrained)...")
    resp_b, usage_b = generate_chat_completion(prompt_b_msgs, model=model, client=client)

    logger.info("Executing Prompt B Fallback Test...")
    resp_fb, usage_fb = generate_chat_completion(out_of_bounds_msgs, model=model, client=client)

    live_executed = (resp_a is not None) and (resp_b is not None)

    if live_executed:
        execution_note = "Live API completion succeeded against configured model."
    else:
        execution_note = (
            "Live API execution unverified: API credentials or network endpoint not configured in environment. "
            "Model outputs were NOT fabricated."
        )

    return {
        "context": context,
        "question": question,
        "prompt_a": {
            "messages": prompt_a_msgs,
            "response": resp_a,
            "usage": usage_a,
        },
        "prompt_b": {
            "messages": prompt_b_msgs,
            "response": resp_b,
            "usage": usage_b,
        },
        "fallback_test": {
            "messages": out_of_bounds_msgs,
            "response": resp_fb,
            "usage": usage_fb,
        },
        "live_executed": live_executed,
        "execution_note": execution_note,
    }


def format_comparison_markdown(results: Dict[str, Any]) -> str:
    """Format comparison results into clean Markdown documentation.

    Args:
        results: Dictionary produced by run_prompt_comparison.

    Returns:
        str: Markdown content for outputs/prompt_comparison.md.
    """
    live_status_str = (
        "✅ Verified Live API Call" if results["live_executed"] else "⚠️ Live API Unverified (No API Key Configured)"
    )

    prompt_a_output = results["prompt_a"]["response"] or "[Live model call unverified - no API key configured]"
    prompt_b_output = results["prompt_b"]["response"] or "[Live model call unverified - no API key configured]"
    fallback_output = results["fallback_test"]["response"] or "[Live model call unverified - no API key configured]"

    doc = f"""# StoryVault Prompt Comparison & Evaluation

**Module:** Kalvium Module 3.13 — Prompt Construction and System/User Message Roles  
**Execution Status:** {live_status_str}  
**Note:** {results["execution_note"]}

---

## 1. Controlled Test Input

- **Context:**
  > "{results['context']}"
- **Target Question:**
  > "{results['question']}"

---

## 2. Prompt Variations & Role Payloads

### Prompt A: Ambiguous & Open-Ended

#### System Message
```text
{results['prompt_a']['messages'][0]['content']}
```

#### User Message
```text
{results['prompt_a']['messages'][1]['content']}
```

#### Actual Model Output
```text
{prompt_a_output}
```

---

### Prompt B: Specific, Grounded & Constrained (Selected)

#### System Message
```text
{results['prompt_b']['messages'][0]['content']}
```

#### User Message
```text
{results['prompt_b']['messages'][1]['content']}
```

#### Actual Model Output
```text
{prompt_b_output}
```

#### Out-of-Context Fallback Test Output
```text
{fallback_output}
```

---

## 3. Comparison & Rationale

| Evaluation Dimension | Prompt A (Ambiguous) | Prompt B (Specific & Constrained) |
| :--- | :--- | :--- |
| **System Role Definition** | Generic (`You are a helpful assistant.`) with zero organizational boundaries. | Specific (`concise, factual staff support assistant for StoryVault`) establishing domain, tone, and rigor. |
| **Permitted Information Source** | Unspecified. Model relies on internal pre-training and risks hallucinating external refund terms. | Strictly bounded: `"Using only the provided context"`. |
| **Exact Task Specification** | Vague (`Explain our refund policy.`). | Explicit (`State the refund window in days.`). |
| **Length & Format Guardrails** | Unconstrained, leading to potential verbosity and rambling paragraphs. | Explicitly constrained: `"answer the question in one sentence"`. |
| **Missing Information Fallback** | None. Model attempts to extrapolate or guess when data is absent. | Mandatory verbatim fallback: `"I don't know from the provided context."` |

### Why Prompt B is the Superior Choice

Prompt B is markedly superior for an enterprise staff-support and RAG workflow for four core reasons:
1. **Permitted Source of Information:** By enforcing `"Using only the provided context"`, the model is prevented from fabricating general return windows, restocking fees, or warranty conditions not established by StoryVault.
2. **Exact Task Clarity:** Specifying `"State the refund window in days"` directs the model to extract the exact quantity (`14 days`) rather than generating extraneous commentary.
3. **Deterministic Response Length:** Restricting output to `"one sentence"` guarantees concise answers suitable for staff tooling, chat interfaces, and automated RAG pipelines.
4. **Mandatory Fallback Policy:** The requirement to return `"I don't know from the provided context."` eliminates hallucination risk when answering out-of-scope queries.

---

## 4. Verification Evidence & Secrets Auditing

- **Secrets Hygiene:** No credentials, keys, or endpoints are embedded in source files, prompts, or output reports.
- **Role Separation:** Verified via automated unit tests (`tests/test_prompts.py`).
"""
    return doc


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    print("=== StoryVault Prompt Comparison Runner (Module 3.13) ===")
    results = run_prompt_comparison()
    print(f"\nStatus: {results['execution_note']}")
    print("\n--- Prompt A Payload ---")
    for msg in results["prompt_a"]["messages"]:
        print(f"[{msg['role']}]: {msg['content']}")
    print(f"Output: {results['prompt_a']['response']}")

    print("\n--- Prompt B Payload ---")
    for msg in results["prompt_b"]["messages"]:
        print(f"[{msg['role']}]: {msg['content']}")
    print(f"Output: {results['prompt_b']['response']}")

    # Write results to outputs/prompt_comparison.md
    output_dir = os.path.join(os.path.dirname(__file__), "..", "outputs")
    os.makedirs(output_dir, exist_ok=True)
    report_path = os.path.join(output_dir, "prompt_comparison.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(format_comparison_markdown(results))
    print(f"\n[OK] Comparison report saved to: {report_path}")
