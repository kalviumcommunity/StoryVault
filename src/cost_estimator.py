"""API cost estimation utilities for StoryVault LLM operations.

Kalvium Module 3.14: Tokens, Tokenization & Cost Estimation.
Calculates separate input and output token costs using configurable per-1k rates,
enforcing input validation, clear disclaimers, and distinguishing estimates from billed costs.
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
from src.config import load_environment

# Standard disclaimer explaining estimate limitations
ESTIMATE_DISCLAIMER = (
    "Cost estimates are illustrative calculations based solely on configured per-1,000 "
    "token rates. Estimates exclude provider-specific taxes, minimum monthly commitments, "
    "prompt-caching discounts, batch processing rates, fine-tuning infrastructure fees, or "
    "network transfer fees. Actual billed costs may differ based on provider tier and billing policies."
)


@dataclass(frozen=True)
class CostEstimate:
    """Structured representation of an LLM cost estimate."""

    model_name: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    input_price_per_1k: float
    output_price_per_1k: float
    input_cost: float
    output_cost: float
    total_cost: float
    is_illustrative: bool
    disclaimer: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert estimate to a serializable dictionary."""
        return asdict(self)


def estimate_api_cost(
    input_tokens: int,
    output_tokens: int,
    input_price_per_1k: Optional[float] = None,
    output_price_per_1k: Optional[float] = None,
    model_name: Optional[str] = None,
) -> CostEstimate:
    """Calculate input, output, and total estimated costs for token usage.

    Formula:
        input_cost = (input_tokens / 1000) * input_price_per_1k
        output_cost = (output_tokens / 1000) * output_price_per_1k
        total_cost = input_cost + output_cost

    Args:
        input_tokens: Number of prompt/context tokens.
        output_tokens: Number of generated completion tokens.
        input_price_per_1k: Optional USD price per 1,000 input tokens.
                            Defaults to config INPUT_PRICE_PER_1K.
        output_price_per_1k: Optional USD price per 1,000 output tokens.
                             Defaults to config OUTPUT_PRICE_PER_1K.
        model_name: Optional model identifier string.

    Returns:
        CostEstimate: Detailed cost breakdown with disclaimers.

    Raises:
        TypeError: If token counts are not integers or prices are not numbers.
        ValueError: If token counts or pricing rates are negative.
    """
    env = load_environment()

    # Resolve model name
    resolved_model = model_name or env.get("CHAT_MODEL", "gpt-4o-mini")

    # Resolve pricing rates
    if input_price_per_1k is None:
        input_price_per_1k = float(env.get("INPUT_PRICE_PER_1K", 0.00015))
    if output_price_per_1k is None:
        output_price_per_1k = float(env.get("OUTPUT_PRICE_PER_1K", 0.00060))

    # Type validation
    if not isinstance(input_tokens, int) or isinstance(input_tokens, bool):
        raise TypeError(f"input_tokens must be an int, got {type(input_tokens).__name__}.")
    if not isinstance(output_tokens, int) or isinstance(output_tokens, bool):
        raise TypeError(f"output_tokens must be an int, got {type(output_tokens).__name__}.")
    if not isinstance(input_price_per_1k, (int, float)):
        raise TypeError(f"input_price_per_1k must be numeric, got {type(input_price_per_1k).__name__}.")
    if not isinstance(output_price_per_1k, (int, float)):
        raise TypeError(f"output_price_per_1k must be numeric, got {type(output_price_per_1k).__name__}.")

    # Range / value validation
    if input_tokens < 0:
        raise ValueError(f"input_tokens cannot be negative, got {input_tokens}.")
    if output_tokens < 0:
        raise ValueError(f"output_tokens cannot be negative, got {output_tokens}.")
    if input_price_per_1k < 0:
        raise ValueError(f"input_price_per_1k cannot be negative, got {input_price_per_1k}.")
    if output_price_per_1k < 0:
        raise ValueError(f"output_price_per_1k cannot be negative, got {output_price_per_1k}.")

    # Compute costs
    input_cost = (input_tokens / 1000.0) * float(input_price_per_1k)
    output_cost = (output_tokens / 1000.0) * float(output_price_per_1k)
    total_cost = input_cost + output_cost

    return CostEstimate(
        model_name=resolved_model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=input_tokens + output_tokens,
        input_price_per_1k=float(input_price_per_1k),
        output_price_per_1k=float(output_price_per_1k),
        input_cost=round(input_cost, 7),
        output_cost=round(output_cost, 7),
        total_cost=round(total_cost, 7),
        is_illustrative=True,
        disclaimer=ESTIMATE_DISCLAIMER,
    )


def format_cost_summary(estimate: CostEstimate) -> str:
    """Format cost estimate into human-readable console text.

    Args:
        estimate: CostEstimate dataclass instance.

    Returns:
        str: Multi-line formatted summary.
    """
    lines = [
        f"--- Cost Estimate Breakdown: {estimate.model_name} ---",
        f"  Input Tokens:        {estimate.input_tokens:,} tokens @ ${estimate.input_price_per_1k:.5f}/1k -> ${estimate.input_cost:.6f}",
        f"  Output Tokens:       {estimate.output_tokens:,} tokens @ ${estimate.output_price_per_1k:.5f}/1k -> ${estimate.output_cost:.6f}",
        f"  Total Tokens:        {estimate.total_tokens:,} tokens",
        f"  Total Estimated Cost: ${estimate.total_cost:.6f} USD",
        f"  Note: {estimate.disclaimer}",
    ]
    return "\n".join(lines)
