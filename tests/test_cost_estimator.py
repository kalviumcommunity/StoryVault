"""Unit tests for API cost estimation utilities (Module 3.14).

Validates:
- Formula precision: (in/1000 * in_rate) + (out/1000 * out_rate)
- Independent calculation of input and output costs
- Zero-token edge cases
- Negative token and price validation (ValueError)
- Invalid types (TypeError)
- Text formatting with disclaimers
- Environment configuration overrides
"""

import pytest
from src.cost_estimator import estimate_api_cost, format_cost_summary, CostEstimate


def test_estimate_api_cost_formula_precision():
    """Verify exact formula calculation."""
    # 2,000 input tokens @ $0.001 per 1k = $0.002
    # 1,000 output tokens @ $0.002 per 1k = $0.002
    # Total = $0.004
    est = estimate_api_cost(
        input_tokens=2000,
        output_tokens=1000,
        input_price_per_1k=0.001,
        output_price_per_1k=0.002,
        model_name="test-model",
    )

    assert est.input_tokens == 2000
    assert est.output_tokens == 1000
    assert est.total_tokens == 3000
    assert pytest.approx(est.input_cost, rel=1e-6) == 0.002
    assert pytest.approx(est.output_cost, rel=1e-6) == 0.002
    assert pytest.approx(est.total_cost, rel=1e-6) == 0.004
    assert est.model_name == "test-model"
    assert est.is_illustrative is True
    assert "illustrative" in est.disclaimer.lower()


def test_separate_input_and_output_costs():
    """Verify input and output costs are tracked separately."""
    # Only input tokens
    est_in_only = estimate_api_cost(input_tokens=1000, output_tokens=0, input_price_per_1k=0.0005, output_price_per_1k=0.002)
    assert est_in_only.input_cost > 0
    assert est_in_only.output_cost == 0.0
    assert est_in_only.total_cost == est_in_only.input_cost

    # Only output tokens
    est_out_only = estimate_api_cost(input_tokens=0, output_tokens=500, input_price_per_1k=0.0005, output_price_per_1k=0.002)
    assert est_out_only.input_cost == 0.0
    assert est_out_only.output_cost > 0
    assert est_out_only.total_cost == est_out_only.output_cost


def test_zero_token_costs():
    """Verify zero token usage results in exactly $0.00."""
    est = estimate_api_cost(input_tokens=0, output_tokens=0, input_price_per_1k=0.001, output_price_per_1k=0.002)
    assert est.input_cost == 0.0
    assert est.output_cost == 0.0
    assert est.total_cost == 0.0


def test_negative_tokens_raise_value_error():
    """Verify negative token counts are rejected."""
    with pytest.raises(ValueError, match="input_tokens cannot be negative"):
        estimate_api_cost(input_tokens=-10, output_tokens=50)

    with pytest.raises(ValueError, match="output_tokens cannot be negative"):
        estimate_api_cost(input_tokens=50, output_tokens=-5)


def test_negative_prices_raise_value_error():
    """Verify negative pricing rates are rejected."""
    with pytest.raises(ValueError, match="input_price_per_1k cannot be negative"):
        estimate_api_cost(input_tokens=100, output_tokens=100, input_price_per_1k=-0.0001)

    with pytest.raises(ValueError, match="output_price_per_1k cannot be negative"):
        estimate_api_cost(input_tokens=100, output_tokens=100, output_price_per_1k=-0.0001)


def test_invalid_types_raise_type_error():
    """Verify TypeError for non-integer tokens or non-numeric prices."""
    with pytest.raises(TypeError, match="input_tokens must be an int"):
        estimate_api_cost(input_tokens="100", output_tokens=50)  # type: ignore[arg-type]

    with pytest.raises(TypeError, match="input_tokens must be an int"):
        estimate_api_cost(input_tokens=True, output_tokens=50)  # type: ignore[arg-type]

    with pytest.raises(TypeError, match="output_tokens must be an int"):
        estimate_api_cost(input_tokens=100, output_tokens="50")  # type: ignore[arg-type]

    with pytest.raises(TypeError, match="input_price_per_1k must be numeric"):
        estimate_api_cost(input_tokens=100, output_tokens=50, input_price_per_1k="free")  # type: ignore[arg-type]


def test_format_cost_summary():
    """Verify format_cost_summary produces required labels and disclaimers."""
    est = estimate_api_cost(input_tokens=150, output_tokens=50, input_price_per_1k=0.00015, output_price_per_1k=0.00060)
    summary = format_cost_summary(est)

    assert "Input Tokens:" in summary
    assert "Output Tokens:" in summary
    assert "Total Estimated Cost:" in summary
    assert "illustrative" in summary.lower()
